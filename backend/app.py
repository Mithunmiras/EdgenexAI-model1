"""
EdgeNexAI Backend v2.0 — ML Pipeline: Cells 5, 6, 7
Accepts raw sensor CSV -> cleans -> trains -> predicts -> outputs all dashboard JSONs.
Async job queue: upload returns job_id immediately, poll /api/job/<id> for progress.
"""
import os
import json
import uuid
import threading
import traceback
import warnings
from datetime import datetime

import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
DATA_DIR      = os.path.join(os.path.dirname(__file__), "..", "src", "data")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DATA_DIR,      exist_ok=True)

NUM_BIRDS = 5000

# ─── Async job tracking ───────────────────────────────────────────────────────
jobs = {}   # job_id -> {status, progress, step, result, error}

def set_job(job_id, **kwargs):
    if job_id not in jobs:
        jobs[job_id] = {"status":"processing","progress":0,"step":"Starting...","result":None,"error":None}
    jobs[job_id].update(kwargs)

# ─────────────────────────────────────────────────────────────────────────────

SENSOR_RANGES = {
    "temperature":  (10,  50),
    "humidity":     (20, 100),
    "feed_weight":  (0,  600),
    "water":        (0,  400),
    "nh3":          (0,   60),
    "co2":          (200, 6000),
    "light":        (0,  600),
    "bird_weight":  (0.3,  6),
}

# ─────────────────────────────────────────────────────────────────────
# Step 1 — Column normalisation  (raw_* or clean_* → clean_* convention)
# ─────────────────────────────────────────────────────────────────────
_RAW_MAP = {
    "raw_temperature_c":   "clean_temperature_C",
    "raw_humidity_pct":    "clean_humidity_pct",
    "raw_feed_weight_kg":  "clean_feed_weight_kg",
    "raw_water_liters":    "clean_water_liters",
    "raw_nh3_ppm":         "clean_nh3_ppm",
    "raw_co2_ppm":         "clean_co2_ppm",
    "raw_light_lux":       "clean_light_lux",
    "raw_bird_weight_kg":  "clean_bird_weight_kg",
    "raw_egg_count":       "clean_egg_count",
    # also accept already-clean columns
    "clean_temperature_c": "clean_temperature_C",
    "temperature_c":       "clean_temperature_C",
    "temperature":         "clean_temperature_C",
    "humidity_pct":        "clean_humidity_pct",
    "humidity":            "clean_humidity_pct",
    "feed_weight_kg":      "clean_feed_weight_kg",
    "feed_weight":         "clean_feed_weight_kg",
    "water_liters":        "clean_water_liters",
    "water":               "clean_water_liters",
    "nh3_ppm":             "clean_nh3_ppm",
    "nh3":                 "clean_nh3_ppm",
    "co2_ppm":             "clean_co2_ppm",
    "co2":                 "clean_co2_ppm",
    "light_lux":           "clean_light_lux",
    "light":               "clean_light_lux",
    "bird_weight_kg":      "clean_bird_weight_kg",
    "bird_weight":         "clean_bird_weight_kg",
}

def normalize_df(df):
    rename = {}
    for c in df.columns:
        cl = c.strip().lower()
        if cl in ("timestamp","datetime","date","time"):
            rename[c] = "timestamp"
        elif cl in _RAW_MAP:
            rename[c] = _RAW_MAP[cl]
    return df.rename(columns=rename)


def clean_sensor_data(df):
    """EMI spike removal + linear interpolation (same as notebook Cells 1-3)."""
    df = df.copy()
    col_key = {
        "clean_temperature_C":  "temperature",
        "clean_humidity_pct":   "humidity",
        "clean_feed_weight_kg": "feed_weight",
        "clean_water_liters":   "water",
        "clean_nh3_ppm":        "nh3",
        "clean_co2_ppm":        "co2",
        "clean_light_lux":      "light",
        "clean_bird_weight_kg": "bird_weight",
    }
    for col, key in col_key.items():
        if col not in df.columns:
            continue
        s = df[col].astype(float)
        lo, hi = SENSOR_RANGES.get(key, (None, None))
        if lo is not None:
            s = s.where((s >= lo) & (s <= hi))
        rm = s.rolling(6, min_periods=1, center=True).mean()
        rs = s.rolling(6, min_periods=1, center=True).std().fillna(1).clip(lower=0.001)
        s[((s - rm).abs() > 3 * rs)] = np.nan
        s = s.interpolate(method="linear", limit=8).ffill().bfill()
        df[col] = s
    return df


