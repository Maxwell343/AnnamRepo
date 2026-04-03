"""
Train CatBoost model for crop shelf-life prediction.

Outputs (saved to backend/ml/models/):
  - shelf_life_model.pkl        – trained CatBoostRegressor
  - model_columns.pkl           – ordered list of feature columns after one-hot encoding
  - base_shelf_life_map.pkl     – {item_name: base_shelf_life_hours} extracted from dataset

Usage:
  cd backend
  python ml/train_model.py
"""

import os
import sys
import pathlib

import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from catboost import CatBoostRegressor

# ── Paths ──────────────────────────────────────────────
SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
DATASET_PATH = SCRIPT_DIR / "annam model 1 dataset.csv"
MODELS_DIR = SCRIPT_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)

MODEL_PATH = MODELS_DIR / "shelf_life_model.pkl"
COLUMNS_PATH = MODELS_DIR / "model_columns.pkl"
BASE_SHELF_PATH = MODELS_DIR / "base_shelf_life_map.pkl"


def main():
    # ── 1. Load dataset ────────────────────────────────
    print(f"📂 Loading dataset from {DATASET_PATH}")
    df = pd.read_csv(DATASET_PATH)
    print(f"   Shape: {df.shape}")
    print(f"   Columns: {list(df.columns)}")
    print(f"   Items: {sorted(df['item_name'].unique())}")
    print(f"   Storage types: {sorted(df['storage_type'].unique())}")

    # ── 2. Extract base_shelf_life_map from dataset ────
    base_shelf_life_map = (
        df.groupby("item_name")["base_shelf_life_hours"]
        .median()                         # median is more robust to outliers
        .round()
        .astype(int)
        .to_dict()
    )
    print(f"\n📊 Base shelf-life map (from dataset):")
    for name, hours in sorted(base_shelf_life_map.items()):
        print(f"   {name}: {hours}h")

    joblib.dump(base_shelf_life_map, BASE_SHELF_PATH)
    print(f"   ✅ Saved → {BASE_SHELF_PATH}")

    # ── 3. Prepare features ────────────────────────────
    # One-hot encode categorical columns
    df_encoded = pd.get_dummies(df, columns=["item_name", "storage_type"], drop_first=True)

    X = df_encoded.drop("remaining_shelf_life_hours", axis=1)
    y = df_encoded["remaining_shelf_life_hours"]

    model_columns = list(X.columns)
    joblib.dump(model_columns, COLUMNS_PATH)
    print(f"\n🔧 Feature columns ({len(model_columns)}):")
    for col in model_columns:
        print(f"   • {col}")
    print(f"   ✅ Saved → {COLUMNS_PATH}")

    # ── 4. Train / test split ──────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42
    )
    print(f"\n📐 Split: train={len(X_train)}, test={len(X_test)}")

    # ── 5. Train CatBoost ──────────────────────────────
    print("\n🚀 Training CatBoost model …")
    model = CatBoostRegressor(
        iterations=1000,
        learning_rate=0.05,
        depth=8,
        verbose=100,
        random_state=42,
    )
    model.fit(X_train, y_train)

    # ── 6. Evaluate ────────────────────────────────────
    preds = model.predict(X_test)
    r2 = r2_score(y_test, preds)
    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))

    print(f"\n📈 Evaluation on test set:")
    print(f"   R²:   {r2:.4f}")
    print(f"   MAE:  {mae:.2f} hours")
    print(f"   RMSE: {rmse:.2f} hours")

    # ── 7. Save model ──────────────────────────────────
    joblib.dump(model, MODEL_PATH)
    print(f"\n✅ Model saved → {MODEL_PATH}")

    print("\n🎉 Training complete!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
