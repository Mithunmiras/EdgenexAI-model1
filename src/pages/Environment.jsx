import { Thermometer, Droplets, Wind, Cloud, Sun, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import useDashboardData from '../hooks/useDashboardData';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatCard from '../components/cards/StatCard';
import THIMeter from '../components/charts/THIMeter';
import GeminiInsights from '../components/common/GeminiInsights';
import { formatNumber } from '../utils/formatters';
import { COLORS } from '../utils/constants';

function SafeTooltip({ active, payload, type }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  if (type === 'hourly') {
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl text-xs">
        <p className="text-white">{d.time || ''}</p>
        {d.temperature != null && <p style={{ color: '#EF4444' }}>Temp: {d.temperature}°C</p>}
        {d.humidity != null && <p style={{ color: '#3B82F6' }}>Humidity: {d.humidity}%</p>}
      </div>
    );
  }
  if (type === 'tempTrend') {
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl text-xs">
        <p className="text-slate-400 mb-1">{d.date || ''}</p>
        <p className="text-red-400">Max: {d.max ?? '—'}°C</p>
        <p className="text-yellow-400">Mean: {d.mean ?? '—'}°C</p>
        <p className="text-blue-400">Min: {d.min ?? '—'}°C</p>
      </div>
    );
  }
  if (type === 'humidTrend') {
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl text-xs">
        <p className="text-slate-400 mb-1">{d.date || ''}</p>
        <p className="text-blue-400">Mean: {d.mean ?? '—'}%</p>
      </div>
    );
  }
  return null;
}

function safeFixed(val, digits = 1) {
  if (val == null || isNaN(val)) return '—';
  return Number(val).toFixed(digits);
}

