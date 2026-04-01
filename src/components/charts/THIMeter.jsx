import { COLORS, THI_THRESHOLDS } from '../../utils/constants';

export default function THIMeter({ value, label }) {
  // Normalize THI to 50-100 range for display, handle negative values gracefully
  const displayValue = Math.max(50, Math.min(100, value));
  const percentage = ((displayValue - 50) / 50) * 100;

  let risk = 'Normal';
  let riskColor = COLORS.thi_normal;
  if (value >= 84) { risk = 'Severe'; riskColor = COLORS.thi_severe; }
  else if (value >= 78) { risk = 'Moderate'; riskColor = COLORS.thi_moderate; }
  else if (value >= 72) { risk = 'Mild Stress'; riskColor = COLORS.thi_mild; }

  return (
    <div className="glass-card p-5 animate-slide-up">
      <h3 className="text-sm font-semibold text-white mb-4">🌡️ Temperature-Humidity Index (THI)</h3>

      {/* Gradient bar */}
      <div className="relative h-6 rounded-full overflow-hidden mb-3" style={{
        background: `linear-gradient(to right, ${COLORS.thi_normal}, ${COLORS.thi_mild}, ${COLORS.thi_moderate}, ${COLORS.thi_severe})`
      }}>
        {/* Marker */}
        <div
          className="absolute top-0 w-1 h-full bg-white shadow-lg transition-all duration-1000 ease-out"
          style={{ left: `${Math.max(0, Math.min(100, percentage))}%` }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[10px] text-slate-400 mb-4">
        <span>Normal (&lt;72)</span>
        <span>Mild</span>
        <span>Moderate</span>
        <span>Severe (&gt;84)</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-2xl font-bold text-white">{value?.toFixed(1) ?? '—'}</span>
          <span className="text-sm text-slate-400 ml-1">THI</span>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: `${riskColor}20`, color: riskColor }}>
          {risk}
        </span>
      </div>
    </div>
  );
}
