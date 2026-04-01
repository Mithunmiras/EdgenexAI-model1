import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import useDashboardData from '../hooks/useDashboardData';
import LoadingSpinner from '../components/common/LoadingSpinner';
import GeminiInsights from '../components/common/GeminiInsights';
import { formatCurrency, formatNumber } from '../utils/formatters';

function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-slate-400 mb-1">{payload[0]?.payload?.date}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {Number(p.value).toFixed(1)} kg</p>
      ))}
    </div>
  );
}

export default function Feeding() {
  const { data, loading } = useDashboardData();

  const feedChartData = useMemo(() => {
    if (!data?.feed_data) return [];
    return data.feed_data.slice(-30).map(d => ({
      date: String(d.date || '').slice(5),
      predicted: d.predicted != null ? +Number(d.predicted).toFixed(1) : null,
      actual: d.actual != null ? +Number(d.actual).toFixed(1) : null,
    }));
  }, [data]);

  if (loading || !data) return <LoadingSpinner text="Calculating optimal feed..." />;

  const sop = data.generated_sop || {};
  const feedPlan = sop.feeding_plan || {};
  const pred = data.predictions || {};
  const farm = data.farm || {};
  const profit = data.profitability || {};
  const feedOpt = data.feed_optimization || {};
  const feedSavings = feedOpt.savings || {};
  const schedule = feedPlan.schedule || feedOpt.recommendation?.feeding_schedule || [];
  const env = data.current_status?.environment || {};
  const derived = data.current_status?.derived || {};

  const feedPerBird = feedPlan.per_bird_grams || feedPlan.feed_per_bird_g || Math.round((pred.optimal_feed_rate || 0) * 1000);
  const totalFeed = feedPlan.total_daily_feed_kg || feedPlan.total_feed_kg || Math.round((pred.optimal_feed_rate || 0) * (farm.flock_size || 5000));
  const expectedFcr = sop.expected_outcomes?.expected_fcr || '—';
  const dailyProfit = sop.estimated_daily_value?.net_profit_usd || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Feeding Optimizer</h1>
        <p className="text-sm text-slate-400 mt-1">AI-calculated optimal feed for {(farm.flock_size || 5000).toLocaleString()} birds</p>
      </div>

      {/* Gemini AI Insights */}
      <GeminiInsights page="feeding" data={data} />

      <div className="glass-card p-6 animate-slide-up bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border-emerald-500/20">
        <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4">AI Feeding Recommendation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-slate-400 mb-1">Feed per Bird</p>
            <p className="text-3xl font-bold text-white">{feedPerBird}<span className="text-base font-normal text-slate-400 ml-1">g/day</span></p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Total Feed</p>
            <p className="text-3xl font-bold text-white">{totalFeed}<span className="text-base font-normal text-slate-400 ml-1">kg</span></p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Expected FCR</p>
            <p className="text-3xl font-bold text-white">{expectedFcr}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-2xl">&#128176;</span>
            <div>
              <p className="text-xs text-slate-400">Daily Profit</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(dailyProfit)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">&#128181;</span>
            <div>
              <p className="text-xs text-slate-400">Feed Savings (AI)</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(feedSavings.daily_savings_usd)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">&#128197;</span>
            <div>
              <p className="text-xs text-slate-400">Monthly AI Value</p>
              <p className="text-lg font-bold text-cyan-400">{formatCurrency(feedSavings.monthly_savings_usd)}</p>
            </div>
          </div>
        </div>
      </div>

      {schedule.length > 0 && (
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Today's Feeding Schedule</h2>
          <div className="space-y-4">
            {schedule.map((slot, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                <div className="text-center shrink-0 w-16">
                  <p className="text-xs text-slate-400">Slot {i + 1}</p>
                  <p className="text-sm font-bold text-white">{slot.time}</p>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold px-2 py-0.5 rounded text-emerald-400 bg-emerald-500/10">FEED</span>
                  <span className="text-sm font-semibold text-white ml-2">{slot.notes}</span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-white">{slot.amount_kg}<span className="text-xs text-slate-400 ml-1">kg</span></p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 pt-3 border-t border-white/10 text-sm">
            <span className="text-slate-400">Total: <span className="text-white font-bold">{totalFeed} kg</span></span>
            <span className="text-slate-400">Adjustment: <span className="text-emerald-400 font-bold">{feedPlan.adjustments || 'Normal'}</span></span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h3 className="text-sm font-semibold text-white mb-4">Daily Feed: Predicted vs Actual (30d)</h3>
          {feedChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={feedChartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 10 }} stroke="#334155" />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} stroke="#334155" domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="predicted" stroke="#3B82F6" strokeWidth={2} dot={false} name="AI Predicted" />
                <Line type="monotone" dataKey="actual" stroke="#10B981" strokeWidth={2} dot={false} name="Actual" />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500 text-center py-10">No feed data available</p>
          )}
        </div>

        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <h3 className="text-sm font-semibold text-white mb-4">Current Feed Metrics</h3>
          <div className="space-y-5">
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Feed Consumption Rate</p>
              <p className="text-2xl font-bold text-white">{(derived.feed_consumption_rate || 0).toFixed(2)} <span className="text-sm text-slate-400">kg/hr</span></p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">AI Predicted Optimal</p>
              <p className="text-2xl font-bold text-emerald-400">{(pred.optimal_feed_rate || 0).toFixed(3)} <span className="text-sm text-slate-400">kg/bird/day</span></p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Feed in Hopper</p>
              <p className="text-2xl font-bold text-orange-400">{formatNumber(env.feed_weight_kg || 0, 0)} <span className="text-sm text-slate-400">kg</span></p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Feed Savings (AI vs Standard)</p>
              <p className="text-2xl font-bold text-cyan-400">{formatCurrency(feedSavings.monthly_savings_usd)} <span className="text-sm text-slate-400">/ month</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}