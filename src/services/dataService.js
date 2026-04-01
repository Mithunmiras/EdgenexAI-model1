/**
 * EdgeNexAI Data Service — reads the exact schema produced by notebook Cells 5/6/7.
 *
 * Notebook JSON schemas:
 *  current_status.json   : { sensors:{temperature_C,humidity_pct,...}, derived:{thi,...}, risk:{heat_stress_level, risk_probabilities:{normal,mild,moderate,severe}} }
 *  alerts.json           : { alerts:[{timestamp,type,severity,color,message,actions,estimated_savings}], total_alerts }
 *  feed_optimization.json: { dates[], predicted_daily_feed_kg[], actual_daily_feed_kg[], summary:{total_savings_usd,...} }
 *  trends.json           : { dates[], temperature:{mean,max,min}, humidity:{mean,max,min}, nh3_mean[], co2_mean[], risk_trend, egg_production:{dates[],predicted_eggs[]} }
 *  profitability_report  : { period, flock_size, revenue:{total_eggs,total_revenue}, costs:{total_feed_cost}, ai_value:{total_ai_savings,...}, pricing_model }
 *  noise_reduction_viz   : { "Temperature (°C)":{timestamps[],ground_truth[],raw_noisy[],filtered_clean[]}, ... , emi_summary }
 *  sop_context.json      : { farm_profile:{location,flock_size,bird_age_weeks}, current_conditions:{temperature_C,humidity_pct,thi_index,...}, last_24h_summary:{temp_min,temp_max,thi_max,max_risk_level}, ai_predictions:{heat_stress_risk,heat_stress_label,optimal_feed_rate,predicted_eggs_today} }
 *  generated_sop.json    : { feeding_plan:{total_feed_kg,feed_per_bird_g,schedule[]}, expected_outcomes:{expected_eggs,laying_rate_pct,expected_fcr,mortality_risk}, estimated_daily_value:{revenue_usd,feed_cost_usd,ai_savings_usd,net_profit_usd}, monitoring_schedule[], priority_actions[], ventilation_plan, water_plan }
 */

import currentStatusRaw from '../data/current_status.json';
import alertsRaw from '../data/alerts.json';
import feedOptRaw from '../data/feed_optimization.json';
import trendsRaw from '../data/trends.json';
import profitRaw from '../data/profitability_report.json';
import sopContextRaw from '../data/sop_context.json';
import generatedSopRaw from '../data/generated_sop.json';
import noiseVizRaw from '../data/noise_reduction_viz.json';

function n(v, fallback = 0) {
  const num = Number(v);
  return v != null && Number.isFinite(num) ? num : fallback;
}

