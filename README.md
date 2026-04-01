# EdgeNexAI — Poultry Farm AI Dashboard

An AI-powered poultry farm management dashboard that runs three machine learning models on sensor data and visualises predictions in real-time.

---

## Quick Start

### 1 — Install dependencies

```bash
# Frontend
cd edgenexai-dashboard
npm install

# Backend
cd backend
py -3.12 -m pip install -r requirements.txt
```

### 2 — Start the backend

```bash
cd edgenexai-dashboard/backend
py -3.12 app.py
# → Running on http://localhost:5000
```

### 3 — Start the frontend

```bash
cd edgenexai-dashboard
npm run dev
# → Running on http://localhost:5173
```

### 4 — Open the app

Go to **http://localhost:5173** — the landing page will appear.

---

## How to Use

### Option A — Upload your sensor CSV

1. Click **"Upload CSV"** on the landing page
2. Drop or select your `cleaned_sensor_data.csv`
3. Click **"Run ML Models"**
4. Wait ~2–3 minutes while the backend trains the models
5. Dashboard opens automatically with live predictions

### Option B — Select a pre-configured farm

1. Click **"Select Farm"** on the landing page
2. Choose **Farm A** (uses the bundled dataset)
3. Dashboard opens immediately with pre-computed data

---

## CSV Format

Upload any of these formats — column names are auto-detected:

| Column | Description | Example |
|--------|-------------|---------|
| `timestamp` | ISO datetime | `2024-06-01 00:00:00` |
| `clean_temperature_C` | Temperature (°C) | `28.5` |
| `clean_humidity_pct` | Relative humidity (%) | `65.2` |
| `clean_feed_weight_kg` | Feed hopper weight (kg) | `320.4` |
| `clean_water_liters` | Water consumption (L) | `180.0` |
| `clean_nh3_ppm` | Ammonia concentration (ppm) | `12.3` |
| `clean_co2_ppm` | CO₂ level (ppm) | `850.0` |
| `clean_light_lux` | Light intensity (lux) | `120.0` |
| `clean_bird_weight_kg` | Average bird weight (kg) | `1.85` |

Also accepts `raw_*` column names and plain names (`temperature`, `humidity`, etc.).

---

## ML Models

All three models are trained fresh on every upload using the exact notebook pipeline:

| Model | Algorithm | Target | CV |
|-------|-----------|--------|-----|
| **Feed Optimizer** | Gradient Boosting Regressor | Feed consumption rate (kg/15 min) | TimeSeriesSplit(5) |
| **Egg Production Predictor** | Gradient Boosting Regressor | Daily egg count | TimeSeriesSplit(4) |
| **Heat Stress Risk Predictor** | Random Forest Classifier | Risk level (Normal/Mild/Moderate/Severe) 24 h ahead | TimeSeriesSplit(4) |

### Feature Engineering (83 features)

- Raw sensors: temperature, humidity, feed weight, water, NH₃, CO₂, light, bird weight
- Rolling stats: 1 h / 6 h / 24 h mean & std for each sensor
- Rate of change: 1-step and 4-step diffs
- THI (Temperature Humidity Index): `0.8·T + (RH/100)·(T−14.4) + 46.4`
- Heat stress flags: mild (THI > 75), moderate (> 80), severe (> 85)
- Time features: hour, day-of-week, is_daytime, hour_sin/cos
- Bird age in weeks

---

## Dashboard Pages

| Page | What it shows |
|------|---------------|
| **Dashboard** | Live status, THI meter, risk probabilities, profitability KPIs, alerts |
| **Feeding** | AI feeding plan (g/bird, kg total, 4 time slots), predicted vs actual 30-day chart, AI savings |
| **Environment** | 5 sensor cards, hourly temperature chart, 30-day trends, risk distribution |
| **Production** | Predicted eggs, total eggs (90 days), revenue, net profit, FCR, profitability breakdown |
| **Alerts** | Heat stress events with timestamps, severity, recommended actions, estimated savings |
| **SOP Generator** | One-click SOP via Groq (Llama 3.3 70B) → Gemini fallback → rule-based fallback |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/upload` | Upload CSV → run pipeline → return all dashboard JSON |
| `POST` | `/api/generate-sop` | Re-generate SOP from latest sensor context |
| `GET` | `/api/farm/<farm_id>` | Load pre-configured farm (e.g. `farm_a`) |

---

## AI / SOP Generation

The SOP Generator uses a cascade of LLM calls:

1. **Groq** — `llama-3.3-70b-versatile` (fast, free tier)
2. **Gemini 2.0 Flash** — Key 1 fallback
3. **Gemini 2.0 Flash** — Key 2 fallback
4. **Rule-based** — Always works offline

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, Framer Motion |
| Backend | Python 3.12, Flask, scikit-learn, pandas, NumPy |
| ML | GradientBoostingRegressor, RandomForestClassifier, StandardScaler |
| AI | Groq API (Llama 3.3 70B), Google Gemini 2.0 Flash |
| Currency | NT$ (New Taiwan Dollar) |

---

## Project Structure

```
edgenexai-dashboard/
├── backend/
│   ├── app.py              # Flask server + ML pipeline (Cells 5, 6, 7)
│   └── requirements.txt
├── src/
│   ├── pages/
│   │   ├── LandingPage.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Feeding.jsx
│   │   ├── Environment.jsx
│   │   ├── Production.jsx
│   │   ├── Alerts.jsx
│   │   ├── SOPPage.jsx
│   │   └── UploadPage.jsx
│   ├── hooks/
│   │   ├── DashboardContext.jsx   # Global state + upload handler
│   │   └── useDashboardData.js
│   ├── services/
│   │   ├── dataService.js         # Load static JSON files
│   │   └── geminiService.js       # Groq + Gemini AI calls
│   └── data/                      # Static JSON (updated on upload)
│       ├── current_status.json
│       ├── trends.json
│       ├── alerts.json
│       ├── feed_optimization.json
│       ├── profitability_report.json
│       ├── noise_reduction_viz.json
│       ├── sop_context.json
│       └── generated_sop.json
└── public/
```

---

## Environment Variables

Create `.env.local` in the project root:

```env
VITE_API_URL=http://localhost:5000
VITE_GROQ_API_KEY=gsk_...
VITE_GEMINI_API_KEY=AIzaSy...
```

---

## Sample Data

Sample data (90 days, 8640 rows at 15-min intervals) is available in:

```
my_project/data/cleaned_sensor_data.csv
```

Farm profile: NCHU Taiwan · 5,000 laying hens · 15-min sensor interval · Layer house
