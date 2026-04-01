import { useState } from 'react';
import { Save } from 'lucide-react';

export default function Settings() {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '');
  const [farmName, setFarmName] = useState('NCHU Research');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">⚙️ Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Farm configuration and API setup</p>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Farm Name</label>
          <input type="text" value={farmName} onChange={e => setFarmName(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Gemini API Key</label>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter your Gemini API key..."
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500" />
          <p className="text-xs text-slate-500 mt-1.5">
            Get your key from{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
              Google AI Studio
            </a>. Stored locally in .env.local as VITE_GEMINI_API_KEY.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors">
            <Save size={16} />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">About</h2>
        <div className="space-y-2 text-sm text-slate-400">
          <p>EdgeNexAI Dashboard v1.0.0</p>
          <p>ML Pipeline: XGBoost models for heat stress, feed optimization, egg production</p>
          <p>Research: National Chung Hsing University (NCHU), Taiwan</p>
          <p>Data: 8 JSON files from ML pipeline (current_status, alerts, feed_optimization, trends, profitability, sop_context, generated_sop, noise_reduction_viz)</p>
        </div>
      </div>
    </div>
  );
}
