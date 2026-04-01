import { useState } from 'react';
import { Sparkles, Loader2, X, RefreshCw } from 'lucide-react';
import { askGeminiInsights } from '../../services/geminiService';

export default function GeminiInsights({ page, data }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await askGeminiInsights(page, data);
      if (result.success) {
        setInsights(result.insights);
        setVisible(true);
      } else {
        setError(result.error || 'Failed to generate insights');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Generate Button */}
      {!visible && (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="group flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300
            bg-gradient-to-r from-purple-600 to-pink-600 text-white
            hover:from-purple-500 hover:to-pink-500 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-[1.02]
            active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Analyzing with Gemini...
            </>
          ) : (
            <>
              <Sparkles size={16} className="group-hover:animate-pulse" />
              Enhance with Gemini AI
            </>
          )}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 animate-fade-in">
          {error}
        </div>
      )}

      {/* Insights Panel */}
      {visible && insights && (
        <div className="glass-card p-5 border border-purple-500/20 bg-purple-500/5 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" />
              <h3 className="text-sm font-bold text-purple-400">Gemini AI Insights</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                title="Regenerate"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              </button>
              <button
                onClick={() => { setVisible(false); setInsights(null); }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {insights}
          </div>
          <p className="text-xs text-slate-600 mt-3">Powered by Gemini 2.0 Flash</p>
        </div>
      )}
    </div>
  );
}