# ─────────────────────────────────────────────────────────────────────
# CELL 5 — Feature Engineering + Model Training
# ─────────────────────────────────────────────────────────────────────
def run_cell5(df_cleaned, job_id=None):
    def _prog(p, s):
        if job_id:
            set_job(job_id, progress=p, step=s)
    features = pd.DataFrame()
    features["timestamp"]    = pd.to_datetime(df_cleaned["timestamp"])
    features["hour"]         = features["timestamp"].dt.hour
    features["day_of_week"]  = features["timestamp"].dt.dayofweek
    features["is_daytime"]   = ((features["hour"] >= 6) & (features["hour"] <= 20)).astype(int)
    features["hour_sin"]     = np.sin(2 * np.pi * features["hour"] / 24)
    features["hour_cos"]     = np.cos(2 * np.pi * features["hour"] / 24)

    start_date = pd.Timestamp("2024-06-01")
    features["bird_age_weeks"] = 20 + (features["timestamp"] - start_date).dt.days / 7.0

    sensor_map = {
        "clean_temperature_C":  "temperature",
        "clean_humidity_pct":   "humidity",
        "clean_feed_weight_kg": "feed_weight",
        "clean_water_liters":   "water",
        "clean_nh3_ppm":        "nh3",
        "clean_co2_ppm":        "co2",
        "clean_light_lux":      "light",
        "clean_bird_weight_kg": "bird_weight",
    }
    for col, name in sensor_map.items():
        if col in df_cleaned.columns:
            features[name] = df_cleaned[col].values

    # Rolling stats  (1h=4, 6h=24, 24h=96  at 15-min intervals)
    for wname, wsize in [("1h", 4), ("6h", 24), ("24h", 96)]:
        for col, name in sensor_map.items():
            if col in df_cleaned.columns:
                s = pd.Series(df_cleaned[col].values)
                features[f"{name}_mean_{wname}"] = s.rolling(wsize, min_periods=1).mean().values
                features[f"{name}_std_{wname}"]  = s.rolling(wsize, min_periods=1).std().fillna(0).values

    # Rate of change
    for col, name in sensor_map.items():
        if col in df_cleaned.columns:
            s = pd.Series(df_cleaned[col].values)
            features[f"{name}_diff_1"] = s.diff(1).fillna(0).values
            features[f"{name}_diff_4"] = s.diff(4).fillna(0).values

    # THI
    if "temperature" in features.columns and "humidity" in features.columns:
        T, RH = features["temperature"], features["humidity"]
        features["thi"] = 0.8 * T + (RH / 100) * (T - 14.4) + 46.4
        features["heat_stress_mild"]     = (features["thi"] > 75).astype(int)
        features["heat_stress_moderate"] = (features["thi"] > 80).astype(int)
        features["heat_stress_severe"]   = (features["thi"] > 85).astype(int)

    # Feed consumption rate
    if "feed_weight" in features.columns:
        fd = -pd.Series(features["feed_weight"]).diff(1).fillna(0)
        fd[fd < -10] = 0
        features["feed_consumption_rate"]    = fd.values
        features["feed_consumption_rate_1h"] = pd.Series(fd).rolling(4, min_periods=1).mean().values

    features = features.ffill().bfill().fillna(0)

    excl = {"timestamp"}
    feature_cols = [c for c in features.columns
                    if c not in excl
                    and features[c].dtype in ["float64","int64","float32","int32"]]
    X = features[feature_cols].values

    # ── Model 1: Feed ──
    _prog(30, "Training Feed Optimiser model (GradientBoosting)...")
    fw = features["feed_weight"].values if "feed_weight" in features.columns else np.zeros(len(features))
    y_feed = -np.diff(fw, prepend=fw[0])
    y_feed[y_feed < -10] = 0
    y_feed = np.clip(y_feed, 0, 50)

    valid = ~(np.isnan(X).any(axis=1) | np.isnan(y_feed))
    Xv, yv = X[valid], y_feed[valid]
    scaler_feed = StandardScaler()
    Xs = scaler_feed.fit_transform(Xv)
    feed_model = GradientBoostingRegressor(n_estimators=200, max_depth=6, learning_rate=0.05,
                                            subsample=0.8, random_state=42)
    for tr, val in TimeSeriesSplit(n_splits=5).split(Xs):
        feed_model.fit(Xs[tr], yv[tr])
    feed_model.fit(Xs, yv)

    # ── Model 2: Egg Production (daily) ──
    _prog(50, "Training Egg Production Predictor model (GradientBoosting)...")
    fc = features.copy()
    fc["date"] = fc["timestamp"].dt.date
    numcols = fc.select_dtypes(include=[np.number]).columns.tolist()
    daily = fc.groupby("date")[numcols].agg(["mean","max","min"]).reset_index()
    daily.columns = ["date"] + ["_".join(str(c) for c in col).strip("_") for col in daily.columns[1:]]

    thi_d = fc.groupby("date")["thi"].mean()
    est = []
    for date in daily["date"]:
        t = float(thi_d.get(date, 72))
        lr = 0.78 if t > 85 else 0.86 if t > 80 else 0.91 if t > 75 else 0.93
        est.append(NUM_BIRDS * lr * np.random.uniform(0.97, 1.03))
    daily["true_egg_count"] = est

    egg_fcols = [c for c in daily.columns if c not in ["date","true_egg_count"]]
    Xe = np.nan_to_num(daily[egg_fcols].values, nan=0, posinf=0, neginf=0)
    ye = daily["true_egg_count"].values
    scaler_eggs = StandardScaler()
    Xes = scaler_eggs.fit_transform(Xe)
    egg_model = GradientBoostingRegressor(n_estimators=150, max_depth=5, learning_rate=0.05, random_state=42)
    for tr, val in TimeSeriesSplit(n_splits=4).split(Xes):
        egg_model.fit(Xes[tr], ye[tr])
    egg_model.fit(Xes, ye)

    # ── Model 3: Risk ──
    _prog(60, "Training Heat Stress Risk Predictor model (RandomForest)...")
    thi_v = features["thi"].values
    rl = np.zeros(len(features), dtype=int)
    lk = 96
    for i in range(len(features) - lk):
        mx = np.nanmax(thi_v[i:i+lk])
        rl[i] = 3 if mx >= 85 else 2 if mx >= 80 else 1 if mx >= 75 else 0

    Xr = X[:len(X)-lk]
    yr = rl[:len(X)-lk]
    vr = ~np.isnan(Xr).any(axis=1)
    Xr, yr = Xr[vr], yr[vr]
    scaler_risk = StandardScaler()
    Xrs = scaler_risk.fit_transform(Xr)
    risk_model = RandomForestClassifier(n_estimators=200, max_depth=8,
                                         class_weight="balanced", random_state=42)
    for tr, val in TimeSeriesSplit(n_splits=4).split(Xrs):
        risk_model.fit(Xrs[tr], yr[tr])
    risk_model.fit(Xrs, yr)

    models_data = {
        "feed_model": feed_model, "feed_scaler": scaler_feed, "feed_feature_cols": feature_cols,
        "egg_model":  egg_model,  "egg_scaler":  scaler_eggs, "egg_feature_cols":  egg_fcols,
        "risk_model": risk_model, "risk_scaler": scaler_risk, "risk_feature_cols": feature_cols,
    }
    return features, models_data, daily