export function loadDashboardData() {
  // ─────────────────────────────────────────────────────────
  // current_status.json  (notebook schema: sensors.*)
  // ─────────────────────────────────────────────────────────
  const sens    = currentStatusRaw.sensors    || {};   // notebook
  const envRaw  = currentStatusRaw.environment || {};  // old backend fallback
  const derRaw  = currentStatusRaw.derived    || {};
  const riskRaw = currentStatusRaw.risk       || {};

  // sop_context uses farm_profile.* in notebook, flat keys in old backend
  const sopFarm = sopContextRaw.farm_profile       || {};
  const sopCC   = sopContextRaw.current_conditions || {};
  const sopAP   = sopContextRaw.ai_predictions     || sopContextRaw.model_predictions || {};
  const sopL24  = sopContextRaw.last_24h_summary   || {};

  const temp      = n(sens.temperature_C  ?? envRaw.temperature, n(sopCC.temperature_C ?? sopCC.temperature, 28));
  const humid     = n(sens.humidity_pct   ?? envRaw.humidity,    n(sopCC.humidity_pct  ?? sopCC.humidity,    65));
  const nh3       = n(sens.nh3_ppm        ?? envRaw.nh3,         n(sopCC.nh3_ppm       ?? sopCC.nh3,         10));
  const co2val    = n(sens.co2_ppm        ?? envRaw.co2,         n(sopCC.co2_ppm       ?? sopCC.co2,        800));
  const light     = n(sens.light_lux      ?? envRaw.light,       100);
  const water     = n(sens.water_liters   ?? envRaw.water,        30);
  const birdWt    = n(sens.bird_weight_kg ?? envRaw.bird_weight,   2.0);
  const feedWt    = n(sens.feed_weight_kg ?? envRaw.feed_weight,   0);
  const thi       = n(derRaw.thi          ?? riskRaw.thi ?? envRaw.thi, n(sopCC.thi_index ?? sopCC.thi, 72));
  const feedCons  = n(derRaw.feed_consumption_rate, 0);

  // Risk
  const riskProbsRaw = riskRaw.risk_probabilities || riskRaw.probabilities || {};
  const riskProbs = {
    normal:   n(riskProbsRaw.normal   ?? riskProbsRaw['0'], 0.8),
    mild:     n(riskProbsRaw.mild     ?? riskProbsRaw['1'], 0.15),
    moderate: n(riskProbsRaw.moderate ?? riskProbsRaw['2'], 0.04),
    severe:   n(riskProbsRaw.severe   ?? riskProbsRaw['3'], 0.01),
  };
  const heatLevel = n(riskRaw.heat_stress_level,
    thi >= 84 ? 3 : thi >= 78 ? 2 : thi >= 72 ? 1 : 0);
  const heatLabel = riskRaw.heat_stress_label || riskRaw.current_level
    || ['Normal','Mild','Moderate','Severe'][Math.min(heatLevel, 3)];

  // ─────────────────────────────────────────────────────────
  // noise_reduction_viz.json  (notebook: keyed by label)
  // ─────────────────────────────────────────────────────────
  const tempKey  = Object.keys(noiseVizRaw).find(k => k.toLowerCase().includes('temp'));
  const humKey   = Object.keys(noiseVizRaw).find(k => k.toLowerCase().includes('humid'));
  const tempViz  = (tempKey && noiseVizRaw[tempKey]) ? noiseVizRaw[tempKey] : noiseVizRaw;
  const humViz   = (humKey  && noiseVizRaw[humKey])  ? noiseVizRaw[humKey]  : {};

  const tsArr   = tempViz.timestamps  || [];
  const gtArr   = tempViz.ground_truth || tempViz.filtered_clean || noiseVizRaw.ground_truth || [];
  const humArr  = humViz.ground_truth  || humViz.filtered_clean  || [];

  const timeSeries = tsArr.map((ts, i) => ({
    timestamp: ts,
    time: new Date(ts).toLocaleTimeString('en-US',{ hour:'2-digit', minute:'2-digit', hour12:false }),
    ts: new Date(ts).getTime(),
    temperature: gtArr[i]  ?? null,
    humidity:    humArr[i] ?? null,
  }));

  // ─────────────────────────────────────────────────────────
  // trends.json  (same schema in both old and notebook)
  // ─────────────────────────────────────────────────────────
  const tempT    = trendsRaw.temperature || {};
  const humT     = trendsRaw.humidity    || {};
  const eggProd  = trendsRaw.egg_production || {};
  // notebook uses top-level dates[], old backend uses temperature.dates
  const trendDates = trendsRaw.dates || tempT.dates || humT.dates || eggProd.dates || [];
  // egg predictions array — notebook uses 'predicted_eggs', accept 'predicted' as fallback
  const eggPredArr = eggProd.predicted_eggs || eggProd.predicted || [];
  const totalEggsTrends = eggPredArr.reduce((s, v) => s + (v || 0), 0);
  const dailyTrends = trendDates.map((date, i) => ({
    date,
    temp_mean:     tempT.mean?.[i]  ?? null,
    temp_max:      tempT.max?.[i]   ?? null,
    temp_min:      tempT.min?.[i]   ?? null,
    humidity_mean: humT.mean?.[i]   ?? null,
    humidity_max:  humT.max?.[i]    ?? null,
    humidity_min:  humT.min?.[i]    ?? null,
    nh3_mean:      trendsRaw.nh3_mean?.[i] ?? null,
    co2_mean:      trendsRaw.co2_mean?.[i] ?? null,
    predicted_eggs: eggPredArr[i]   ?? null,
  }));

  // ─────────────────────────────────────────────────────────
  // feed_optimization.json  (notebook: dates[] + predicted_daily_feed_kg[])
  // ─────────────────────────────────────────────────────────
  const feedDates   = feedOptRaw.dates || feedOptRaw.predicted_vs_actual?.dates || [];
  const feedPredArr = feedOptRaw.predicted_daily_feed_kg || feedOptRaw.predicted_vs_actual?.predicted_feed || [];
  const feedActArr  = feedOptRaw.actual_daily_feed_kg    || feedOptRaw.predicted_vs_actual?.actual_feed    || [];
  const feedData    = feedDates.map((date, i) => ({
    date,
    predicted: feedPredArr[i] ?? null,
    actual:    feedActArr[i]  ?? null,
  }));

  // ─────────────────────────────────────────────────────────
  // generated_sop.json  (notebook: feeding_plan.feed_per_bird_g / total_feed_kg)
  // ─────────────────────────────────────────────────────────
  const sopFeedPlan = generatedSopRaw.feeding_plan || {};
  const feedPerBird = n(sopFeedPlan.feed_per_bird_g ?? sopFeedPlan.per_bird_grams, 115);
  const feedTotal   = n(sopFeedPlan.total_feed_kg   ?? sopFeedPlan.total_daily_feed_kg, feedPerBird * 5000 / 1000);
  const feedSchedule = sopFeedPlan.schedule || [];

  const feedPlan = {
    per_bird_grams:    feedPerBird,
    feed_per_bird_g:   feedPerBird,
    total_daily_feed_kg: feedTotal,
    total_feed_kg:     feedTotal,
    schedule:          feedSchedule,
    adjustments:       sopFeedPlan.adjustments || '',
    savings:           feedOptRaw.summary || feedOptRaw.savings || {},
  };

  // ─────────────────────────────────────────────────────────
  // profitability_report.json  (notebook: revenue/costs/ai_value)
  // ─────────────────────────────────────────────────────────
  const profRev   = profitRaw.revenue    || {};
  const profCosts = profitRaw.costs      || {};
  const profAI    = profitRaw.ai_value   || {};
  const profSum   = profitRaw.summary    || {};   // old backend fallback
  const profBrk   = profitRaw.breakdown  || {};
  const priceMdl  = profitRaw.pricing_model || profitRaw.pricing || {};

  const totalRevenue   = n(profRev.total_revenue   ?? profSum.total_revenue,   0);
  const totalFeedCost  = n(profCosts.total_feed_cost ?? profSum.total_feed_cost, 0);
  // totalEggs: use profitability if present, else sum from trends egg_production
  const totalEggs      = n(profRev.total_eggs ?? profSum.total_eggs, totalEggsTrends);
  const totalAISavings = n(profAI.total_ai_savings  ?? profSum.total_ai_savings, 0);
  const periodDays     = parseInt(profitRaw.period?.replace(' days','') || profSum.period_days || 90, 10);
  const totalProfit    = n(profSum.total_profit, totalRevenue - totalFeedCost);
  const laborCost      = n(profBrk.labor_cost, periodDays * 50);
  const utilities      = n(profBrk.utilities,  periodDays * 30);

  const profitability = {
    summary: {
      total_revenue:   totalRevenue,
      total_feed_cost: totalFeedCost,
      total_profit:    totalProfit,
      net_profit:      n(profBrk.net_profit ?? profSum.net_profit, totalProfit - laborCost - utilities),
      daily_profit:    n(profSum.daily_profit, totalProfit / periodDays),
      roi_percentage:  n(profSum.roi_percentage, totalFeedCost > 0 ? (totalProfit / totalFeedCost) * 100 : 0),
      period_days:     periodDays,
      total_eggs:      totalEggs,
      total_ai_savings: totalAISavings,
    },
    breakdown: {
      egg_revenue: n(profBrk.egg_revenue ?? profRev.total_revenue, totalRevenue),
      feed_cost:   n(profBrk.feed_cost   ?? totalFeedCost,         totalFeedCost),
      labor_cost:  laborCost,
      utilities:   utilities,
      net_profit:  n(profBrk.net_profit, totalProfit - laborCost - utilities),
    },
    pricing: priceMdl,
  };

  // ─────────────────────────────────────────────────────────
  // alerts
  // ─────────────────────────────────────────────────────────
  const alerts = Array.isArray(alertsRaw) ? alertsRaw : (alertsRaw.alerts || []);

  // ─────────────────────────────────────────────────────────
  // Assemble final data object
  // ─────────────────────────────────────────────────────────
  const data = {
    // ── Current status ──
    current_status: {
      timestamp: currentStatusRaw.timestamp || currentStatusRaw.last_updated,
      environment: {
        temperature_c: temp,
        humidity_pct:  humid,
        nh3_ppm:       nh3,
        co2_ppm:       co2val,
        light_lux:     light,
        water_liters:  water,
        bird_weight_kg: birdWt,
        feed_weight_kg: feedWt,
      },
      derived: { thi, feed_consumption_rate: feedCons },
      risk: { heat_stress_level: heatLevel, heat_stress_label: heatLabel, risk_probabilities: riskProbs },
      optimal_feed: { recommended_kg: feedTotal, per_bird_g: feedPerBird },
    },

    // ── Farm info ──
    farm: {
      name:          sopFarm.location || sopContextRaw.farm_id || 'Farm A',
      location:      sopFarm.location || sopContextRaw.farm_id || 'Farm A',
      flock_size:    n(sopFarm.flock_size    ?? sopContextRaw.flock_size,    5000),
      bird_age_weeks: n(sopFarm.bird_age_weeks ?? sopContextRaw.bird_age_weeks, 24),
    },

    // ── Predictions ──
    predictions: {
      heat_stress_risk:    heatLevel,
      heat_stress_label:   heatLabel,
      predicted_eggs_today: n(sopAP.predicted_eggs_today, 4500),
      optimal_feed_rate:   n(sopAP.optimal_feed_rate, feedPerBird / 1000),
    },

    // ── Last 24h (for Environment page) ──
    last_24h: {
      temp_min:       n(sopL24.temp_min       ?? sopL24.avg_temperature,  20),
      temp_max:       n(sopL24.temp_max       ?? sopL24.max_temperature,  32),
      thi_max:        n(sopL24.thi_max,       72),
      max_risk_level: n(sopL24.max_risk_level, heatLevel),
      avg_temp:       n(sopL24.avg_temperature ?? ((n(sopL24.temp_min,20)+n(sopL24.temp_max,32))/2), 26),
    },

    // ── Production totals (for Production page) ──
    production: {
      total_eggs:    totalEggs,
      avg_daily_eggs: Math.round(totalEggs / Math.max(periodDays, 1)),
    },

    // ── Alerts ──
    alerts,
    total_alerts: alerts.length,

    // ── Profitability ──
    profitability,

    // ── Generated SOP (notebook Cell 7 schema) ──
    generated_sop: generatedSopRaw || {},

    // ── Feed plan (unified from generated_sop.feeding_plan) ──
    feedPlan: feedPlan,

    // ── Feed optimization raw (for Feeding page selects) ──
    feed_optimization: feedOptRaw || {},

    // ── Chart data ──
    time_series:  timeSeries,
    daily_trends: dailyTrends,
    feed_data:    feedData,

    // ── SOP context raw ──
    sop_context: sopContextRaw,
  };

  return data;
}

/** Clear cache — call after uploading new data from the backend */
export function clearCache() {
  cachedData = null;
}

export const getCurrentStatus = d => d?.current_status ?? null;
export const getAlerts         = d => d?.alerts ?? [];
export const getProfitability  = d => d?.profitability ?? {};
export const getFeedData       = d => d?.feed_data ?? [];
export const getDailyTrends    = d => d?.daily_trends ?? [];
