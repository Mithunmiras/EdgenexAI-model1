import { Egg, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import useDashboardData from '../hooks/useDashboardData';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatCard from '../components/cards/StatCard';
import GeminiInsights from '../components/common/GeminiInsights';
import { formatCurrency, formatNumber } from '../utils/formatters';

function FinTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-white font-bold">{payload[0]?.payload?.name}</p>
      <p style={{ color: payload[0]?.payload?.color }}>{formatCurrency(payload[0]?.value)}</p>
    </div>
  );
}

export default function Production() {
  const { data, loading } = useDashboardData();

  const revenueData = useMemo(function () {
    var summary = data?.profitability?.summary ?? {};
    return [
      { name: 'Revenue', value: summary.total_revenue ?? 0, color: '#10B981' },
      { name: 'Feed Cost', value: summary.total_feed_cost ?? 0, color: '#EF4444' },
      { name: 'AI Savings', value: (summary.total_profit ?? 0) * 0.1, color: '#06B6D4' },
    ];
  }, [data?.profitability]);

  if (loading || !data) return <LoadingSpinner />;

  const pred = data.predictions ?? {};
  const profit = data.profitability ?? {};
  const sop = data.generated_sop ?? {};
  const farm = data.farm ?? {};
  const summary = profit.summary ?? {};
  const breakdown = profit.breakdown ?? {};
  const periodDays = summary.period_days ?? 90;

  const predictedEggs = Math.round(pred.predicted_eggs_today ?? 0);
  const layingRate = farm.flock_size ? (predictedEggs / farm.flock_size * 100).toFixed(1) : '0.0';

  const mortalityColor = sop.expected_outcomes?.mortality_risk === 'LOW' ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">🥚 Production Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">Egg production performance over {periodDays} days</p>
      </div>

      {/* Gemini AI Insights */}
      <GeminiInsights page="production" data={data} />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Egg} label="Predicted Today" value={predictedEggs.toLocaleString()} color="emerald" trendLabel={layingRate + '% rate'} trend={1} delay={0} />
        <StatCard icon={BarChart3} label="Total Eggs (Period)" value={(data.production?.total_eggs ?? 0).toLocaleString()} color="blue" trendLabel={periodDays + ' days'} delay={100} />
        <StatCard icon={DollarSign} label="Total Revenue" value={formatCurrency(summary.total_revenue)} color="cyan" trendLabel={formatCurrency(summary.daily_profit) + '/day'} delay={200} />
        <StatCard icon={TrendingUp} label="Net Profit" value={formatCurrency(summary.total_profit)} color="emerald" trendLabel={'ROI: ' + (summary.roi_percentage ?? 0) + '%'} delay={300} />
      </div>

      {/* Expected Outcomes from SOP */}
      {sop?.expected_outcomes && (
        <div className="glass-card p-5 animate-slide-up">
          <h3 className="text-sm font-semibold text-white mb-4">📊 Today's Expected Outcomes</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Expected Eggs</p>
              <p className="text-2xl font-bold text-emerald-400">{(sop.expected_outcomes?.expected_eggs_per_day ?? sop.expected_outcomes?.expected_eggs ?? 0).toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Laying Rate</p>
              <p className="text-2xl font-bold text-blue-400">{layingRate}%</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Expected FCR</p>
              <p className="text-2xl font-bold text-white">{sop.expected_outcomes?.expected_fcr ?? 'N/A'}</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Mortality Risk</p>
              <p className={"text-2xl font-bold " + mortalityColor}>{sop.expected_outcomes?.mortality_risk ?? 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Daily Value Breakdown */}
      {sop?.estimated_daily_value && (
        <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h3 className="text-sm font-semibold text-white mb-4">💰 Daily Value Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Revenue</p>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(sop.estimated_daily_value?.revenue_usd)}</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Feed Cost</p>
              <p className="text-xl font-bold text-red-400">{formatCurrency(sop.estimated_daily_value?.feed_cost_usd)}</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">AI Savings</p>
              <p className="text-xl font-bold text-cyan-400">{formatCurrency(sop.estimated_daily_value?.ai_savings_usd)}</p>
            </div>
            <div className="text-center p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <p className="text-xs text-slate-400 mb-1">Net Profit</p>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(sop.estimated_daily_value?.net_profit_usd)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Chart */}
      <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '200ms' }}>
        <h3 className="text-sm font-semibold text-white mb-4">{'📊 ' + periodDays + ' days Financial Overview'}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} stroke="#334155" />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} stroke="#334155" tickFormatter={function (v) { return '$' + (v / 1000).toFixed(0) + 'k'; }} />
            <Tooltip content={FinTooltip} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {revenueData.map(function (entry, i) {
                return <Cell key={i} fill={entry.color} fillOpacity={0.8} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AI Value Proposition */}
      <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '300ms' }}>
        <h3 className="text-sm font-semibold text-white mb-4">🤖 Profitability Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Egg Revenue</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(breakdown.egg_revenue)}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Feed Cost</p>
            <p className="text-xl font-bold text-red-400">{formatCurrency(breakdown.feed_cost)}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Labor + Utilities</p>
            <p className="text-xl font-bold text-yellow-400">{formatCurrency((breakdown.labor_cost ?? 0) + (breakdown.utilities ?? 0))}</p>
          </div>
          <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <p className="text-xs text-slate-400 mb-1">Net Profit</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(breakdown.net_profit)}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-6 text-xs text-slate-400">
          <span>Egg Price: ${profit.pricing?.egg_price_per_unit ?? 0.12}/egg</span>
          <span>Feed Price: ${profit.pricing?.feed_cost_per_kg ?? 0.45}/kg</span>
          <span>Daily Profit: {formatCurrency(summary.daily_profit)}</span>
          <span>ROI: {summary.roi_percentage ?? 0}%</span>
        </div>
      </div>
    </div>
  );
}
