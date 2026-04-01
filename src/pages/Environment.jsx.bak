import { Thermometer, Droplets, Wind, Cloud, Sun } from 'lucide-react';
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import useDashboardData from '../hooks/useDashboardData';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatCard from '../components/cards/StatCard';
import THIMeter from '../components/charts/THIMeter';
import { formatNumber } from '../utils/formatters';
import { COLORS } from '../utils/constants';

export default function Environment() {
  const { data, loading } = useDashboardData();

  if (loading || !data) return <LoadingSpinner />;

  const env = data.current_status.environment;
  const derived = data.current_status.derived;
  const risk = data.current_status.risk;
  const last24h = data.last_24h || {};

  const temp = env.temperature_c ?? 0;
  const humid = env.humidity_pct ?? 0;
  const nh3 = env.nh3_ppm ?? 0;
  const co2Val = env.co2_ppm ?? 0;
  const light = env.light_lux ?? 0;

  const sensors = [
    { icon: Thermometer, label: 'Temperature', value: formatNumber(temp), unit: '°C', color: temp > 32 ? 'red' : temp > 28 ? 'amber' : 'emerald', status: temp > 32 ? '⚠️ HIGH' : temp > 28 ? '⚠️ Warm' : '✅ Normal' },
    { icon: Droplets, label: 'Humidity', value: formatNumber(humid), unit: '%', color: humid > 85 ? 'red' : 'blue', status: humid > 85 ? '⚠️ HIGH' : '✅ Normal' },
    { icon: Wind, label: 'NH₃', value: formatNumber(nh3), unit: 'ppm', color: nh3 > 25 ? 'orange' : 'purple', status: nh3 > 25 ? '⚠️ HIGH' : '✅ Normal' },
    { icon: Cloud, label: 'CO₂', value: formatNumber(co2Val, 0), unit: 'ppm', color: co2Val > 2000 ? 'red' : 'amber', status: co2Val > 2000 ? '⚠️ HIGH' : '✅ Normal' },
    { icon: Sun, label: 'Light', value: formatNumber(light, 2), unit: 'lux', color: 'cyan', status: '✅ Normal' },
  ];

  // Daily temperature trends for chart (last 30 days)
  const tempTrendData = useMemo(() => {
    return (data.daily_trends || []).slice(-30).map(d => ({
      date: d.date?.slice(5) ?? '',
      mean: d.temp_mean != null ? +d.temp_mean.toFixed(1) : null,
      max: d.temp_max != null ? +d.temp_max.toFixed(1) : null,
      min: d.temp_min != null ? +d.temp_min.toFixed(1) : null,
    }));
  }, [data.daily_trends]);

  // Daily humidity trends
  const humidityTrendData = useMemo(() => {
    return (data.daily_trends || []).slice(-30).map(d => ({
      date: d.date?.slice(5) ?? '',
      mean: d.humidity_mean != null ? +d.humidity_mean.toFixed(1) : null,
      max: d.humidity_max != null ? +d.humidity_max.toFixed(1) : null,
      min: d.humidity_min != null ? +d.humidity_min.toFixed(1) : null,
    }));
  }, [data.daily_trends]);

  // Hourly temperature from time_series (last 48 points)
  const hourlyData = useMemo(() => {
    return (data.time_series || []).slice(-48).map(p => ({
      time: p.timestamp ? new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      temperature: p.temperature != null ? +p.temperature.toFixed(1) : null,
      humidity: p.humidity != null ? +p.humidity.toFixed(1) : null,
    }));
  }, [data.time_series]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">🌡️ Environmental Monitoring</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time sensor data and environmental trends</p>
      </div>

      {/* Sensor Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {sensors.map((s, i) => (
          <StatCard key={i} icon={s.icon} label={s.label} value={s.value} unit={s.unit} color={s.color} trendLabel={s.status} delay={i * 80} />
        ))}
      </div>

      {/* THI Meter */}
      <THIMeter value={derived.thi} />

      {/* Last 24h Summary */}
      <div className="glass-card p-5 animate-slide-up">
        <h3 className="text-sm font-semibold text-white mb-4">📊 Last 24-Hour Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Temp Range</p>
            <p className="text-lg font-bold text-white">{(last24h.temp_min ?? 0).toFixed(1)}° — {(last24h.temp_max ?? 0).toFixed(1)}°C</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Max THI</p>
            <p className={`text-lg font-bold ${(last24h.thi_max ?? 0) > 78 ? 'text-red-400' : (last24h.thi_max ?? 0) > 72 ? 'text-yellow-400' : 'text-emerald-400'}`}>{(last24h.thi_max ?? 0).toFixed(1)}</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Max Risk Level</p>
            <p className="text-lg font-bold text-white">{last24h.max_risk_level ?? 0}</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Heat Stress</p>
            <p className={`text-lg font-bold ${(risk.heat_stress_level ?? 0) > 1 ? 'text-red-400' : (risk.heat_stress_level ?? 0) === 1 ? 'text-yellow-400' : 'text-emerald-400'}`}>{risk.heat_stress_label ?? 'Normal'}</p>
          </div>
        </div>
      </div>

      {/* Hourly Temperature Chart */}
      {hourlyData.length > 0 && (
        <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h3 className="text-sm font-semibold text-white mb-4">🌡️ Hourly Temperature (Last 48h)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={hourlyData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" tick={{ fill: '#94A3B8', fontSize: 10 }} stroke="#334155" interval={5} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} stroke="#334155" />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl text-xs">
                    <p className="text-white">{payload[0]?.payload?.time}</p>
                    <p style={{ color: COLORS.temperature }}>Temp: {payload[0]?.value}°C</p>
                  </div>
                );
              }} />
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.temperature} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS.temperature} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="temperature" stroke={COLORS.temperature} fill="url(#tempGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Daily Trends */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h3 className="text-sm font-semibold text-white mb-4">📈 Daily Temperature Trend (30d)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={tempTrendData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 10 }} stroke="#334155" />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} stroke="#334155" />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl text-xs">
                    <p className="text-slate-400 mb-1">{d?.date}</p>
                    <p className="text-red-400">Max: {d?.max}°C</p>
                    <p className="text-yellow-400">Mean: {d?.mean}°C</p>
                    <p className="text-blue-400">Min: {d?.min}°C</p>
                  </div>
                );
              }} />
              <Line type="monotone" dataKey="max" stroke="#EF4444" strokeWidth={1.5} dot={false} name="Max" />
              <Line type="monotone" dataKey="mean" stroke="#FBBF24" strokeWidth={2} dot={false} name="Mean" />
              <Line type="monotone" dataKey="min" stroke="#3B82F6" strokeWidth={1.5} dot={false} name="Min" />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {humidityTrendData[0]?.mean != null && (
          <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <h3 className="text-sm font-semibold text-white mb-4">💧 Daily Humidity Trend (30d)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={humidityTrendData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 10 }} stroke="#334155" />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} stroke="#334155" />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl text-xs">
                      <p className="text-slate-400 mb-1">{d?.date}</p>
                      <p className="text-blue-400">Mean: {d?.mean}%</p>
                    </div>
                  );
                }} />
                <Line type="monotone" dataKey="mean" stroke={COLORS.humidity} strokeWidth={2} dot={false} name="Mean Humidity" />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Risk Probabilities */}
      <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '400ms' }}>
        <h3 className="text-sm font-semibold text-white mb-4">⚠️ Current Risk Distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(risk.risk_probabilities || {}).map(([level, prob]) => {
            const colorMap = { normal: 'text-emerald-400', mild: 'text-yellow-400', moderate: 'text-orange-400', severe: 'text-red-400' };
            return (
              <div key={level} className="text-center p-4 bg-white/5 rounded-xl">
                <p className="text-xs text-slate-400 capitalize mb-1">{level}</p>
                <p className={`text-2xl font-bold ${colorMap[level] || 'text-white'}`}>{((prob ?? 0) * 100).toFixed(1)}%</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
