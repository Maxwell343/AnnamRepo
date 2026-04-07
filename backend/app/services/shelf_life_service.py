"""
Shelf-Life Prediction Service
─────────────────────────────
Singleton loader for the CatBoost model.  Fetches weather, builds features,
predicts remaining shelf life, and derives freshness status.

DYNAMIC COMPUTATION:
  • remaining_shelf_life_hours is computed dynamically at read time
  • Only base_shelf_life_hours and harvest_datetime are stored
  • Weather impact is applied using real-time weather data
"""

import os
import pathlib
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

import httpx
import joblib
import pandas as pd

# ── Paths ──────────────────────────────────────────────
_ML_DIR = pathlib.Path(__file__).resolve().parent.parent.parent / "ml" / "models"

# ── Singleton globals ──────────────────────────────────
_model = None
_model_columns = None
_base_shelf_life_map = None
_weather_cache: Dict[str, Any] = {}   # key = "lat,lng" → { data, ts }
WEATHER_CACHE_TTL = 900               # 15 minutes

# ── IST timezone ───────────────────────────────────────
IST = timezone(timedelta(hours=5, minutes=30))


def _load_artifacts():
    """Load model artifacts once (singleton)."""
    global _model, _model_columns, _base_shelf_life_map
    if _model is None:
        print("🔄 Loading shelf-life ML model …")
        _model = joblib.load(_ML_DIR / "shelf_life_model.pkl")
        _model_columns = joblib.load(_ML_DIR / "model_columns.pkl")
        _base_shelf_life_map = joblib.load(_ML_DIR / "base_shelf_life_map.pkl")
        print(f"✅ Model loaded  ({len(_model_columns)} features, {len(_base_shelf_life_map)} items)")


def get_base_shelf_life_map() -> dict:
    """Expose the base shelf life map for external use."""
    _load_artifacts()
    return _base_shelf_life_map


# ──────────────────────────────────────────────────────
# Weather
# ──────────────────────────────────────────────────────

WEATHER_DEFAULTS = {"temperature_c": 30.0, "humidity_percent": 70.0}


def _get_api_key() -> str:
    return os.getenv("OPENWEATHER_API_KEY", "")


async def fetch_weather(lat: float, lng: float) -> dict:
    """Async: Fetch temperature & humidity from OpenWeather. Falls back to defaults."""
    cache_key = f"{round(lat, 2)},{round(lng, 2)}"
    now = datetime.now(timezone.utc).timestamp()

    # Check cache
    if cache_key in _weather_cache:
        entry = _weather_cache[cache_key]
        if now - entry["ts"] < WEATHER_CACHE_TTL:
            return entry["data"]

    api_key = _get_api_key()
    if not api_key:
        print("⚠️  OPENWEATHER_API_KEY not set — using defaults (30°C, 70%)")
        return WEATHER_DEFAULTS.copy()

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={"lat": lat, "lon": lng, "appid": api_key, "units": "metric"},
            )
            resp.raise_for_status()
            data = resp.json()
            result = {
                "temperature_c": data["main"]["temp"],
                "humidity_percent": data["main"]["humidity"],
            }
            _weather_cache[cache_key] = {"data": result, "ts": now}
            print(f"[WEATHER] ✅ Real weather for ({lat},{lng}): {result['temperature_c']}°C, {result['humidity_percent']}%")
            return result
    except Exception as exc:
        print(f"[WEATHER] ⚠️ API error ({exc}), using defaults")
        return WEATHER_DEFAULTS.copy()


