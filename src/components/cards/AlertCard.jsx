import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

const levelConfig = {
  WARNING: { icon: AlertTriangle, bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-400' },
  CRITICAL: { icon: AlertCircle, bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400' },
  Moderate: { icon: AlertTriangle, bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-400' },
  MAINTENANCE: { icon: Info, bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-400' },
  INFO: { icon: Info, bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400' },
  HEAT_STRESS_WARNING: { icon: AlertTriangle, bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-400' },
};

export default function AlertCard({ alert, index = 0 }) {
  // Support both old schema (level/action) and new schema (severity/type/actions[])
  const key = alert.level || alert.severity || alert.type || 'INFO';
  const config = levelConfig[key] || levelConfig.INFO;
  const Icon = config.icon;

  const message = alert.message;
  const actionText = alert.action || (alert.actions ? alert.actions.join(' · ') : '');
  const savings = alert.estimated_savings;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${config.bg} animate-slide-up hover:scale-[1.01] transition-transform`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <Icon size={18} className={`${config.text} shrink-0 mt-0.5`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white">{message}</p>
        {actionText && <p className="text-xs text-slate-400 mt-1">{actionText}</p>}
        {savings && <p className="text-xs text-emerald-400 mt-1">💰 {savings}</p>}
        {alert.timestamp && <p className="text-xs text-slate-500 mt-1">{new Date(alert.timestamp).toLocaleString()}</p>}
      </div>
    </div>
  );
}
