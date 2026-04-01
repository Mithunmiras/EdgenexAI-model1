import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { useMemo } from 'react';
import { COLORS } from '../../utils/constants';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-slate-400 mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}°C
        </p>
      ))}
    </div>
  );
};

export default function TimeSeriesChart({ data, title, height = 280 }) {
  // Down-sample for performance (show every 4th point, last 120 points)
  const sampled = useMemo(() => {
    const recent = data?.slice(-120) ?? [];
    return recent.filter((_, i) => i % 4 === 0).map(p => ({
      ...p,
      time: p.timestamp ? new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    }));
  }, [data]);

  return (
    <div className="glass-card p-5 animate-slide-up">
      {title && <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>}

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={sampled} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#94A3B8', fontSize: 10 }}
            stroke="#334155"
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} stroke="#334155" />
          <Tooltip content={<CustomTooltip />} />
          <defs>
            <linearGradient id="tempAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.temperature} stopOpacity={0.3} />
              <stop offset="100%" stopColor={COLORS.temperature} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="temperature"
            stroke={COLORS.temperature}
            fill="url(#tempAreaGrad)"
            strokeWidth={2}
            name="Temperature"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