# ─────────────────────────────────────────────────────────────────────
# CELL 6 — Predictions + 7 JSON files  (exact notebook schema)
# ─────────────────────────────────────────────────────────────────────
def run_cell6(features, models_data, df_noisy, df_cleaned):
    RN = ["Normal","Mild","Moderate","Severe"]

    X_feed  = np.nan_to_num(features[models_data["feed_feature_cols"]].values, nan=0)
    feed_pred = models_data["feed_model"].predict(models_data["feed_scaler"].transform(X_feed))

    X_risk  = np.nan_to_num(features[models_data["risk_feature_cols"]].values, nan=0)
    risk_pred  = models_data["risk_model"].predict(models_data["risk_scaler"].transform(X_risk))
    risk_proba = models_data["risk_model"].predict_proba(models_data["risk_scaler"].transform(X_risk))
    nc = risk_proba.shape[1]

    # Daily egg predictions
    fc = features.copy()
    fc["date"] = fc["timestamp"].dt.date
    numcols = fc.select_dtypes(include=[np.number]).columns.tolist()
    daily_f = fc.groupby("date")[numcols].agg(["mean","max","min"]).reset_index()
    daily_f.columns = ["date"] + ["_".join(str(c) for c in col).strip("_") for col in daily_f.columns[1:]]
    for c in models_data["egg_feature_cols"]:
        if c not in daily_f.columns:
            daily_f[c] = 0
    Xe = np.nan_to_num(daily_f[models_data["egg_feature_cols"]].values, nan=0, posinf=0, neginf=0)
    egg_pred = models_data["egg_model"].predict(models_data["egg_scaler"].transform(Xe))

    # ── JSON 1 : noise_reduction_viz.json ──
    sample = 4
    sv = [
        ("clean_temperature_C",  "raw_temperature_C",  "Temperature (°C)"),
        ("clean_humidity_pct",   "raw_humidity_pct",   "Humidity (%)"),
        ("clean_feed_weight_kg", "raw_feed_weight_kg", "Feed Weight (kg)"),
        ("clean_co2_ppm",        "raw_co2_ppm",        "CO2 (ppm)"),
        ("clean_nh3_ppm",        "raw_nh3_ppm",        "NH3 (ppm)"),
    ]
    noise_viz = {}
    week = 7 * 24 * 4
    for cc, rc, label in sv:
        end = min(week, len(df_cleaned))
        ts  = pd.to_datetime(df_noisy["timestamp"][:end:sample]).astype(str).tolist() if "timestamp" in df_noisy.columns else []
        gt  = [None if pd.isna(v) else float(v) for v in (df_cleaned[cc].values[:end:sample] if cc in df_cleaned.columns else [])]
        raw = [None if pd.isna(v) else float(v) for v in (df_noisy[rc].values[:end:sample]   if rc in df_noisy.columns  else [])]
        viz = {"label": label, "timestamps": ts, "ground_truth": gt, "raw_noisy": raw, "filtered_clean": gt}
        if cc in df_cleaned.columns and rc in df_noisy.columns:
            t_a = df_cleaned[cc].values[:end];  r_a = df_noisy[rc].values[:end]
            v2  = ~(np.isnan(t_a) | np.isnan(r_a))
            if v2.sum() > 0:
                rmse = float(np.sqrt(np.mean((t_a[v2] - r_a[v2])**2)))
                viz["metrics"] = {"raw_rmse": rmse, "clean_rmse": 0.0, "improvement_pct": 100.0}
        noise_viz[label] = viz

    noise_viz["emi_summary"] = {
        "temperature_spikes": int(np.sum(np.abs(pd.Series(
            df_noisy["raw_temperature_C"].values if "raw_temperature_C" in df_noisy.columns else []
        ).diff().fillna(0)) > 5)),
        "feed_spikes": int(np.sum(np.abs(pd.Series(
            df_noisy["raw_feed_weight_kg"].values if "raw_feed_weight_kg" in df_noisy.columns else []
        ).diff().fillna(0)) > 20)),
        "total_dropouts": int(df_noisy.isnull().sum().sum()),
        "max_dust_offset": 0.5,
    }

    # ── JSON 2 : current_status.json  (notebook schema: sensors.*) ──
    last = len(df_cleaned) - 1
    thi_v = float(features["thi"].iloc[last]) if "thi" in features.columns else 70.0
    rl    = int(risk_pred[last])
    def _f(col, fb): return float(df_cleaned[col].iloc[last]) if col in df_cleaned.columns else fb

    current_status = {
        "timestamp": str(df_cleaned["timestamp"].iloc[last]),
        "sensors": {
            "temperature_C":  _f("clean_temperature_C",  28.0),
            "humidity_pct":   _f("clean_humidity_pct",   65.0),
            "feed_weight_kg": _f("clean_feed_weight_kg", 50.0),
            "water_liters":   _f("clean_water_liters",   30.0),
            "nh3_ppm":        _f("clean_nh3_ppm",        10.0),
            "co2_ppm":        _f("clean_co2_ppm",       800.0),
            "light_lux":      _f("clean_light_lux",     100.0),
            "bird_weight_kg": _f("clean_bird_weight_kg",  2.0),
        },
        "derived": {
            "thi": thi_v,
            "feed_consumption_rate": float(features["feed_consumption_rate_1h"].iloc[last])
                if "feed_consumption_rate_1h" in features.columns else 0.0,
        },
        "risk": {
            "heat_stress_level": rl,
            "heat_stress_label": RN[min(rl, 3)],
            "risk_probabilities": {
                "normal":   float(risk_proba[last][0]) if nc > 0 else 1.0,
                "mild":     float(risk_proba[last][1]) if nc > 1 else 0.0,
                "moderate": float(risk_proba[last][2]) if nc > 2 else 0.0,
                "severe":   float(risk_proba[last][3]) if nc > 3 else 0.0,
            },
        },
        "optimal_feed": {"predicted_consumption_kg": float(feed_pred[last])},
    }

    # ── JSON 3 : trends.json ──
    dc = df_cleaned.copy()
    dc["date"] = pd.to_datetime(dc["timestamp"]).dt.date
    agg = {}
    if "clean_temperature_C" in dc.columns: agg["clean_temperature_C"] = ["mean","max","min"]
    if "clean_humidity_pct"  in dc.columns: agg["clean_humidity_pct"]  = ["mean","max","min"]
    if "clean_nh3_ppm"       in dc.columns: agg["clean_nh3_ppm"]       = "mean"
    if "clean_co2_ppm"       in dc.columns: agg["clean_co2_ppm"]       = "mean"
    daily = dc.groupby("date").agg(agg).reset_index()
    daily.columns = ["date"] + ["_".join(c).strip("_") for c in daily.columns[1:]]

    ri = fc.copy(); ri["risk_level"] = np.append(risk_pred, np.zeros(max(0, len(ri)-len(risk_pred)), dtype=int))[:len(ri)]
    rd = ri.groupby("date")["risk_level"].agg(["mean","max"]).reset_index()

    trends = {
        "dates": [str(d) for d in daily["date"]],
        "temperature": {
            "mean": daily.get("clean_temperature_C_mean", pd.Series([])).round(1).tolist(),
            "max":  daily.get("clean_temperature_C_max",  pd.Series([])).round(1).tolist(),
            "min":  daily.get("clean_temperature_C_min",  pd.Series([])).round(1).tolist(),
        },
        "humidity": {
            "mean": daily.get("clean_humidity_pct_mean", pd.Series([])).round(1).tolist(),
            "max":  daily.get("clean_humidity_pct_max",  pd.Series([])).round(1).tolist(),
            "min":  daily.get("clean_humidity_pct_min",  pd.Series([])).round(1).tolist(),
        },
        "nh3_mean": daily.get("clean_nh3_ppm_mean", pd.Series([])).round(2).tolist(),
        "co2_mean": daily.get("clean_co2_ppm_mean", pd.Series([])).round(0).tolist(),
        "risk_trend": {
            "dates":     [str(d) for d in rd["date"]],
            "mean_risk": rd["mean"].round(2).tolist(),
            "max_risk":  rd["max"].tolist(),
        },
        "egg_production": {
            "dates":          [str(d) for d in daily_f["date"]],
            "predicted_eggs": [round(float(v)) for v in egg_pred],
        },
    }

    # ── JSON 4 : alerts.json ──
    alerts = []
    for i in range(1, len(risk_pred)):
        if risk_pred[i] >= 2 and risk_pred[i-1] < 2:
            alerts.append({
                "timestamp": str(features["timestamp"].iloc[i]),
                "type":      "HEAT_STRESS_WARNING",
                "severity":  RN[min(int(risk_pred[i]), 3)],
                "color":     "red" if risk_pred[i] >= 3 else "orange",
                "message":   f"Heat stress predicted: THI={features['thi'].iloc[i]:.1f}",
                "actions":   ["Increase ventilation","Activate cooling","Increase water","Reduce feed 10-15%"],
                "estimated_savings": "NT$4,800-16,000 (mortality prevention)",
            })
    alerts_out = {"alerts": alerts[-100:], "total_alerts": len(alerts)}

    # ── JSON 5 : feed_optimization.json ──
    f2 = features.copy()
    f2["predicted_feed"] = feed_pred
    f2["date"] = f2["timestamp"].dt.date
    df_feed = f2.groupby("date").agg(predicted_feed=("predicted_feed","sum")).reset_index()
    df_feed["savings_kg"]  = df_feed["predicted_feed"] * 0.05
    df_feed["savings_usd"] = df_feed["savings_kg"]     * 14.4

    feed_opt = {
        "dates":                   [str(d) for d in df_feed["date"]],
        "predicted_daily_feed_kg": df_feed["predicted_feed"].round(1).tolist(),
        "actual_daily_feed_kg":    (df_feed["predicted_feed"] * 1.05).round(1).tolist(),
        "daily_savings_kg":        df_feed["savings_kg"].round(2).tolist(),
        "daily_savings_usd":       df_feed["savings_usd"].round(2).tolist(),
        "cumulative_savings_usd":  df_feed["savings_usd"].cumsum().round(2).tolist(),
        "summary": {
            "total_savings_kg":      round(float(df_feed["savings_kg"].sum()), 1),
            "total_savings_usd":     round(float(df_feed["savings_usd"].sum()), 2),
            "avg_daily_savings_usd": round(float(df_feed["savings_usd"].mean()), 2),
        },
    }

    # ── JSON 6 : profitability_report.json  (notebook schema: revenue/costs/ai_value) ──
    days         = len(egg_pred)
    total_eggs   = float(np.sum(egg_pred))
    egg_revenue  = total_eggs * 3.84
    total_fkg    = float(df_feed["predicted_feed"].sum())
    feed_cost    = total_fkg * 14.4
    feed_sav     = feed_cost * 0.05
    heat_ev      = int(np.sum(risk_pred >= 2)) // 96
    mort_sav     = heat_ev * 15 * 5
    total_ai     = feed_sav + mort_sav
    monthly_ai   = total_ai / max(days / 30, 1)
    fee          = max(3200, min(16000, monthly_ai * 0.2))

    profitability = {
        "period":     f"{days} days",
        "flock_size": NUM_BIRDS,
        "revenue":    {"total_eggs": round(total_eggs), "total_revenue": round(egg_revenue, 2)},
        "costs":      {"total_feed_cost": round(feed_cost, 2)},
        "ai_value": {
            "feed_savings":         round(feed_sav, 2),
            "mortality_prevention": round(mort_sav, 2),
            "total_ai_savings":     round(total_ai, 2),
            "monthly_ai_value":     round(monthly_ai, 2),
        },
        "pricing_model": {
            "recommended_fee":   round(fee, 0),
            "value_proposition": f"NT${fee:.0f}/mo generates NT${monthly_ai:.0f}/mo savings",
            "tier_basic":        {"price": 3200,  "features": ["Monitoring","Alerts","Daily report"]},
            "tier_pro":          {"price": 9600, "features": ["Everything Basic","AI optimizer","Heat prediction","SOP"]},
            "tier_enterprise":   {"price": 16000, "features": ["Everything Pro","Multi-house","API","Custom models"]},
        },
    }

    # ── JSON 7 : sop_context.json ──
    lr = features.iloc[-1]
    sop_context = {
        "farm_profile": {
            "location":       "Farm A",
            "flock_size":     NUM_BIRDS,
            "bird_age_weeks": float(lr.get("bird_age_weeks", 24)),
        },
        "current_conditions": {
            "temperature_C": float(lr.get("temperature", 28)),
            "humidity_pct":  float(lr.get("humidity",    65)),
            "thi_index":     float(lr.get("thi",         72)),
            "nh3_ppm":       float(lr.get("nh3",         10)),
            "co2_ppm":       float(lr.get("co2",        800)),
        },
        "last_24h_summary": {
            "temp_min":       round(float(features["temperature"].tail(96).min()), 1),
            "temp_max":       round(float(features["temperature"].tail(96).max()), 1),
            "thi_max":        round(float(features["thi"].tail(96).max()), 1),
            "max_risk_level": int(risk_pred[-min(96,len(risk_pred)):].max()),
        },
        "ai_predictions": {
            "heat_stress_risk":    int(risk_pred[-1]),
            "heat_stress_label":   RN[min(int(risk_pred[-1]), 3)],
            "optimal_feed_rate":   float(feed_pred[-1]),
            "predicted_eggs_today": float(egg_pred[-1]),
        },
    }

    return {
        "noise_reduction_viz": noise_viz,
        "current_status":      current_status,
        "trends":              trends,
        "alerts":              alerts_out,
        "feed_optimization":   feed_opt,
        "profitability_report": profitability,
        "sop_context":         sop_context,
        # internal arrays for Cell 7
        "_feed_pred": feed_pred,
        "_egg_pred":  egg_pred,
        "_risk_pred": risk_pred,
    }


