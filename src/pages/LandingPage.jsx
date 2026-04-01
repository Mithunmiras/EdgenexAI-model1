import { useState } from 'react';
import { Building2, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboardContext } from '../hooks/DashboardContext';

const FARMS = [
  { id: 'farm_a', name: 'Farm A', location: 'NCHU Taiwan', flock: 5000, status: 'Active', dataReady: true },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { loadFarmData, loading } = useDashboardContext();
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [farmLoading, setFarmLoading] = useState(false);

  const handleFarmSelect = async (farm) => {
    setSelectedFarm(farm.id);
    setFarmLoading(true);
    try {
      await loadFarmData(farm.id);
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to load farm:', err);
      setFarmLoading(false);
      setSelectedFarm(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/3 rounded-full blur-3xl" />
      </div>

      {/* Logo & Title */}
      <div className="relative z-10 text-center mb-12 animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 mb-6 shadow-2xl shadow-emerald-500/20 font-extrabold text-slate-900 text-3xl tracking-tight">
          EN
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3">
          Edge<span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">NexAI</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-md mx-auto">
          AI-Powered Poultry Farm Management System
        </p>
      </div>

      {/* Farm Select Card */}
      <div className="relative z-10 max-w-md w-full animate-slide-up">

        {/* Select Farm */}
        <div className="relative p-8 rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-xl text-left">
          <div className="w-14 h-14 rounded-xl bg-cyan-500/15 flex items-center justify-center mb-5">
            <Building2 size={28} className="text-cyan-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Select Farm</h2>
          <p className="text-sm text-slate-400 mb-5 leading-relaxed">
            Choose a pre-configured farm with existing sensor data. The system will process and load the dashboard instantly.
          </p>

          {/* Farm list */}
          <div className="space-y-3">
            {FARMS.map((farm) => (
              <button
                key={farm.id}
                onClick={() => handleFarmSelect(farm)}
                disabled={farmLoading}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200
                  ${selectedFarm === farm.id && farmLoading
                    ? 'border-cyan-500/50 bg-cyan-500/10'
                    : 'border-slate-600/50 bg-white/5 hover:border-cyan-500/40 hover:bg-cyan-500/5 hover:scale-[1.01] active:scale-[0.99]'
                  }
                  ${farmLoading && selectedFarm !== farm.id ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedFarm === farm.id && farmLoading ? 'bg-cyan-500/20' : 'bg-slate-700'
                }`}>
                  {selectedFarm === farm.id && farmLoading ? (
                    <Loader2 size={20} className="text-cyan-400 animate-spin" />
                  ) : (
                    <Building2 size={20} className="text-cyan-400" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">{farm.name}</p>
                  <p className="text-xs text-slate-400">{farm.location} · {farm.flock.toLocaleString()} birds</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle size={12} /> Ready
                  </span>
                  <ArrowRight size={14} className="text-slate-500" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-12 text-xs text-slate-600 animate-fade-in" style={{ animationDelay: '500ms' }}>
        EdgeNexAI v2.0 · XGBoost + Gemini AI · Built for Smart Poultry Management
      </p>
    </div>
  );
}
