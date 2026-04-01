// ── API keys ──────────────────────────────────────────────────────────
const GROQ_KEY    = import.meta.env.VITE_GROQ_API_KEY || '';
const GEMINI_KEYS = [
  import.meta.env.VITE_GEMINI_API_KEY   || '',
  import.meta.env.VITE_GEMINI_API_KEY_2 || '',
].filter(Boolean);

// ── Groq (primary — OpenAI-compatible, fast & free) ───────────────────
async function callGroq(prompt, maxTokens = 1024) {
  if (!GROQ_KEY) throw new Error('No Groq key');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens:  maxTokens,
    }),
  });
  if (res.status === 429) throw new Error('Groq rate limit');
  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

// ── Gemini (fallback) ─────────────────────────────────────────────────
function getGeminiUrl(key) {
  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
}
async function callGemini(prompt, config = {}) {
  const genConfig = { temperature: 0.3, maxOutputTokens: 1024, topP: 0.8, ...config };
  for (const key of GEMINI_KEYS) {
    try {
      const res = await fetch(getGeminiUrl(key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents:         [{ parts: [{ text: prompt }] }],
          generationConfig: genConfig,
        }),
      });
      if (res.status === 429 || res.status === 403) continue;
      if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
      const result = await res.json();
      return result.candidates[0].content.parts[0].text;
    } catch (err) {
      if (key === GEMINI_KEYS[GEMINI_KEYS.length - 1]) throw err;
    }
  }
  throw new Error('All Gemini keys exhausted');
}

// ── Unified caller: Groq first, Gemini fallback ────────────────────────
async function callAI(prompt, maxTokens = 1024) {
  // 1. Try Groq
  if (GROQ_KEY) {
    try {
      return await callGroq(prompt, maxTokens);
    } catch (err) {
      console.warn('[AI] Groq failed, falling back to Gemini:', err.message);
    }
  }
  // 2. Try Gemini keys
  if (GEMINI_KEYS.length > 0) {
    return await callGemini(prompt, { maxOutputTokens: maxTokens });
  }
  throw new Error('No AI providers available');
}

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

  const hasAI = GROQ_KEY || GEMINI_KEYS.length > 0;
  if (!hasAI) {
    return { success: false, sop: generateFallbackSOP(farmData), generated_at: new Date().toISOString(), model: 'fallback-rules', error: 'No AI key configured' };
  }

  try {
    const sopText = await callAI(prompt, 1500);
    const model = GROQ_KEY ? 'llama-3.3-70b (Groq)' : 'gemini-2.0-flash';
    return { success: true, sop: sopText, generated_at: new Date().toISOString(), model };
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

/**
 * Ask Gemini for page-specific AI insights.
 * @param {string} page - 'dashboard' | 'feeding' | 'environment' | 'production'
 * @param {object} data - The full dashboard data object
 * @returns {Promise<{success: boolean, insights: string, error?: string}>}
 */
export async function askGeminiInsights(page, data) {
  const env = data.current_status?.environment || {};
  const risk = data.current_status?.risk || {};
  const pred = data.predictions || {};
  const farm = data.farm || {};
  const profit = data.profitability || {};
  const sop = data.generated_sop || {};
  const alerts = data.alerts || [];

  const PROMPTS = {
    dashboard: `You are an AI poultry farm consultant. Analyze this farm's overall status and give 5 key actionable insights.

Current: Temp ${env.temperature_c}°C, Humidity ${env.humidity_pct}%, THI ${data.current_status?.derived?.thi}, CO2 ${env.co2_ppm}ppm, NH3 ${env.nh3_ppm}ppm
Risk: ${risk.heat_stress_label || 'Normal'} (Level ${risk.heat_stress_level || 0})
Predicted Eggs: ${pred.predicted_eggs_today || 0}, Feed Rate: ${pred.optimal_feed_rate || 0} kg/bird
Alerts: ${alerts.length} active
Profit: $${sop.estimated_daily_value?.net_profit_usd || 0}/day

Give numbered insights (1-5) with emojis. Max 200 words. Be specific with numbers and actions.`,

    feeding: `You are an AI poultry feeding optimization expert. Analyze and give 5 feeding insights.

Current feed rate: ${pred.optimal_feed_rate || 0} kg/bird
Temperature: ${env.temperature_c}°C (affects appetite)
THI: ${data.current_status?.derived?.thi} (heat stress reduces intake)
Flock: ${farm.flock_size || 5000} birds, Age: ${farm.bird_age_weeks || 0} weeks
Feed schedule: ${JSON.stringify(sop.feeding_plan?.schedule || [])}
FCR: ${sop.expected_outcomes?.expected_fcr || 'N/A'}

Give 5 numbered feeding recommendations with emojis. Include specific gram amounts and timing. Max 200 words.`,

    environment: `You are an AI poultry environment specialist. Analyze environmental conditions and give 5 actionable recommendations.

Temperature: ${env.temperature_c}°C, Humidity: ${env.humidity_pct}%
THI: ${data.current_status?.derived?.thi}, NH3: ${env.nh3_ppm}ppm, CO2: ${env.co2_ppm}ppm
Light: ${env.light_lux || 0} lux, Water: ${env.water_liters || 0}L
Risk Level: ${risk.heat_stress_label || 'Normal'}
Last 24h: ${JSON.stringify(data.last_24h || {})}

Give 5 numbered environment management actions with emojis. Include specific ventilation/cooling actions. Max 200 words.`,

    production: `You are an AI poultry production analyst. Analyze production data and give 5 optimization insights.

Predicted eggs today: ${pred.predicted_eggs_today || 0}
Flock: ${farm.flock_size || 5000} birds, Laying rate: ${((pred.predicted_eggs_today || 0) / (farm.flock_size || 5000) * 100).toFixed(1)}%
Revenue: $${profit.revenue?.total_revenue || sop.estimated_daily_value?.revenue_usd || 0}
Feed cost: $${profit.costs?.total_feed_cost || sop.estimated_daily_value?.feed_cost_usd || 0}
FCR: ${sop.expected_outcomes?.expected_fcr || 'N/A'}
Current risk: ${risk.heat_stress_label || 'Normal'}

Give 5 numbered production optimization insights with emojis. Include specific numbers and dollar values. Max 200 words.`,
  };

  const prompt = PROMPTS[page];
  if (!prompt) return { success: false, insights: '', error: `No prompt for page: ${page}` };

  const hasAI = GROQ_KEY || GEMINI_KEYS.length > 0;
  if (!hasAI) return { success: false, insights: '', error: 'No AI key configured' };

  try {
    const text = await callAI(prompt, 512);
    return { success: true, insights: text };
  } catch (err) {
    return { success: false, insights: '', error: err.message };
  }
}
