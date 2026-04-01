import { cn } from '../../utils/formatters';

const variants = {
  green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  orange: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  red: 'bg-red-500/15 text-red-400 border-red-500/30',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  gray: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export default function StatusBadge({ color = 'gray', children }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border', variants[color] || variants.gray)}>
      {children}
    </span>
  );
}
