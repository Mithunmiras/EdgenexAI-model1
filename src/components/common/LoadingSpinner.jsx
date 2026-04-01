export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
      <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">{text}</p>
    </div>
  );
}