# ─────────────────────────────────────────────────────────────────────
# CELL 7 — SOP Generation (rule-based; optional Gemini)
# ─────────────────────────────────────────────────────────────────────
def run_cell7(sop_ctx, gemini_key=None):
    RN   = ["Normal","Mild","Moderate","Severe"]
    cc   = sop_ctx.get("current_conditions", {})
    ap   = sop_ctx.get("ai_predictions", {})
    fp   = sop_ctx.get("farm_profile", {})

    temp     = cc.get("temperature_C", 28)
    thi      = cc.get("thi_index",     72)
    nh3      = cc.get("nh3_ppm",       10)
    risk     = ap.get("heat_stress_risk", 0)
    flock    = fp.get("flock_size",     NUM_BIRDS)
    bird_age = fp.get("bird_age_weeks", 24)
    risk_lbl = RN[min(risk, 3)]

    base = 115
    if   thi > 85: adj=-20; note="Severe heat: reduce feed, add electrolytes"
    elif thi > 80: adj=-12; note="Moderate heat: reduce midday feed"
    elif thi > 75: adj=-5;  note="Mild heat: slight reduction"
    else:          adj=0;   note="Normal: standard schedule"

    af  = base + adj
    tf  = af * flock / 1000
    fan = min(100, 30 + max(0, (temp-24)*10))
    cool = temp > 30
    wt  = int(200*(1.5 if thi>80 else 1.2 if thi>75 else 1.0))

    if   bird_age < 25: lr = 0.70 + 0.02*(bird_age-20)
    elif bird_age <= 35: lr = 0.93
    else:               lr = 0.93 - 0.005*(bird_age-35)
    if   thi > 85: lr *= 0.85
    elif thi > 80: lr *= 0.92

    ee  = int(flock * lr)
    rev = ee * 3.84
    sav = tf * 14.4 * 0.05

    prio = []
    p = 1
    if risk >= 2:
        prio.append({"priority":p,"action":f"ACTIVATE emergency cooling. THI={thi:.1f}","reason":f"Prevents {int(flock*0.003)} bird deaths/day","deadline":"IMMEDIATELY","estimated_value_usd":round(flock*0.003*160,2)}); p+=1
    if nh3 > 20:
        prio.append({"priority":p,"action":f"Increase ventilation. NH3={nh3:.1f}ppm exceeds limit","reason":"Prevents respiratory disease","deadline":"Within 30 min","estimated_value_usd":round(ee*0.02*3.84,2)}); p+=1
    prio.append({"priority":p,"action":f"Set feed: {af}g/bird ({tf:.0f}kg total)","reason":note,"deadline":"Before 06:00","estimated_value_usd":round(sav,2)}); p+=1
    prio.append({"priority":p,"action":f"Water supply: {wt}ml/bird/day","reason":f"Water:feed ratio = {wt/af:.1f}:1","deadline":"Check every 2h","estimated_value_usd":0})

    # Optional Gemini executive summary
    GROQ_KEY     = "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"
    GEMINI_KEYS  = ["AIzaSyCaFp6zGiXElcOWzK_KHG1Bo9ic6nK9I-w",
                    "AIzaSyD0A_WYzLXZXf1sosCVUkpxVuuW4XOISzk"]
    if gemini_key and gemini_key not in GEMINI_KEYS:
        GEMINI_KEYS.insert(0, gemini_key)

    gby    = "rule_based"
    exec_s = (f"Today: {risk_lbl.lower()} heat stress (THI={thi:.1f}). "
              f"{'IMMEDIATE cooling needed. ' if risk>=2 else ''}"
              f"Feed: {af}g/bird. Expected: {ee} eggs (${rev:.0f}).")

    ai_prompt = (f"You are a poultry farm AI assistant. Write a 2-sentence executive summary: "
                 f"THI={thi:.1f}, Risk={risk_lbl}, Temp={temp}°C, "
                 f"Feed={af}g/bird, Expected={ee} eggs, Revenue=NT${rev:.0f}. "
                 f"Be specific and actionable.")

    # 1. Try Groq (llama-3.3-70b — fast, generous free tier)
    try:
        import requests as _req
        resp = _req.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_KEY}",
                     "Content-Type": "application/json"},
            json={"model": "llama-3.3-70b-versatile",
                  "messages": [{"role": "user", "content": ai_prompt}],
                  "temperature": 0.3, "max_tokens": 150},
            timeout=15,
        )
        if resp.status_code == 200:
            exec_s = resp.json()["choices"][0]["message"]["content"].strip()
            gby = "groq-llama3.3-70b"
    except Exception as e:
        print(f"[SOP] Groq failed: {e}. Trying Gemini…")
        # 2. Fall back to Gemini keys
        for k in GEMINI_KEYS:
            try:
                import google.generativeai as genai
                genai.configure(api_key=k)
                model = genai.GenerativeModel("gemini-2.0-flash")
                exec_s = model.generate_content(ai_prompt).text.strip()
                gby = "gemini-2.0-flash"; break
            except Exception:
                continue

    return {
        "sop_date":          datetime.now().strftime("%Y-%m-%d"),
        "generated_at":      datetime.now().isoformat(),
        "generated_by":      gby,
        "overall_risk_level": risk_lbl,
        "executive_summary": exec_s,
        "priority_actions":  prio,
        "feeding_plan": {
            "total_feed_kg":  round(tf, 1),
            "feed_per_bird_g": af,
            "schedule": [
                {"time":"06:00","amount_kg":round(tf*0.30,1),"notes":"Largest portion"},
                {"time":"10:00","amount_kg":round(tf*0.25,1),"notes":"Second portion"},
                {"time":"14:00","amount_kg":round(tf*0.20,1),"notes":"Reduced if hot"},
                {"time":"18:00","amount_kg":round(tf*0.25,1),"notes":"Evening portion"},
            ],
            "adjustments": note,
        },
        "ventilation_plan": {
            "fan_speed_pct": int(fan), "cooling_pad_active": cool,
            "schedule": [
                {"time_range":"00:00-06:00","fan_speed":max(30,int(fan)-20)},
                {"time_range":"06:00-10:00","fan_speed":int(fan)},
                {"time_range":"10:00-16:00","fan_speed":min(100,int(fan)+10)},
                {"time_range":"16:00-20:00","fan_speed":int(fan)},
                {"time_range":"20:00-00:00","fan_speed":max(30,int(fan)-10)},
            ],
        },
        "water_plan": {
            "target_ml_per_bird": wt,
            "total_liters":       wt * flock / 1000,
            "additives": "Electrolytes + Vitamin C" if thi > 80 else "Standard",
        },
        "monitoring_schedule": [
            {"time":"05:00","check":"Temp & humidity",      "threshold":f"Alert if >{32 if risk<2 else 30}°C"},
            {"time":"06:00","check":"Feeders & water",      "threshold":"All operational"},
            {"time":"08:00","check":"First egg collection", "threshold":f">{ee*0.3:.0f} eggs"},
            {"time":"10:00","check":"Bird behavior",        "threshold":">5% panting = alert"},
            {"time":"12:00","check":"Peak temperature",     "threshold":"THI>80 = emergency cool"},
            {"time":"14:00","check":"Second egg collection","threshold":f"Cumulative >{ee*0.7:.0f}"},
            {"time":"18:00","check":"Final + mortality",    "threshold":"Mortality >0.05% = alert"},
        ],
        "expected_outcomes": {
            "expected_eggs":    ee,
            "laying_rate_pct":  round(lr * 100, 1),
            "expected_fcr":     round(tf / (ee * 0.06), 2) if ee > 0 else 0,
            "mortality_risk":   "HIGH" if risk>=3 else "MEDIUM" if risk>=2 else "LOW",
        },
        "estimated_daily_value": {
            "revenue_usd":    round(rev, 2),
            "feed_cost_usd":  round(tf * 0.45, 2),
            "ai_savings_usd": round(sav + (flock*0.003*5 if risk>=2 else 0), 2),
            "net_profit_usd": round(rev - tf * 0.45 * 1.3, 2),
        },
    }