export default function Environment() {
  const { data, loading } = useDashboardData();

  if (loading || !data) return <LoadingSpinner />;

  // Safely extract all needed data with fallbacks
  const env = data?.current_status?.environment || {};
  const derived = data?.current_status?.derived || {};
  const risk = data?.current_status?.risk || {};
  const last24h = data?.last_24h || {};

  const temp = Number(env.temperature_c) || 0;
  const humid = Number(env.humidity_pct) || 0;
  const nh3 = Number(env.nh3_ppm) || 0;
  const co2Val = Number(env.co2_ppm) || 0;
  const light = Number(env.light_lux) || 0;
  const thi = Number(derived.thi) || 0;

  const sensors = [
    { icon: Thermometer, label: 'Temperature', value: formatNumber(temp), unit: '°C', color: temp > 32 ? 'red' : temp > 28 ? 'amber' : 'emerald', status: temp > 32 ? '⚠️ HIGH' : temp > 28 ? '⚠️ Warm' : '✅ Normal' },
    { icon: Droplets, label: 'Humidity', value: formatNumber(humid), unit: '%', color: humid > 85 ? 'red' : 'blue', status: humid > 85 ? '⚠️ HIGH' : '✅ Normal' },
    { icon: Wind, label: 'NH₃', value: formatNumber(nh3), unit: 'ppm', color: nh3 > 25 ? 'orange' : 'purple', status: nh3 > 25 ? '⚠️ HIGH' : '✅ Normal' },
    { icon: Cloud, label: 'CO₂', value: formatNumber(co2Val, 0), unit: 'ppm', color: co2Val > 2000 ? 'red' : 'amber', status: co2Val > 2000 ? '⚠️ HIGH' : '✅ Normal' },
    { icon: Sun, label: 'Light', value: formatNumber(light, 2), unit: 'lux', color: 'cyan', status: '✅ Normal' },
  ];

  // Build chart data safely — no useMemo, just plain transforms
  let hourlyData = [];
  try {
    const ts = Array.isArray(data.time_series) ? data.time_series : [];
    hourlyData = ts.slice(-48).map(function (p) {
      let timeStr = '';
      try { timeStr = p.timestamp ? new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''; } catch (e) { timeStr = ''; }
      return {
        time: timeStr,
        temperature: p.temperature != null && !isNaN(p.temperature) ? Math.round(p.temperature * 10) / 10 : null,
        humidity: p.humidity != null && !isNaN(p.humidity) ? Math.round(p.humidity * 10) / 10 : null,
      };
    });
  } catch (e) { hourlyData = []; }

  let tempTrendData = [];
  let humidityTrendData = [];
  try {
    const dt = Array.isArray(data.daily_trends) ? data.daily_trends : [];
    const last30 = dt.slice(-30);
    tempTrendData = last30.map(function (d) {
      return {
        date: d.date ? String(d.date).slice(5) : '',
        mean: d.temp_mean != null && !isNaN(d.temp_mean) ? Math.round(d.temp_mean * 10) / 10 : null,
        max: d.temp_max != null && !isNaN(d.temp_max) ? Math.round(d.temp_max * 10) / 10 : null,
        min: d.temp_min != null && !isNaN(d.temp_min) ? Math.round(d.temp_min * 10) / 10 : null,
      };
    });
    humidityTrendData = last30.map(function (d) {
      return {
        date: d.date ? String(d.date).slice(5) : '',
        mean: d.humidity_mean != null && !isNaN(d.humidity_mean) ? Math.round(d.humidity_mean * 10) / 10 : null,
      };
    });
  } catch (e) { tempTrendData = []; humidityTrendData = []; }

  const hasHumidityData = humidityTrendData.length > 0 && humidityTrendData[0] && humidityTrendData[0].mean != null;
  const riskProbs = risk.risk_probabilities || {};
  const riskEntries = Object.entries(riskProbs);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">🌡️ Environmental Monitoring</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time sensor data and environmental trends</p>
      </div>

      {/* Gemini AI Insights */}
      <GeminiInsights page="environment" data={data} />

      {/* Sensor Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {sensors.map(function (s, i) {
          return <StatCard key={i} icon={s.icon} label={s.label} value={s.value} unit={s.unit} color={s.color} trendLabel={s.status} delay={i * 80} />;
        })}
      </div>

      {/* THI Meter */}
      <THIMeter value={thi} />

      {/* Last 24h Summary */}
      <div className="glass-card p-5 animate-slide-up">
        <h3 className="text-sm font-semibold text-white mb-4">📊 Last 24-Hour Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Temp Range</p>
            <p className="text-lg font-bold text-white">{safeFixed(last24h.temp_min)}° — {safeFixed(last24h.temp_max)}°C</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Max THI</p>
            <p className={'text-lg font-bold ' + (Number(last24h.thi_max || 0) > 78 ? 'text-red-400' : Number(last24h.thi_max || 0) > 72 ? 'text-yellow-400' : 'text-emerald-400')}>
              {safeFixed(last24h.thi_max)}
            </p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Max Risk Level</p>
            <p className="text-lg font-bold text-white">{last24h.max_risk_level != null ? last24h.max_risk_level : 0}</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Heat Stress</p>
            <p className={'text-lg font-bold ' + (Number(risk.heat_stress_level || 0) > 1 ? 'text-red-400' : Number(risk.heat_stress_level || 0) === 1 ? 'text-yellow-400' : 'text-emerald-400')}>
              {risk.heat_stress_label || 'Normal'}
            </p>
          </div>
        </div>
      </div>

      {/* Hourly Temperature Chart */}
      {hourlyData.length > 0 && (
        <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h3 className="text-sm font-semibold text-white mb-4">🌡️ Hourly Temperature & Humidity (Last 48h)</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" tick={{ fill: '#94A3B8', fontSize: 10 }} stroke="#334155" interval={5} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} stroke="#334155" />
                <Tooltip content={function (props) { return <SafeTooltip {...props} type="hourly" />; }} />
                <defs>
                  <linearGradient id="envTempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="temperature" stroke="#EF4444" fill="url(#envTempGrad)" strokeWidth={2} name="Temperature" />
                <Area type="monotone" dataKey="humidity" stroke="#3B82F6" fill="transparent" strokeWidth={1.5} strokeDasharray="4 2" name="Humidity" />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Daily Trends */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {tempTrendData.length > 0 && (
          <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h3 className="text-sm font-semibold text-white mb-4">📈 Daily Temperature Trend (30d)</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tempTrendData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 10 }} stroke="#334155" />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} stroke="#334155" />
                  <Tooltip content={function (props) { return <SafeTooltip {...props} type="tempTrend" />; }} />
                  <Line type="monotone" dataKey="max" stroke="#EF4444" strokeWidth={1.5} dot={false} name="Max" />
                  <Line type="monotone" dataKey="mean" stroke="#FBBF24" strokeWidth={2} dot={false} name="Mean" />
                  <Line type="monotone" dataKey="min" stroke="#3B82F6" strokeWidth={1.5} dot={false} name="Min" />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {hasHumidityData && (
          <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <h3 className="text-sm font-semibold text-white mb-4">💧 Daily Humidity Trend (30d)</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={humidityTrendData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 10 }} stroke="#334155" />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} stroke="#334155" />
                  <Tooltip content={function (props) { return <SafeTooltip {...props} type="humidTrend" />; }} />
                  <Line type="monotone" dataKey="mean" stroke="#3B82F6" strokeWidth={2} dot={false} name="Mean Humidity" />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Risk Probabilities */}
      {riskEntries.length > 0 && (
        <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '400ms' }}>
          <h3 className="text-sm font-semibold text-white mb-4">⚠️ Current Risk Distribution</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {riskEntries.map(function ([level, prob]) {
              var colorMap = { normal: 'text-emerald-400', mild: 'text-yellow-400', moderate: 'text-orange-400', severe: 'text-red-400' };
              var pct = prob != null && !isNaN(prob) ? (Number(prob) * 100).toFixed(1) : '0.0';
              return (
                <div key={level} className="text-center p-4 bg-white/5 rounded-xl">
                  <p className="text-xs text-slate-400 capitalize mb-1">{level}</p>
                  <p className={'text-2xl font-bold ' + (colorMap[level] || 'text-white')}>{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
