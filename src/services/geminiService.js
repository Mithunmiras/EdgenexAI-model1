const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function generateSOP(farmData) {
  const env = farmData.current_status.environment;
  const risk = farmData.current_status.risk;
  const pred = farmData.predictions;
  const farm = farmData.farm;

  const prompt = `You are an expert poultry farm AI consultant for EdgeNexAI system.
Generate a concise, actionable Daily SOP based on real-time AI analysis.

## CURRENT SENSOR DATA (Live from farm):
- Temperature: ${env.temperature_c?.toFixed(1)}°C
- Humidity: ${env.humidity_pct?.toFixed(1)}%
- Ammonia: ${env.nh3_ppm?.toFixed(1)} ppm
- CO2: ${env.co2_ppm?.toFixed(0)} ppm
- THI (Heat Index): ${farmData.current_status.derived.thi?.toFixed(1)}
- Heat Stress Level: ${risk.heat_stress_label} (Level ${risk.heat_stress_level})
- Flock Size: ${farm.flock_size} birds
- Bird Age: ${farm.bird_age_weeks?.toFixed(1)} weeks

## AI MODEL PREDICTIONS:
- Heat Stress Risk: ${pred.heat_stress_label} (Level ${pred.heat_stress_risk})
- Optimal Feed Rate: ${pred.optimal_feed_rate?.toFixed(2)} kg/bird
- Predicted Eggs Today: ${pred.predicted_eggs_today?.toFixed(0)}
- Last 24h Max THI: ${farmData.last_24h?.thi_max?.toFixed(1)}

## GENERATE THE FOLLOWING:

### 🎯 TODAY'S PRIORITY ACTIONS
### 🍽️ FEEDING INSTRUCTIONS
### 🌀 VENTILATION SETTINGS
### 📊 EXPECTED OUTCOMES
### ⚠️ RISK ALERTS
### 💰 MONEY SUMMARY

FORMAT: Use emojis, specific numbers, dollar values. Under 400 words. Simple English.
Date: ${new Date().toLocaleDateString()}`;

  if (!GEMINI_API_KEY) {
    return { success: false, sop: generateFallbackSOP(farmData), generated_at: new Date().toISOString(), model: 'fallback-rules', error: 'No API key configured' };
  }

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024, topP: 0.8 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const result = await res.json();
    const sopText = result.candidates[0].content.parts[0].text;
    return { success: true, sop: sopText, generated_at: new Date().toISOString(), model: 'gemini-1.5-flash' };
  } catch (err) {
    return { success: false, sop: generateFallbackSOP(farmData), generated_at: new Date().toISOString(), model: 'fallback-rules', error: err.message };
  }
}

function generateFallbackSOP(farmData) {
  const temp = farmData.current_status.environment.temperature_c;
  const flockSize = farmData.farm.flock_size;
  const sop = farmData.generated_sop;

  if (sop) {
    return `## 🎯 TODAY'S PRIORITY ACTIONS (From AI Pipeline)

${sop.executive_summary}

${sop.priority_actions?.map(a => `**Priority ${a.priority}:** ${a.action}\n- Reason: ${a.reason}\n- Deadline: ${a.deadline}\n- Value: $${a.estimated_value_usd}`).join('\n\n')}

### 🍽️ FEEDING PLAN
- **Total Feed:** ${sop.feeding_plan.total_feed_kg} kg (${sop.feeding_plan.feed_per_bird_g}g/bird)
${sop.feeding_plan.schedule.map(s => `- ${s.time}: ${s.amount_kg} kg — ${s.notes}`).join('\n')}

### 🌀 VENTILATION
- Fan Speed: ${sop.ventilation_plan.fan_speed_pct}%
- Cooling Pad: ${sop.ventilation_plan.cooling_pad_active ? 'ACTIVE' : 'Off'}
${sop.ventilation_plan.schedule.map(s => `- ${s.time_range}: ${s.fan_speed}%`).join('\n')}

### 💧 WATER
- Target: ${sop.water_plan.target_ml_per_bird}ml/bird (${sop.water_plan.total_liters}L total)

### 📊 EXPECTED OUTCOMES
- Eggs: ${sop.expected_outcomes.expected_eggs} (${sop.expected_outcomes.laying_rate_pct}% rate)
- FCR: ${sop.expected_outcomes.expected_fcr}
- Mortality Risk: ${sop.expected_outcomes.mortality_risk}

### 💰 DAILY VALUE
- Revenue: $${sop.estimated_daily_value.revenue_usd}
- Feed Cost: $${sop.estimated_daily_value.feed_cost_usd}
- AI Savings: $${sop.estimated_daily_value.ai_savings_usd}
- **Net Profit: $${sop.estimated_daily_value.net_profit_usd}**`;
  }

  let feedAmount = 0.115;
  if (temp > 28) feedAmount *= Math.max(0.6, 1 - 0.03 * (temp - 28));
  const totalFeed = (feedAmount * flockSize).toFixed(1);
  return `## 🎯 TODAY'S PRIORITY ACTIONS (Auto-generated)

### 🍽️ Feeding — ${totalFeed} kg total (${(feedAmount * 1000).toFixed(0)}g/bird)
### 📊 Expected eggs: ~${Math.round(0.93 * flockSize)}
### 💰 Est. profit: $${((Math.round(0.93 * flockSize) * 0.12) - (totalFeed * 0.45)).toFixed(2)}`;
}