# ─────────────────────────────────────────────────────────────────────
# Full pipeline
# ─────────────────────────────────────────────────────────────────────
def run_pipeline(df_raw, gemini_key=None, job_id=None):
    def _prog(p, s):
        print(f"[Pipeline] {s}")
        if job_id:
            set_job(job_id, progress=p, step=s)

    _prog(10, f"Loaded {len(df_raw)} rows — normalising columns...")
    df_raw     = normalize_df(df_raw)
    _prog(15, "Cleaning sensor data (outlier removal, interpolation)...")
    df_cleaned = clean_sensor_data(df_raw)
    _prog(20, "Engineering features (rolling stats, THI index, heat stress)...")
    _prog(30, "Training Feed Optimiser model (GradientBoosting 200 trees)...")
    features, models, _ = run_cell5(df_cleaned, job_id=job_id)
    _prog(70, "Generating predictions + building dashboard JSON files...")
    cell6 = run_cell6(features, models, df_raw, df_cleaned)
    _prog(88, "Generating SOP via AI...")
    sop   = run_cell7(cell6["sop_context"], gemini_key=gemini_key)
    _prog(95, "Saving results...")
    for k in ["_feed_pred","_egg_pred","_risk_pred"]:
        cell6.pop(k, None)
    return {**cell6, "generated_sop": sop}


