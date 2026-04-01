import { useState } from 'react';
import { Sparkles, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import useDashboardData from '../hooks/useDashboardData';
import { useDashboardContext } from '../hooks/DashboardContext';
import useGeminiSOP from '../hooks/useGeminiSOP';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function SOPPage() {
  const { data, loading: dataLoading } = useDashboardData();
  const { generateSOPFromBackend } = useDashboardContext();
  const { sopResult, loading: sopLoading, history, generate } = useGeminiSOP();
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState(null);

  if (dataLoading || !data) return <LoadingSpinner text="Loading farm data..." />;

  const env = data.current_status.environment;
  const sop = data.generated_sop;

  const handleGenerate = async () => {
    setBackendError(null);
    // Try backend first (which calls Gemini server-side), fall back to direct Gemini
    if (data?._source === 'backend') {
      setBackendLoading(true);
      try {
        const result = await generateSOPFromBackend();
        if (result?.sop?.sop_markdown) {
          // Backend returned a Gemini-generated SOP
        }
      } catch (err) {
        setBackendError(err.message);
        // Fall back to client-side Gemini
        generate(data);
      } finally {
        setBackendLoading(false);
      }
    } else {
      generate(data);
    }
  };

  const isLoading = sopLoading || backendLoading;

  // Use pre-generated SOP if no Gemini result yet
  const displaySop = sopResult || (sop?.sop_markdown ? {
    success: true,
    sop: sop.sop_markdown,
    generated_at: sop.generated_at,
    model: sop.generated_by || 'Gemini 1.5 Flash',
  } : sop ? {
    success: true,
    sop: formatPreGeneratedSOP(sop),
    generated_at: sop.generated_at,
    model: sop.generated_by || 'ai-pipeline',
  } : null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">📋 One-Click SOP Generator</h1>
        <p className="text-sm text-slate-400 mt-1">AI-powered daily action instructions</p>
      </div>

      {/* Conditions Summary */}
      <div className="glass-card p-4 animate-slide-up">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Current Conditions (from sensors + AI)</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1.5">🌡️ <span className="text-white font-semibold">{env.temperature_c?.toFixed(1)}°C</span></span>
          <span className="flex items-center gap-1.5">💧 <span className="text-white font-semibold">{env.humidity_pct?.toFixed(1)}%</span></span>
          <span className="flex items-center gap-1.5">🐔 <span className="text-white font-semibold">{data.farm.flock_size?.toLocaleString()} birds</span></span>
          <span className="flex items-center gap-1.5">⚠️ <span className="text-white font-semibold">{data.current_status.risk.heat_stress_label}</span></span>
          <span className="flex items-center gap-1.5">☁️ <span className="text-white font-semibold">{env.nh3_ppm?.toFixed(1)} ppm NH₃</span></span>
          <span className="flex items-center gap-1.5">🌡️ <span className="text-white font-semibold">THI: {data.current_status.derived.thi?.toFixed(1)}</span></span>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-center animate-slide-up" style={{ animationDelay: '100ms' }}>
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className={`relative group flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-bold transition-all duration-300
            ${isLoading
              ? 'bg-slate-700 text-slate-400 cursor-wait'
              : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-105 active:scale-95'
            }`}
        >
          {isLoading ? (
            <>
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              Generating with AI...
            </>
          ) : (
            <>
              <Sparkles size={22} className="group-hover:animate-pulse" />
              Generate Today's SOP (Gemini)
            </>
          )}
        </button>
      </div>
      <p className="text-center text-xs text-slate-500">Click to generate fresh SOP via Gemini AI · Pre-generated SOP shown below</p>

      {/* SOP Display */}
      {displaySop && (
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">📋 Today's Action Instructions</h2>
              <p className="text-xs text-slate-500 mt-1">
                Generated: {new Date(displaySop.generated_at).toLocaleString()} · Source: {displaySop.model}
                {!displaySop.success && <span className="text-amber-400 ml-2">⚠️ Fallback mode</span>}
              </p>
            </div>
            <button
              onClick={() => {
                const blob = new Blob([displaySop.sop], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `SOP_${new Date().toISOString().split('T')[0]}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Download"
            >
              <Download size={16} />
            </button>
          </div>

          <div className="prose prose-invert prose-sm max-w-none">
            {displaySop.sop.split('\n').map((line, i) => {
              if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold text-emerald-400 mt-4 mb-2">{line.replace('### ', '')}</h3>;
              if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-white mt-4 mb-2">{line.replace('## ', '')}</h2>;
              if (line.startsWith('- **')) return <p key={i} className="text-sm text-white ml-4 mb-1">{line.replace('- ', '• ')}</p>;
              if (line.startsWith('- ')) return <p key={i} className="text-sm text-slate-300 ml-4 mb-1">{line.replace('- ', '• ')}</p>;
              if (line.trim() === '') return <div key={i} className="h-2" />;
              return <p key={i} className="text-sm text-slate-300 mb-1">{line}</p>;
            })}
          </div>
        </div>
      )}

      {/* Monitoring Schedule from SOP */}
      {sop?.monitoring_schedule && (
        <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <h3 className="text-sm font-semibold text-white mb-4">📅 Today's Monitoring Schedule</h3>
          <div className="space-y-2">
            {sop.monitoring_schedule.map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 text-sm">
                <span className="text-slate-400 font-mono w-14 shrink-0">{item.time}</span>
                <span className="text-white flex-1">{item.check}</span>
                <span className="text-xs text-slate-500">{item.threshold}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOP History */}
      {history.length > 0 && (
        <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '400ms' }}>
          <h3 className="text-sm font-semibold text-white mb-4">📜 Generation History</h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 text-sm">
                {h.success ? <CheckCircle size={16} className="text-emerald-400 shrink-0" /> : <AlertTriangle size={16} className="text-amber-400 shrink-0" />}
                <span className="text-slate-400">{new Date(h.generated_at).toLocaleString()}</span>
                <span className="text-xs text-slate-500 ml-auto">{h.model}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatPreGeneratedSOP(sop) {
  const lines = [];
  lines.push(`## 🎯 Daily SOP — ${sop.sop_date}`);
  lines.push(`**Risk Level:** ${sop.overall_risk_level}`);
  lines.push(`**Summary:** ${sop.executive_summary}`);
  lines.push('');

  if (sop.priority_actions?.length) {
    lines.push('### 🎯 Priority Actions');
    sop.priority_actions.forEach(a => {
      lines.push(`- **Priority ${a.priority}:** ${a.action}`);
      lines.push(`  - Reason: ${a.reason} · Deadline: ${a.deadline} · Value: $${a.estimated_value_usd}`);
    });
    lines.push('');
  }

  if (sop.feeding_plan) {
    lines.push('### 🍽️ Feeding Plan');
    lines.push(`- **Total:** ${sop.feeding_plan.total_feed_kg} kg (${sop.feeding_plan.feed_per_bird_g}g/bird)`);
    sop.feeding_plan.schedule?.forEach(s => {
      lines.push(`- ${s.time}: ${s.amount_kg} kg — ${s.notes}`);
    });
    lines.push(`- Adjustments: ${sop.feeding_plan.adjustments}`);
    lines.push('');
  }

  if (sop.ventilation_plan) {
    lines.push('### 🌀 Ventilation');
    lines.push(`- Fan Speed: ${sop.ventilation_plan.fan_speed_pct}% · Cooling: ${sop.ventilation_plan.cooling_pad_active ? 'ON' : 'Off'}`);
    sop.ventilation_plan.schedule?.forEach(s => {
      lines.push(`- ${s.time_range}: ${s.fan_speed}%`);
    });
    lines.push('');
  }

  if (sop.water_plan) {
    lines.push('### 💧 Water');
    lines.push(`- Target: ${sop.water_plan.target_ml_per_bird}ml/bird (${sop.water_plan.total_liters}L total) · Additives: ${sop.water_plan.additives}`);
    lines.push('');
  }

  if (sop.expected_outcomes) {
    lines.push('### 📊 Expected Outcomes');
    lines.push(`- Eggs: ${sop.expected_outcomes.expected_eggs} (${sop.expected_outcomes.laying_rate_pct}% rate)`);
    lines.push(`- FCR: ${sop.expected_outcomes.expected_fcr} · Mortality: ${sop.expected_outcomes.mortality_risk}`);
    lines.push('');
  }

  if (sop.estimated_daily_value) {
    lines.push('### 💰 Daily Value');
    lines.push(`- Revenue: $${sop.estimated_daily_value.revenue_usd}`);
    lines.push(`- Feed Cost: $${sop.estimated_daily_value.feed_cost_usd}`);
    lines.push(`- AI Savings: $${sop.estimated_daily_value.ai_savings_usd}`);
    lines.push(`- **Net Profit: $${sop.estimated_daily_value.net_profit_usd}**`);
  }

  return lines.join('\n');
}
