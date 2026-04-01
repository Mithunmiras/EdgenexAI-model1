import currentStatusRaw from '../data/current_status.json';
import alertsRaw from '../data/alerts.json';
import feedOptRaw from '../data/feed_optimization.json';
import trendsRaw from '../data/trends.json';
import profitRaw from '../data/profitability_report.json';
import sopContextRaw from '../data/sop_context.json';
import generatedSopRaw from '../data/generated_sop.json';
import noiseVizRaw from '../data/noise_reduction_viz.json';

let cachedData = null;

// Properly check for null, undefined, and NaN
function validNum(v) {
  return v != null && Number.isFinite(Number(v));
}

export function loadDashboardData() {
  if (cachedData) return cachedData;

  // Merge current_status sensors with sop_context — fix isNaN(null) bug
  const ctx = sopContextRaw.current_conditions;
  const sensors = currentStatusRaw.sensors;

  const temperature = validNum(sensors.temperature_C) ? sensors.temperature_C : ctx.temperature_C;
  const humidity = validNum(sensors.humidity_pct) ? sensors.humidity_pct : ctx.humidity_pct;
  const co2 = validNum(sensors.co2_ppm) ? sensors.co2_ppm : ctx.co2_ppm;
  const birdWeight = validNum(sensors.bird_weight_kg) ? sensors.bird_weight_kg : 1.8;

  // Build unified time_series from noise_reduction_viz (all sensors, hourly)
  const tempViz = noiseVizRaw['Temperature (\u00b0C)'];
  const humidViz = noiseVizRaw['Humidity (%)'];
  const feedViz = noiseVizRaw['Feed Weight (kg)'];
  const co2Viz = noiseVizRaw['CO2 (ppm)'];
  const nh3Viz = noiseVizRaw['NH3 (ppm)'];

  const tsLength = tempViz?.timestamps?.length ?? 0;
  const timeSeries = [];
  for (let i = 0; i < tsLength; i++) {
    timeSeries.push({
      timestamp: tempViz.timestamps[i],
      ts: new Date(tempViz.timestamps[i]).getTime(),
      temperature: tempViz.ground_truth?.[i] ?? null,
      humidity: humidViz?.ground_truth?.[i] ?? null,
      feed_weight: feedViz?.ground_truth?.[i] ?? null,
      co2: co2Viz?.ground_truth?.[i] ?? null,
      nh3: nh3Viz?.ground_truth?.[i] ?? null,
    });
  }

  // Build daily trends from trends.json
  const dailyTrends = trendsRaw.dates.map((date, i) => ({
    date,
    temp_mean: trendsRaw.temperature?.mean?.[i] ?? null,
    temp_max: trendsRaw.temperature?.max?.[i] ?? null,
    temp_min: trendsRaw.temperature?.min?.[i] ?? null,
    humidity_mean: trendsRaw.humidity?.mean?.[i] ?? null,
    humidity_max: trendsRaw.humidity?.max?.[i] ?? null,
    humidity_min: trendsRaw.humidity?.min?.[i] ?? null,
  }));

  // Build feed chart data from feed_optimization.json
  const feedData = feedOptRaw.dates.map((date, i) => ({
    date,
    predicted: feedOptRaw.predicted_daily_feed_kg?.[i] ?? null,
    actual: feedOptRaw.actual_daily_feed_kg?.[i] ?? null,
  }));

  // EMI summary from noise reduction
  const emiSummary = noiseVizRaw.emi_summary ?? {};

  const data = {
    // Current status (merged from multiple sources)
    current_status: {
      timestamp: currentStatusRaw.timestamp,
      environment: {
        temperature_c: temperature,
        humidity_pct: humidity,
        nh3_ppm: sensors.nh3_ppm ?? 0,
        co2_ppm: co2,
        light_lux: sensors.light_lux ?? 0,
        feed_weight_kg: sensors.feed_weight_kg ?? 0,
        water_liters: sensors.water_liters ?? 0,
        bird_weight_kg: birdWeight,
      },
      derived: {
        thi: currentStatusRaw.derived?.thi ?? 0,
        feed_consumption_rate: currentStatusRaw.derived?.feed_consumption_rate ?? 0,
      },
      risk: currentStatusRaw.risk ?? { heat_stress_level: 0, heat_stress_label: 'Normal', risk_probabilities: {} },
      optimal_feed: currentStatusRaw.optimal_feed ?? {},
    },

    // Farm profile
    farm: sopContextRaw.farm_profile ?? { location: 'NCHU Taiwan', flock_size: 5000 },

    // AI predictions from sop_context
    predictions: {
      heat_stress_risk: sopContextRaw.ai_predictions?.heat_stress_risk ?? 0,
      heat_stress_label: sopContextRaw.ai_predictions?.heat_stress_label ?? 'Normal',
      optimal_feed_rate: sopContextRaw.ai_predictions?.optimal_feed_rate ?? 0,
      predicted_eggs_today: sopContextRaw.ai_predictions?.predicted_eggs_today ?? 0,
    },

    // Last 24h summary
    last_24h: sopContextRaw.last_24h_summary ?? {},

    // Alerts
    alerts: alertsRaw.alerts ?? [],
    total_alerts: alertsRaw.total_alerts ?? 0,

    // Profitability
    profitability: profitRaw ?? {},

    // Generated SOP
    generated_sop: generatedSopRaw ?? {},

    // Time series (hourly sensor data — all sensors)
    time_series: timeSeries,

    // Daily trends (90 days)
    daily_trends: dailyTrends,

    // Feed optimization (90 days predicted vs actual)
    feed_data: feedData,

    // EMI / noise summary
    emi_summary: emiSummary,
  };

  cachedData = data;
  return data;
}

export function getCurrentStatus(data) {
  return data?.current_status ?? null;
}

export function getAlerts(data) {
  return data?.alerts ?? [];
}

export function getProfitability(data) {
  return data?.profitability ?? {};
}

export function getFeedData(data) {
  return data?.feed_data ?? [];
}

export function getDailyTrends(data) {
  return data?.daily_trends ?? [];
}
