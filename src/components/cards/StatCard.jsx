import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ icon: Icon, label, value, unit, trend, trendLabel, color = 'emerald', delay = 0 }) {
  const colorMap = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
    red: 'from-red-500/20 to-red-500/5 border-red-500/20 text-red-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
    orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/20 text-orange-400',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
  };

  const iconColorMap = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
    cyan: 'text-cyan-400',
  };

  const isTrendUp = trend > 0;
  const isTrendDown = trend < 0;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${colorMap[color]} p-5 hover:scale-[1.02] transition-all duration-300 animate-slide-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold text-white">
            {value}
            {unit && <span className="text-base font-normal text-slate-400 ml-1">{unit}</span>}
          </p>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl bg-white/5 ${iconColorMap[color]}`}>
            <Icon size={22} />
          </div>
        )}
      </div>

      {(trend != null || trendLabel) && (
        <div className="flex items-center gap-1.5 mt-3">
          {isTrendUp && <TrendingUp size={14} className="text-emerald-400" />}
          {isTrendDown && <TrendingDown size={14} className="text-red-400" />}
          {!isTrendUp && !isTrendDown && <Minus size={14} className="text-slate-500" />}
          <span className={`text-xs font-medium ${isTrendUp ? 'text-emerald-400' : isTrendDown ? 'text-red-400' : 'text-slate-500'}`}>
            {trendLabel || `${trend > 0 ? '+' : ''}${typeof trend === 'number' ? trend.toFixed(1) : trend}`}
          </span>
        </div>
      )}

      {/* Decorative gradient orb */}
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-gradient-to-br ${colorMap[color]} opacity-20 blur-xl`} />
    </div>
  );
}
