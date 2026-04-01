import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Activity, CheckCircle, Zap, TrendingDown, Radio, Droplets } from 'lucide-react';
import noiseViz from '../data/noise_reduction_viz.json';

const SENSORS = [
  { key: 'Temperature (°C)',  label: 'Temperature',  unit: '°C',  color: '#f97316' },
  { key: 'Humidity (%)',      label: 'Humidity',     unit: '%',   color: '#3b82f6' },
  { key: 'Feed Weight (kg)',  label: 'Feed Weight',  unit: 'kg',  color: '#a855f7' },
  { key: 'CO2 (ppm)',         label: 'CO₂',          unit: 'ppm', color: '#eab308' },
  { key: 'NH3 (ppm)',         label: 'NH₃',          unit: 'ppm', color: '#ef4444' },
];

const emi = noiseViz?.emi_summary ?? {};

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 text-xs shadow-xl">
      <p className="text-slate-300 mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400 w-20">{p.name}:</span>
          <span className="text-white font-semibold">
            {p.value != null ? `${Number(p.value).toFixed(2)} ${unit}` : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function NoiseFilter() {
  const [activeSensor, setActiveSensor] = useState(SENSORS[0].key);
  const [showLayers, setShowLayers] = useState({ raw: true, clean: true, truth: true });

  const sensor = SENSORS.find(s => s.key === activeSensor);
  const vizData = noiseViz[activeSensor] ?? {};
  const metrics = vizData.metrics ?? {};

  const chartData = useMemo(() => {
    const ts = vizData.timestamps ?? [];
    const raw = vizData.raw_noisy ?? [];
    const clean = vizData.filtered_clean ?? [];
    const truth = vizData.ground_truth ?? [];
    return ts.map((t, i) => ({
      time: t.slice(5, 16), // "MM-DD HH:mm"
      Raw: raw[i] != null ? +raw[i].toFixed(3) : null,
      Cleaned: clean[i] != null ? +clean[i].toFixed(3) : null,
      'Ground Truth': truth[i] != null ? +truth[i].toFixed(3) : null,
    }));
  }, [activeSensor]);

  const improvementPct = metrics.improvement_pct ?? 0;
  const rawRmse = metrics.raw_rmse ?? 0;
  const cleanRmse = metrics.clean_rmse ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span className="text-3xl">🔬</span> Noise Filtering Analysis
        </h1>
        <p className="text-slate-400 mt-1">
          Raw EMI-corrupted sensor data → Kalman-filtered clean signal vs ground truth
        </p>
      </div>

      {/* EMI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Zap,         label: 'Temp Spikes',    value: emi.temperature_spikes ?? 0, color: 'text-orange-400', bg: 'from-orange-500/10' },
          { icon: Activity,    label: 'Feed Spikes',    value: emi.feed_spikes ?? 0,        color: 'text-purple-400', bg: 'from-purple-500/10' },
          { icon: Radio,       label: 'Total Dropouts', value: emi.total_dropouts ?? 0,     color: 'text-red-400',    bg: 'from-red-500/10'    },
          { icon: Droplets,    label: 'Max Dust Offset',value: `${(emi.max_dust_offset ?? 0).toFixed(3)} kg`, color: 'text-cyan-400', bg: 'from-cyan-500/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`bg-gradient-to-br ${bg} to-slate-800/50 rounded-2xl border border-slate-700/40 p-4`}>
            <Icon size={20} className={`${color} mb-2`} />
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-slate-400 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Sensor Selector */}
      <div className="flex flex-wrap gap-2">
        {SENSORS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSensor(s.key)}
            style={activeSensor === s.key ? { borderColor: s.color, color: s.color, background: `${s.color}18` } : {}}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200
              ${activeSensor === s.key
                ? 'border-current shadow-lg'
                : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 bg-slate-800/40'
              }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* RMSE Metrics Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/60 rounded-2xl border border-red-500/20 p-4 text-center">
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Raw RMSE</p>
          <p className="text-2xl font-bold text-red-400">{rawRmse.toFixed(4)}</p>
          <p className="text-slate-500 text-xs mt-1">{sensor?.unit}</p>
        </div>
        <div className="bg-slate-800/60 rounded-2xl border border-emerald-500/20 p-4 text-center">
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Clean RMSE</p>
          <p className="text-2xl font-bold text-emerald-400">{cleanRmse.toFixed(4)}</p>
          <p className="text-slate-500 text-xs mt-1">{sensor?.unit}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-2xl border border-emerald-500/30 p-4 text-center">
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Improvement</p>
          <p className="text-2xl font-bold text-emerald-300">{improvementPct.toFixed(1)}%</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <TrendingDown size={12} className="text-emerald-400" />
            <span className="text-emerald-400 text-xs">noise reduced</span>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/40 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white font-semibold text-lg">
              {sensor?.label} — Raw vs Filtered vs Ground Truth
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">First 7 days · sampled every 1 hour</p>
          </div>
          {/* Layer toggles */}
          <div className="flex gap-3">
            {[
              { key: 'raw',   label: 'Raw',          color: '#ef4444' },
              { key: 'clean', label: 'Filtered',      color: '#10b981' },
              { key: 'truth', label: 'Ground Truth',  color: '#60a5fa' },
            ].map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setShowLayers(l => ({ ...l, [key]: !l[key] }))}
                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border transition-all"
                style={showLayers[key]
                  ? { borderColor: color, color, background: `${color}15` }
                  : { borderColor: '#334155', color: '#64748b', background: 'transparent' }
                }
              >
                <span className="w-2 h-2 rounded-full" style={{ background: showLayers[key] ? color : '#334155' }} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#64748b', fontSize: 10 }}
              interval={23}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              tickFormatter={v => `${v}${sensor?.unit ?? ''}`}
              width={60}
            />
            <Tooltip content={<CustomTooltip unit={sensor?.unit ?? ''} />} />
            {showLayers.truth && (
              <Line
                type="monotone" dataKey="Ground Truth"
                stroke="#60a5fa" strokeWidth={1.5}
                dot={false} connectNulls
                strokeDasharray="4 2"
              />
            )}
            {showLayers.raw && (
              <Line
                type="monotone" dataKey="Raw"
                stroke="#ef4444" strokeWidth={1}
                dot={false} connectNulls opacity={0.7}
              />
            )}
            {showLayers.clean && (
              <Line
                type="monotone" dataKey="Cleaned"
                stroke="#10b981" strokeWidth={2}
                dot={false} connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Before / After comparison panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/60 rounded-2xl border border-red-500/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <h3 className="text-white font-semibold">Before — Raw Signal Issues</h3>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <Zap size={15} className="text-red-400 mt-0.5 shrink-0" />
              <span><strong className="text-red-300">{emi.temperature_spikes ?? 0}</strong> electromagnetic interference spikes in temperature</span>
            </li>
            <li className="flex items-start gap-2">
              <Zap size={15} className="text-orange-400 mt-0.5 shrink-0" />
              <span><strong className="text-orange-300">{emi.feed_spikes ?? 0}</strong> vibration spikes in feed weight sensor</span>
            </li>
            <li className="flex items-start gap-2">
              <Radio size={15} className="text-red-400 mt-0.5 shrink-0" />
              <span><strong className="text-red-300">{emi.total_dropouts ?? 0}</strong> total sensor dropouts / missing readings</span>
            </li>
            <li className="flex items-start gap-2">
              <Droplets size={15} className="text-yellow-400 mt-0.5 shrink-0" />
              <span>Dust accumulation caused up to <strong className="text-yellow-300">{(emi.max_dust_offset ?? 0).toFixed(3)} kg</strong> offset on load cell</span>
            </li>
            <li className="flex items-center gap-2 mt-3 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
              <span className="text-red-400 font-mono text-xs">RMSE = {rawRmse.toFixed(4)} {sensor?.unit}</span>
            </li>
          </ul>
        </div>

        <div className="bg-slate-800/60 rounded-2xl border border-emerald-500/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <h3 className="text-white font-semibold">After — Kalman Filtered Signal</h3>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle size={15} className="text-emerald-400 mt-0.5 shrink-0" />
              <span>EMI spikes removed via <strong className="text-emerald-300">Z-score outlier detection</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={15} className="text-emerald-400 mt-0.5 shrink-0" />
              <span>Dropouts filled using <strong className="text-emerald-300">forward-fill + cubic interpolation</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={15} className="text-emerald-400 mt-0.5 shrink-0" />
              <span>Vibration noise smoothed with <strong className="text-emerald-300">rolling median filter</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={15} className="text-emerald-400 mt-0.5 shrink-0" />
              <span>Dust drift corrected via <strong className="text-emerald-300">baseline recalibration</strong></span>
            </li>
            <li className="flex items-center gap-2 mt-3 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <span className="text-emerald-400 font-mono text-xs">RMSE = {cleanRmse.toFixed(4)} {sensor?.unit}</span>
              <span className="text-emerald-300 text-xs ml-auto font-bold">↓ {improvementPct.toFixed(1)}% better</span>
            </li>
          </ul>
        </div>
      </div>

      {/* All sensors RMSE table */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/40 p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Activity size={16} className="text-cyan-400" />
          All Sensors — Noise Reduction Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                <th className="text-left py-2 pr-4">Sensor</th>
                <th className="text-right py-2 pr-4">Raw RMSE</th>
                <th className="text-right py-2 pr-4">Clean RMSE</th>
                <th className="text-right py-2">Improvement</th>
              </tr>
            </thead>
            <tbody>
              {SENSORS.map(s => {
                const m = noiseViz[s.key]?.metrics ?? {};
                const imp = m.improvement_pct ?? 0;
                return (
                  <tr key={s.key} className="border-b border-slate-800 hover:bg-slate-700/20 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                        <span className="text-white font-medium">{s.label}</span>
                        <span className="text-slate-500 text-xs">{s.unit}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right text-red-400 font-mono text-xs">
                      {(m.raw_rmse ?? 0).toFixed(4)}
                    </td>
                    <td className="py-3 pr-4 text-right text-emerald-400 font-mono text-xs">
                      {(m.clean_rmse ?? 0).toFixed(4)}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
                        ${imp >= 80 ? 'bg-emerald-500/20 text-emerald-300'
                          : imp >= 50 ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-yellow-500/20 text-yellow-300'}`}>
                        ↓ {imp.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