def fetch_weather_sync(lat: float, lng: float) -> dict:
    """Sync: Fetch temperature & humidity from OpenWeather with caching."""
    if lat is None or lng is None:
        return WEATHER_DEFAULTS.copy()

    cache_key = f"{round(lat, 2)},{round(lng, 2)}"
    now = datetime.now(timezone.utc).timestamp()

    # Check cache first
    if cache_key in _weather_cache:
        entry = _weather_cache[cache_key]
        if now - entry["ts"] < WEATHER_CACHE_TTL:
            return entry["data"]

    api_key = _get_api_key()
    if not api_key:
        print("⚠️  OPENWEATHER_API_KEY not set — using defaults (30°C, 70%)")
        return WEATHER_DEFAULTS.copy()

    try:
        resp = httpx.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"lat": lat, "lon": lng, "appid": api_key, "units": "metric"},
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()
        result = {
            "temperature_c": data["main"]["temp"],
            "humidity_percent": data["main"]["humidity"],
        }
        _weather_cache[cache_key] = {"data": result, "ts": now}
        print(f"[WEATHER] ✅ Real weather for ({lat},{lng}): {result['temperature_c']}°C, {result['humidity_percent']}%")
        return result
    except Exception as exc:
        print(f"[WEATHER] ⚠️ Sync API error ({exc}), using defaults")
        return WEATHER_DEFAULTS.copy()


# ──────────────────────────────────────────────────────
# Weather Decay Factor
# ──────────────────────────────────────────────────────

def compute_weather_decay_factor(temperature_c: float, humidity_percent: float) -> float:
    """
    Compute decay factor based on weather conditions.
    Baseline: 30°C, 70% → factor = 1.0
    Higher temp/humidity → lower factor (faster spoilage)
    Lower temp → higher factor (slower spoilage, e.g. cold storage)
    """
    temp_penalty = max(0, (temperature_c - 30)) * 0.015
    humidity_penalty = max(0, (humidity_percent - 70)) * 0.005
    temp_benefit = max(0, (30 - temperature_c)) * 0.008
    factor = 1.0 + temp_benefit - temp_penalty - humidity_penalty
    return max(0.3, min(1.3, factor))  # Clamp between 0.3x and 1.3x


# ──────────────────────────────────────────────────────
# Dynamic Remaining Shelf Life Computation
# ──────────────────────────────────────────────────────

DEFAULT_BASE_SHELF_LIFE = 48  # fallback hours for unknown crops


def parse_harvest_datetime(harvest_dt_str: str) -> Optional[datetime]:
    """Parse harvest datetime string, treating naive as IST."""
    if not harvest_dt_str:
        return None
    try:
        harvest_dt = datetime.fromisoformat(str(harvest_dt_str))
        if harvest_dt.tzinfo is None:
            harvest_dt = harvest_dt.replace(tzinfo=IST)
        return harvest_dt
    except Exception:
        return None


def compute_hours_since_harvest(harvest_dt_str: str) -> float:
    """Compute hours elapsed since harvest. Returns 0 on failure."""
    harvest_dt = parse_harvest_datetime(harvest_dt_str)
    if not harvest_dt:
        return 0.0
    now_utc = datetime.now(timezone.utc)
    return max(0, (now_utc - harvest_dt).total_seconds() / 3600)


def compute_remaining_shelf_life(listing: dict) -> Optional[float]:
    """
    DYNAMICALLY compute remaining shelf life from:
      remaining = base_shelf_life_hours * weather_decay_factor - hours_since_harvest

    Returns None if required fields are missing (caller should fallback).
    """
    base_hours = listing.get("base_shelf_life_hours")
    harvest_dt_str = listing.get("harvest_datetime")

    if not base_hours or not harvest_dt_str:
        return None

    # 1. Hours since harvest (dynamic)
    hours_since = compute_hours_since_harvest(harvest_dt_str)

    # 2. Get current weather (sync, cached)
    lat = listing.get("latitude")
    lng = listing.get("longitude")
    weather = fetch_weather_sync(lat, lng) if lat and lng else WEATHER_DEFAULTS.copy()

    # 3. Weather decay factor
    decay_factor = compute_weather_decay_factor(
        weather["temperature_c"], weather["humidity_percent"]
    )

    # 4. Compute remaining
    effective_shelf_life = float(base_hours) * decay_factor
    remaining = effective_shelf_life - hours_since

    result = round(max(0, remaining), 1)

    print(f"[DYNAMIC-SHELF] base={base_hours}h × decay={decay_factor:.2f} = effective={effective_shelf_life:.1f}h | harvested={hours_since:.1f}h ago | remaining={result}h | weather={weather}")

    return result


