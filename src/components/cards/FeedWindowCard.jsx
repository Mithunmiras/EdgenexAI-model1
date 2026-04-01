import { Utensils, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FeedWindowCard({ prediction }) {
  const navigate = useNavigate();
  const isOptimal = prediction?.is_optimal;
  const confidence = prediction?.confidence ?? 0;
  const recommendation = prediction?.recommendation ?? '';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-6 transition-all duration-500 animate-slide-up ${
        isOptimal
          ? 'bg-gradient-to-r from-emerald-500/15 to-cyan-500/10 border-emerald-500/30 animate-glow'
          : 'bg-gradient-to-r from-amber-500/10 to-orange-500/5 border-amber-500/30'
      }`}
    >
      {/* Animated background pulse */}
      {isOptimal && (
        <div className="absolute inset-0 bg-emerald-500/5 animate-pulse-slow" />
      )}

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-3 h-3 rounded-full ${isOptimal ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className={`text-sm font-bold uppercase tracking-wider ${isOptimal ? 'text-emerald-400' : 'text-amber-400'}`}>
            Feed Window Status
          </span>
        </div>

        <p className="text-lg sm:text-xl font-bold text-white mb-2">
          {isOptimal ? '✅ OPTIMAL — Feed now for best FCR' : '⏳ WAIT — Not optimal feeding time'}
        </p>

        <p className="text-sm text-slate-300 mb-4">{recommendation}</p>

        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs text-slate-400">
            Confidence: <span className="text-white font-semibold">{(confidence * 100).toFixed(1)}%</span>
          </span>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => navigate('/sop')}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl text-sm font-medium transition-colors"
            >
              📋 Generate SOP
            </button>
            <button
              onClick={() => navigate('/feeding')}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors"
            >
              🍽️ Feed <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
