"""
Shelf-Life Prediction Service
─────────────────────────────
Singleton loader for the CatBoost model.  Fetches weather, builds features,
predicts remaining shelf life, and derives freshness status.
"""

import os
import pathlib
from datetime import datetime, timezone
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


def _load_artifacts():
    """Load model artifacts once (singleton)."""
    global _model, _model_columns, _base_shelf_life_map
    if _model is None:
        print("🔄 Loading shelf-life ML model …")
        _model = joblib.load(_ML_DIR / "shelf_life_model.pkl")
        _model_columns = joblib.load(_ML_DIR / "model_columns.pkl")
        _base_shelf_life_map = joblib.load(_ML_DIR / "base_shelf_life_map.pkl")
        print(f"✅ Model loaded  ({len(_model_columns)} features, {len(_base_shelf_life_map)} items)")


# ──────────────────────────────────────────────────────
# Weather
# ──────────────────────────────────────────────────────

WEATHER_DEFAULTS = {"temperature_c": 30.0, "humidity_percent": 70.0}


async def fetch_weather(lat: float, lng: float) -> dict:
    """Fetch temperature & humidity from OpenWeather.  Falls back to defaults."""
    cache_key = f"{round(lat, 2)},{round(lng, 2)}"
    now = datetime.now(timezone.utc).timestamp()

    # Check cache
    if cache_key in _weather_cache:
        entry = _weather_cache[cache_key]
        if now - entry["ts"] < WEATHER_CACHE_TTL:
            return entry["data"]

    api_key = os.getenv("OPENWEATHER_API_KEY", "")
    if not api_key:
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
            return result
    except Exception as exc:
        print(f"⚠️  Weather API error ({exc}), using defaults")
        return WEATHER_DEFAULTS.copy()


# ──────────────────────────────────────────────────────
# Prediction
# ──────────────────────────────────────────────────────

DEFAULT_BASE_SHELF_LIFE = 48  # fallback hours for unknown crops


def _derive_status(hours: float) -> str:
    if hours < 24:
        return "CRITICAL"
    elif hours < 48:
        return "URGENT"
    return "SAFE"


async def predict_shelf_life(
    item_name: str,
    storage_type: str,
    latitude: float,
    longitude: float,
    harvest_datetime: str,
) -> dict:
    """
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

    # 1. Weather
    weather = await fetch_weather(latitude, longitude)

    # 2. Hours since harvest (timezone-aware)
    try:
        harvest_dt = datetime.fromisoformat(harvest_datetime)
        if harvest_dt.tzinfo is None:
            harvest_dt = harvest_dt.replace(tzinfo=timezone.utc)
        now_utc = datetime.now(timezone.utc)
        hours_since_harvest = max(0, (now_utc - harvest_dt).total_seconds() / 3600)
    except Exception:
        hours_since_harvest = 0.0

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

    # Fix 1 & 2: Cap negative + upper-bound
    prediction = max(prediction, 0)
    prediction = min(prediction, base_shelf_life)
    
    # Hard rule: If out of ground longer than max base shelf life, it's expired
    if hours_since_harvest >= base_shelf_life:
        prediction = 0.0

    prediction = round(prediction, 1)

    status = _derive_status(prediction)

    return {
        "remaining_shelf_life_hours": prediction,
        "freshness_status": status,
        "base_shelf_life_hours": base_shelf_life,
        "weather": weather,
        "hours_since_harvest": round(hours_since_harvest, 1),
    }