# ──────────────────────────────────────────────────────
# Freshness Status
# ──────────────────────────────────────────────────────

def _derive_status(hours: float) -> str:
    if hours < 12:
        return "CRITICAL"
    elif hours < 24:
        return "URGENT"
    return "SAFE"


# ──────────────────────────────────────────────────────
# ML Prediction (called at listing creation time)
# ──────────────────────────────────────────────────────

async def predict_shelf_life(
    item_name: str,
    storage_type: str,
    latitude: float,
    longitude: float,
    harvest_datetime: str,
) -> dict:
    """
    Run ML model at creation time. Stores base_shelf_life_hours
    and initial remaining_shelf_life_hours.

    Returns
    -------
    {
        "remaining_shelf_life_hours": float,
        "freshness_status": str,          # CRITICAL / URGENT / SAFE
        "base_shelf_life_hours": int,
        "weather": { "temperature_c": …, "humidity_percent": … },
        "hours_since_harvest": float,
    }
    """
    _load_artifacts()

    # 1. Weather — REAL data from API
    weather = await fetch_weather(latitude, longitude)

    # 2. Hours since harvest (IST-aware)
    hours_since_harvest = compute_hours_since_harvest(harvest_datetime)

    # 3. Base shelf life (from dataset mapping)
    base_shelf_life = _base_shelf_life_map.get(item_name, DEFAULT_BASE_SHELF_LIFE)

    # 4. Build feature dict
    feature_data = {
        "temperature_c": weather["temperature_c"],
        "humidity_percent": weather["humidity_percent"],
        "co2_ppm": 400,
        "light_lux": 20,
        "transport_time_hours": 5,
        "hours_since_harvest": hours_since_harvest,
        "base_shelf_life_hours": base_shelf_life,
    }

    # DEBUG: Print ML model inputs
    print(f"[ML-DEBUG] Model inputs: item={item_name}, storage={storage_type}")
    print(f"[ML-DEBUG]   weather: temp={weather['temperature_c']}°C, humidity={weather['humidity_percent']}%")
    print(f"[ML-DEBUG]   hours_since_harvest={round(hours_since_harvest, 1)}, base_shelf_life={base_shelf_life}h")

    # One-hot keys
    for known_item in _base_shelf_life_map.keys():
        col = f"item_name_{known_item}"
        feature_data[col] = 1 if known_item == item_name else 0

    for st in ["Cold Storage", "Crate Storage", "Open Storage"]:
        col = f"storage_type_{st}"
        feature_data[col] = 1 if st == storage_type else 0

    # 5. Align columns
    df = pd.DataFrame([feature_data])
    df = df.reindex(columns=_model_columns, fill_value=0)

    # 6. Predict
    prediction = float(_model.predict(df)[0])

    # Cap negative + upper-bound
    prediction = max(prediction, 0)
    prediction = min(prediction, base_shelf_life)
    
    # Hard rule: If out of ground longer than max base shelf life, it's expired
    if hours_since_harvest >= base_shelf_life:
        prediction = 0.0

    prediction = round(prediction, 1)
    status = _derive_status(prediction)

    # DEBUG: Print ML output
    print(f"[ML-DEBUG]   prediction={prediction}h, status={status}")

    return {
        "remaining_shelf_life_hours": prediction,
        "freshness_status": status,
        "base_shelf_life_hours": base_shelf_life,
        "weather": weather,
        "hours_since_harvest": round(hours_since_harvest, 1),
    }
