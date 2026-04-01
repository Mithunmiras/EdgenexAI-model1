import { Thermometer, Droplets, Egg, DollarSign, Wind, Activity, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useDashboardData from '../hooks/useDashboardData';
import StatCard from '../components/cards/StatCard';
import AlertCard from '../components/cards/AlertCard';
import TimeSeriesChart from '../components/charts/TimeSeriesChart';
import THIMeter from '../components/charts/THIMeter';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatNumber, formatPercent, formatCurrency } from '../utils/formatters';

export default function Dashboard() {
  const { data, loading } = useDashboardData();
  const navigate = useNavigate();

  if (loading || !data) return <LoadingSpinner text="Loading farm data..." />;

  const env = data.current_status.environment;
  const derived = data.current_status.derived;
  const risk = data.current_status.risk || {};
  const pred = data.predictions || {};
  const profit = data.profitability || {};
  const alerts = data.alerts || [];
  const sop = data.generated_sop || {};

  const dailyProfit = sop.estimated_daily_value?.net_profit_usd ?? 0;
  const predictedEggs = Math.round(pred.predicted_eggs_today || 0);
  const temp = env.temperature_c ?? 0;
  const humid = env.humidity_pct ?? 0;
  const nh3 = env.nh3_ppm ?? 0;
  const co2Val = env.co2_ppm ?? 0;
  const stressLevel = risk.heat_stress_level ?? 0;
  const riskProbs = risk.risk_probabilities || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard Overview</h1>
        <p className="text-sm text-slate-400 mt-1">
          Farm: {data.farm?.location || 'NCHU Taiwan'} · Flock: {(data.farm?.flock_size || 5000).toLocaleString()} birds · Last: {data.current_status?.timestamp ? new Date(data.current_status.timestamp).toLocaleString() : '—'}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Thermometer} label="Temperature" value={formatNumber(temp)} unit="°C"
          trend={temp > 28 ? temp - 28 : null}
          trendLabel={temp > 32 ? '⚠️ HIGH' : temp > 28 ? '⚠️ Warm' : '✅ Normal'}
          color={temp > 32 ? 'red' : temp > 28 ? 'amber' : 'emerald'} delay={0} />
        <StatCard icon={Droplets} label="Humidity" value={formatNumber(humid)} unit="%"
          trendLabel={humid > 85 ? '⚠️ High' : '✅ Normal'} color="blue" delay={100} />
        <StatCard icon={Egg} label="Predicted Eggs" value={predictedEggs.toLocaleString()}
          trendLabel={`${((predictedEggs / (data.farm?.flock_size || 5000)) * 100).toFixed(1)}% rate`} trend={1} color="emerald" delay={200} />
        <StatCard icon={DollarSign} label="Daily Profit" value={formatCurrency(dailyProfit)}
          trendLabel={`Revenue: ${formatCurrency(sop.estimated_daily_value?.revenue_usd)}`}
          trend={dailyProfit > 0 ? 1 : -1} color="cyan" delay={300} />
      </div>

      {/* Farm Status Banner */}
      <div className={`relative overflow-hidden rounded-2xl border p-6 transition-all duration-500 animate-slide-up ${
        stressLevel === 0 ? 'bg-gradient-to-r from-emerald-500/15 to-cyan-500/10 border-emerald-500/30'
        : stressLevel === 1 ? 'bg-gradient-to-r from-yellow-500/15 to-amber-500/10 border-yellow-500/30'
        : 'bg-gradient-to-r from-red-500/15 to-orange-500/10 border-red-500/30'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-3 h-3 rounded-full ${stressLevel === 0 ? 'bg-emerald-400 animate-pulse' : stressLevel === 1 ? 'bg-yellow-400' : 'bg-red-400 animate-pulse'}`} />
          <span className={`text-sm font-bold uppercase tracking-wider ${stressLevel === 0 ? 'text-emerald-400' : stressLevel === 1 ? 'text-yellow-400' : 'text-red-400'}`}>
            Farm Status: {risk.heat_stress_label || 'Normal'}
          </span>
        </div>
        <p className="text-lg sm:text-xl font-bold text-white mb-2">
          {stressLevel === 0 ? '✅ Normal Conditions — Feed at optimal rate' : stressLevel === 1 ? '⚠️ Mild Heat Stress — Monitor and adjust' : '🚨 Elevated Heat Stress — Activate cooling'}
        </p>
        <p className="text-sm text-slate-300 mb-4">
          THI: {(derived.thi ?? 0).toFixed(1)} · Optimal feed: {(pred.optimal_feed_rate ?? 0).toFixed(2)} kg/bird · Normal probability: {((riskProbs.normal ?? 0) * 100).toFixed(1)}%
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/sop')} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl text-sm font-medium transition-colors">📋 View SOP</button>
          <button onClick={() => navigate('/feeding')} className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors">🍽️ Feeding Plan</button>
          <button onClick={() => navigate('/environment')} className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors">🌡️ Environment</button>
        </div>
      </div>

      {/* Charts & THI */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TimeSeriesChart data={data.time_series} title="📈 Temperature Trends (Hourly)" />
        <THIMeter value={derived.thi} />
      </div>

      {/* Extra Sensor Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wind} label="Ammonia (NH₃)" value={formatNumber(nh3)} unit="ppm"
          color={nh3 > 25 ? 'orange' : 'purple'} trendLabel={nh3 > 25 ? '⚠️ High' : '✅ Normal'} delay={400} />
        <StatCard icon={Activity} label="Feed Weight" value={formatNumber(env.feed_weight_kg ?? 0, 0)} unit="kg"
          color="orange" trendLabel="In hopper" delay={500} />
        <StatCard icon={Droplets} label="Water" value={formatNumber(env.water_liters ?? 0)} unit="L"
          color="blue" trendLabel="Consumed" delay={600} />
        <StatCard icon={Zap} label="CO₂" value={formatNumber(co2Val, 0)} unit="ppm"
          color={co2Val > 2000 ? 'red' : 'amber'} trendLabel={co2Val > 2000 ? '⚠️ High' : '✅ Normal'} delay={700} />
      </div>

      {/* Profitability */}
      <div className="glass-card p-5 animate-slide-up">
        <h3 className="text-sm font-semibold text-white mb-4">💰 {profit.period || '90 days'} Profitability Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Total Revenue</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency((profit.revenue || {}).total_revenue)}</p>
            <p className="text-xs text-slate-500">{((profit.revenue || {}).total_eggs || 0).toLocaleString()} eggs</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Feed Cost</p>
            <p className="text-xl font-bold text-red-400">{formatCurrency((profit.costs || {}).total_feed_cost)}</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">AI Savings</p>
            <p className="text-xl font-bold text-cyan-400">{formatCurrency((profit.ai_value || {}).total_ai_savings)}</p>
            <p className="text-xs text-slate-500">{formatCurrency((profit.ai_value || {}).monthly_ai_value)}/mo</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Net Profit</p>
            <p className="text-xl font-bold text-white">{formatCurrency(((profit.revenue || {}).total_revenue || 0) - ((profit.costs || {}).total_feed_cost || 0))}</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="glass-card p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">🚨 Active Alerts ({alerts.length})</h3>
            <button onClick={() => navigate('/alerts')} className="text-xs text-emerald-400 hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {alerts.slice(0, 3).map((a, i) => (
              <AlertCard key={i} alert={a} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Risk Probabilities */}
      <div className="glass-card p-5 animate-slide-up">
        <h3 className="text-sm font-semibold text-white mb-4">📊 Heat Stress Risk Probabilities</h3>
        <div className="space-y-3">
          {Object.entries(riskProbs).map(([level, prob]) => {
            const colorMap = { normal: '#10B981', mild: '#FBBF24', moderate: '#F97316', severe: '#DC2626' };
            return (
              <div key={level}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 capitalize">{level}</span>
                  <span className="text-white font-semibold">{((prob ?? 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.max((prob ?? 0) * 100, 0.5)}%`, backgroundColor: colorMap[level] || '#94A3B8' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
