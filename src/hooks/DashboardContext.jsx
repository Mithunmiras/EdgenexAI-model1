import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { loadDashboardData } from '../services/dataService';

// Use Vite proxy (/api → http://localhost:5000) to avoid CORS entirely.
// The proxy is defined in vite.config.js.
const API_BASE = '';

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const [data, setData] = useState(() => {
    try { return loadDashboardData(); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [jobProgress, setJobProgress] = useState({ progress: 0, step: '' });
  const pollRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  // Upload CSV → get job_id → poll /api/job/:id until done
  const uploadSensorData = useCallback(async (file) => {
    setLoading(true);
    setUploadResult(null);
    setJobProgress({ progress: 2, step: 'Sending file to backend...' });
    stopPolling();

    try {
      // Step 1: POST the file — returns immediately with job_id
      let res;
      try {
        const formData = new FormData();
        formData.append('file', file);
        res = await fetch('/api/upload', { method: 'POST', body: formData });
      } catch {
        throw new Error('Cannot connect to backend — start Flask with: py -3.12 backend/app.py');
      }

      const initial = await res.json();
      if (!res.ok) throw new Error(initial.error || `Server error ${res.status}`);

      const { job_id } = initial;
      if (!job_id) throw new Error('Backend did not return a job ID');

      setJobProgress({ progress: 5, step: 'ML pipeline started — training models...' });

      // Step 2: Poll /api/job/:id every 1.5s
      return await new Promise((resolve, reject) => {
        pollRef.current = setInterval(async () => {
          try {
            const jr = await fetch(`/api/job/${job_id}`);
            const job = await jr.json();

            setJobProgress({ progress: job.progress || 0, step: job.step || '' });

            if (job.status === 'done') {
              stopPolling();
              const result = job.result;
              const bd = result.dashboard_data;
              const transformed = transformBackendData(bd);
              setData(transformed);
              setUploadResult({ success: true, summary: result.summary, message: result.message });
              setLoading(false);
              resolve(result);
            } else if (job.status === 'error') {
              stopPolling();
              setUploadResult({ success: false, error: job.error });
              setLoading(false);
              reject(new Error(job.error || 'Pipeline failed'));
            }
          } catch (pollErr) {
            // network blip — keep polling
          }
        }, 1500);
      });

    } catch (err) {
      stopPolling();
      setUploadResult({ success: false, error: err.message });
      setLoading(false);
      throw err;
    }
  }, []);

  // Generate SOP via backend (which calls Gemini)
  const generateSOPFromBackend = useCallback(async () => {
    try {
      const res = await fetch(`/api/generate-sop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'SOP generation failed');

      // Update the generated_sop in current data
      if (result.sop) {
        setData(prev => prev ? { ...prev, generated_sop: result.sop } : prev);
      }
      return result;
    } catch (err) {
      throw err;
    }
  }, []);

  // Reset to static data
  const resetToStatic = useCallback(() => {
    try {
      const d = loadDashboardData();
      setData(d);
      setUploadResult(null);
    } catch {}
  }, []);

  // Load pre-configured farm data (from backend or static files)
  const loadFarmData = useCallback(async (farmId) => {
    setLoading(true);
    try {
      // Try backend first
      const res = await fetch(`/api/farm/${farmId}`);
      if (res.ok) {
        const result = await res.json();
        if (result.dashboard_data) {
          const transformed = transformBackendData(result.dashboard_data);
          setData(transformed);
          setLoading(false);
          return result;
        }
      }
    } catch {
      // Backend unavailable — fall through to static
    }
    // Fallback: load static JSON data
    try {
      const d = loadDashboardData();
      setData(d);
    } catch {}
    setLoading(false);
  }, []);

  return (
    <DashboardContext.Provider value={{
      data, loading, uploadResult, jobProgress,
      uploadSensorData, generateSOPFromBackend, resetToStatic, loadFarmData
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboardContext must be used within DashboardProvider');
  return ctx;
}

/**
 * Transform backend API response (notebook Cell 6/7 schema) to the
 * frontend data shape that all pages expect.
 *
 * Notebook output keys used here:
 *   current_status.sensors.* / derived.* / risk.risk_probabilities.*
 *   trends.dates / trends.temperature.mean/max/min / trends.egg_production.*
 *   feed_optimization.dates / predicted_daily_feed_kg / actual_daily_feed_kg / summary.*
 *   profitability_report.revenue.* / costs.* / ai_value.*
 *   noise_reduction_viz["Temperature (°C)"].timestamps / ground_truth
 *   sop_context.farm_profile.* / current_conditions.* / ai_predictions.*
 *   generated_sop.feeding_plan.feed_per_bird_g / total_feed_kg / schedule
 */
function n(v, fb = 0) { const x = Number(v); return v != null && Number.isFinite(x) ? x : fb; }

function transformBackendData(bd) {
  // ── current_status (notebook: sensors.*) ──
  const cs       = bd.current_status         || {};
  const sens     = cs.sensors                || {};
  const derRaw   = cs.derived                || {};
  const riskRaw  = cs.risk                   || {};

  // ── sop_context (notebook: farm_profile.*, ai_predictions.*) ──
  const sopCtx   = bd.sop_context            || {};
  const sopFarm  = sopCtx.farm_profile       || {};
  const sopCC    = sopCtx.current_conditions || {};
  const sopAP    = sopCtx.ai_predictions     || sopCtx.model_predictions || {};
  const sopL24   = sopCtx.last_24h_summary   || {};

  const temp    = n(sens.temperature_C  ?? sopCC.temperature_C,  28);
  const humid   = n(sens.humidity_pct   ?? sopCC.humidity_pct,   65);
  const nh3val  = n(sens.nh3_ppm        ?? sopCC.nh3_ppm,        10);
  const co2val  = n(sens.co2_ppm        ?? sopCC.co2_ppm,       800);
  const light   = n(sens.light_lux,     100);
  const water   = n(sens.water_liters,   30);
  const birdWt  = n(sens.bird_weight_kg,  2);
  const feedWt  = n(sens.feed_weight_kg,  0);
  const thi     = n(derRaw.thi ?? riskRaw.thi, n(sopCC.thi_index, 72));

  const riskPR  = riskRaw.risk_probabilities || riskRaw.probabilities || {};
  const riskProbs = {
    normal:   n(riskPR.normal   ?? riskPR['0'], 0.8),
    mild:     n(riskPR.mild     ?? riskPR['1'], 0.15),
    moderate: n(riskPR.moderate ?? riskPR['2'], 0.04),
    severe:   n(riskPR.severe   ?? riskPR['3'], 0.01),
  };
  const heatLvl = n(riskRaw.heat_stress_level, thi >= 84 ? 3 : thi >= 78 ? 2 : thi >= 72 ? 1 : 0);
  const heatLbl = riskRaw.heat_stress_label || ['Normal','Mild','Moderate','Severe'][Math.min(heatLvl,3)];

  // ── noise_reduction_viz (notebook: keyed by label) ──
  const noise    = bd.noise_reduction_viz    || {};
  const tempKey  = Object.keys(noise).find(k => k.toLowerCase().includes('temp'));
  const humKey   = Object.keys(noise).find(k => k.toLowerCase().includes('humid'));
  const tempViz  = (tempKey && noise[tempKey]) ? noise[tempKey] : noise;
  const humViz   = (humKey  && noise[humKey])  ? noise[humKey]  : {};
  const tsArr    = tempViz.timestamps   || [];
  const gtArr    = tempViz.ground_truth || tempViz.filtered_clean || noise.ground_truth || [];
  const humArr   = humViz.ground_truth  || humViz.filtered_clean  || [];
  const timeSeries = tsArr.map((ts, i) => ({
    timestamp:   ts,
    time:        new Date(ts).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false}),
    ts:          new Date(ts).getTime(),
    temperature: gtArr[i]  ?? null,
    humidity:    humArr[i] ?? null,
  }));

  // ── trends (notebook has top-level dates[]) ──
  const trends   = bd.trends                 || {};
  const tempT    = trends.temperature        || {};
  const humT     = trends.humidity           || {};
  const tDates   = trends.dates || tempT.dates || humT.dates || [];
  const dailyTrends = tDates.map((date, i) => ({
    date,
    temp_mean:     tempT.mean?.[i]        ?? null,
    temp_max:      tempT.max?.[i]         ?? null,
    temp_min:      tempT.min?.[i]         ?? null,
    humidity_mean: humT.mean?.[i]         ?? null,
    humidity_max:  humT.max?.[i]          ?? null,
    humidity_min:  humT.min?.[i]          ?? null,
    nh3_mean:      trends.nh3_mean?.[i]   ?? null,
    co2_mean:      trends.co2_mean?.[i]   ?? null,
  }));

  // ── feed_optimization (notebook: dates[] + predicted_daily_feed_kg[]) ──
  const feed     = bd.feed_optimization      || {};
  const fDates   = feed.dates || feed.predicted_vs_actual?.dates || [];
  const fPred    = feed.predicted_daily_feed_kg || feed.predicted_vs_actual?.predicted_feed || [];
  const fAct     = feed.actual_daily_feed_kg    || feed.predicted_vs_actual?.actual_feed    || [];
  const feedData = fDates.map((date, i) => ({ date, predicted: fPred[i]??null, actual: fAct[i]??null }));

  // ── generated_sop (notebook Cell 7: feed_per_bird_g) ──
  const sop      = bd.generated_sop          || {};
  const sopFP    = sop.feeding_plan          || {};
  const feedPerBird = n(sopFP.feed_per_bird_g ?? sopFP.per_bird_grams, 115);
  const feedTotal   = n(sopFP.total_feed_kg   ?? sopFP.total_daily_feed_kg, feedPerBird * 5000 / 1000);

  // ── profitability (notebook: revenue/costs/ai_value) ──
  const profit   = bd.profitability_report   || {};
  const profRev  = profit.revenue            || {};
  const profCost = profit.costs              || {};
  const profAI   = profit.ai_value           || {};
  const profSum  = profit.summary            || {};
  const profBrk  = profit.breakdown          || {};
  const days     = parseInt(profit.period?.replace(' days','') || profSum.period_days || 90, 10);
  const totRev   = n(profRev.total_revenue   ?? profSum.total_revenue,   0);
  const totFeed  = n(profCost.total_feed_cost ?? profSum.total_feed_cost, 0);
  // sum from trends egg_production (notebook key: 'predicted', old: 'predicted_eggs')
  const trendEggArr = (bd.trends?.egg_production?.predicted || bd.trends?.egg_production?.predicted_eggs || []);
  const trendEggTotal = trendEggArr.reduce((s, v) => s + (v || 0), 0);
  const totEggs  = n(profRev.total_eggs ?? profSum.total_eggs, trendEggTotal);
  const totAI    = n(profAI.total_ai_savings  ?? profSum.total_ai_savings, 0);
  const totProf  = n(profSum.total_profit, totRev - totFeed);
  const labor    = n(profBrk.labor_cost, days * 50);
  const utils    = n(profBrk.utilities,  days * 30);

  const alerts   = Array.isArray(bd.alerts) ? bd.alerts : (bd.alerts?.alerts || []);

  return {
    current_status: {
      timestamp: cs.timestamp || cs.last_updated,
      environment: { temperature_c:temp, humidity_pct:humid, nh3_ppm:nh3val, co2_ppm:co2val,
                     light_lux:light, water_liters:water, bird_weight_kg:birdWt, feed_weight_kg:feedWt },
      derived:    { thi, feed_consumption_rate: n(derRaw.feed_consumption_rate, 0) },
      risk:       { heat_stress_level:heatLvl, heat_stress_label:heatLbl, risk_probabilities:riskProbs },
      optimal_feed: { recommended_kg:feedTotal, per_bird_g:feedPerBird },
    },
    farm: {
      name:           sopFarm.location || sopCtx.farm_id || 'Farm A',
      location:       sopFarm.location || sopCtx.farm_id || 'Farm A',
      flock_size:     n(sopFarm.flock_size    ?? sopCtx.flock_size, 5000),
      bird_age_weeks: n(sopFarm.bird_age_weeks ?? sopCtx.bird_age_weeks, 24),
    },
    predictions: {
      heat_stress_risk:    heatLvl,
      heat_stress_label:   heatLbl,
      predicted_eggs_today: n(sopAP.predicted_eggs_today, 4500),
      optimal_feed_rate:   n(sopAP.optimal_feed_rate, feedPerBird / 1000),
    },
    last_24h: {
      temp_min:       n(sopL24.temp_min, 20),
      temp_max:       n(sopL24.temp_max, 32),
      thi_max:        n(sopL24.thi_max,  thi),
      max_risk_level: n(sopL24.max_risk_level, heatLvl),
      avg_temp:       n(sopL24.avg_temperature ?? ((n(sopL24.temp_min,20)+n(sopL24.temp_max,32))/2), 26),
    },
    production: {
      total_eggs:     totEggs,
      avg_daily_eggs: Math.round(totEggs / Math.max(days, 1)),
    },
    alerts,
    total_alerts: alerts.length,
    profitability: {
      summary: {
        total_revenue: totRev, total_feed_cost: totFeed, total_profit: totProf,
        net_profit: n(profBrk.net_profit, totProf - labor - utils),
        daily_profit: n(profSum.daily_profit, totProf / days),
        roi_percentage: n(profSum.roi_percentage, totFeed > 0 ? (totProf/totFeed)*100 : 0),
        period_days: days, total_eggs: totEggs, total_ai_savings: totAI,
      },
      breakdown: {
        egg_revenue: n(profBrk.egg_revenue ?? profRev.total_revenue, totRev),
        feed_cost:   n(profBrk.feed_cost   ?? totFeed, totFeed),
        labor_cost:  labor, utilities: utils,
        net_profit:  n(profBrk.net_profit, totProf - labor - utils),
      },
      pricing: profit.pricing_model || {},
    },
    generated_sop: sop,
    feedPlan: {
      per_bird_grams: feedPerBird, feed_per_bird_g: feedPerBird,
      total_daily_feed_kg: feedTotal, total_feed_kg: feedTotal,
      schedule: sopFP.schedule || [],
      adjustments: sopFP.adjustments || '',
      savings: feed.summary || {},
    },
    feed_optimization: feed,
    time_series:  timeSeries,
    daily_trends: dailyTrends,
    feed_data:    feedData,
    sop_context:  sopCtx,
    _source: 'backend',
  };
}