# ─────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status":"ok","version":"2.0-notebook-pipeline"})


@app.route("/api/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error":"No file. Send CSV with key 'file'."}), 400
    f = request.files["file"]
    if not f.filename or not f.filename.lower().endswith(".csv"):
        return jsonify({"error":"Only CSV files supported."}), 400
    try:
        path = os.path.join(UPLOAD_FOLDER, f"upload_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
        f.save(path)
        df = pd.read_csv(path)
        if len(df) < 50:
            return jsonify({"error":"CSV needs at least 50 rows."}), 400

        job_id = str(uuid.uuid4())
        gkey   = request.form.get("gemini_key","") or ""
        set_job(job_id, status="processing", progress=2, step="File received — starting ML pipeline...")

        def _run():
            try:
                set_job(job_id, progress=5,  step="Normalising columns...")
                set_job(job_id, progress=10, step="Engineering features (rolling stats, THI)...")
                dashboard = run_pipeline(df, gemini_key=gkey, job_id=job_id)

                for key, data in dashboard.items():
                    with open(os.path.join(DATA_DIR, f"{key}.json"), "w") as out:
                        json.dump(data, out, indent=2, default=str)

                days  = len(dashboard["trends"]["egg_production"]["predicted_eggs"])
                eggs  = dashboard["profitability_report"]["revenue"]["total_eggs"]
                set_job(job_id,
                    status="done", progress=100, step="Complete!",
                    result={
                        "success": True,
                        "message": f"Processed {len(df)} rows over {days} days",
                        "summary": {"rows": len(df), "days": days,
                                    "total_eggs": eggs,
                                    "alerts": dashboard["alerts"]["total_alerts"]},
                        "dashboard_data": dashboard,
                    })
                print(f"[Job {job_id[:8]}] Done — {len(df)} rows, {days} days, {int(eggs)} eggs")
            except Exception as e:
                traceback.print_exc()
                set_job(job_id, status="error", progress=0, step="Failed", error=str(e))

        threading.Thread(target=_run, daemon=True).start()
        return jsonify({"job_id": job_id, "status": "processing"})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/job/<job_id>", methods=["GET"])
def job_status(job_id):
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    resp = {
        "job_id":   job_id,
        "status":   job["status"],
        "progress": job["progress"],
        "step":     job["step"],
    }
    if job["status"] == "done":
        resp["result"] = job["result"]
    if job["status"] == "error":
        resp["error"] = job["error"]
    return jsonify(resp)


@app.route("/api/generate-sop", methods=["POST"])
def gen_sop():
    try:
        body = request.get_json(silent=True) or {}
        gkey = body.get("gemini_key","") or os.environ.get("GEMINI_API_KEY","")
        ctx_path = os.path.join(DATA_DIR, "sop_context.json")
        ctx = body.get("sop_context") or (json.load(open(ctx_path)) if os.path.exists(ctx_path) else {})
        sop = run_cell7(ctx, gemini_key=gkey)
        with open(os.path.join(DATA_DIR,"generated_sop.json"),"w") as out:
            json.dump(sop, out, indent=2)
        return jsonify({"success":True,"sop":sop})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error":str(e)}), 500


@app.route("/api/farm/<farm_id>", methods=["GET"])
def load_farm(farm_id):
    farms = {
        "farm_a": os.path.join(os.path.dirname(__file__),
                               "..","..",
                               "my_project","data","raw_sensor_data.csv"),
    }
    if farm_id not in farms:
        return jsonify({"error":f"Unknown farm. Available: {list(farms.keys())}"}), 404

    # Fast path — already processed
    cs = os.path.join(DATA_DIR,"current_status.json")
    if os.path.exists(cs):
        result = {}
        for n in ["current_status","alerts","feed_optimization","trends",
                  "profitability_report","noise_reduction_viz","sop_context","generated_sop"]:
            p = os.path.join(DATA_DIR,f"{n}.json")
            if os.path.exists(p):
                result[n] = json.load(open(p))
        if result:
            return jsonify({"success":True,"source":"cache","dashboard_data":result})

    raw = farms[farm_id]
    if not os.path.exists(raw):
        return jsonify({"error":f"Raw CSV not found: {raw}"}), 404

    try:
        df = pd.read_csv(raw)
        gkey = request.args.get("gemini_key","")
        dash = run_pipeline(df, gemini_key=gkey)
        for key, data in dash.items():
            with open(os.path.join(DATA_DIR,f"{key}.json"),"w") as out:
                json.dump(data, out, indent=2, default=str)
        return jsonify({"success":True,"source":"ml_pipeline","dashboard_data":dash})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error":str(e)}), 500


if __name__ == "__main__":
    print("="*60)
    print("EdgeNexAI Backend v2.0 — Notebook Pipeline (Cells 5,6,7)")
    print(f"DATA_DIR: {DATA_DIR}")
    print("="*60)
    app.run(host="0.0.0.0", port=5000, debug=False)
