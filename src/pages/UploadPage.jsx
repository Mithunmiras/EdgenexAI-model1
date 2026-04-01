import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, BarChart3, ArrowRight, X, Loader2 } from 'lucide-react';
import { useDashboardContext } from '../hooks/DashboardContext';
import { useNavigate } from 'react-router-dom';

const PIPELINE_STEPS = [
  { min: 0,  max: 10,  label: 'Sending file & normalising columns...' },
  { min: 10, max: 30,  label: 'Engineering features (rolling stats, THI)...' },
  { min: 30, max: 50,  label: 'Training Feed Optimiser model...' },
  { min: 50, max: 65,  label: 'Training Egg Production Predictor...' },
  { min: 65, max: 75,  label: 'Training Heat Stress Risk model...' },
  { min: 75, max: 88,  label: 'Generating predictions & dashboard data...' },
  { min: 88, max: 96,  label: 'Generating SOP via AI...' },
  { min: 96, max: 100, label: 'Saving results...' },
];

export default function UploadPage() {
  const { uploadSensorData, loading, uploadResult, jobProgress } = useDashboardContext();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const navigate = useNavigate();

  const progress = jobProgress?.progress ?? 0;
  const currentStep = jobProgress?.step || (loading ? 'Starting...' : '');
  const activeStep = PIPELINE_STEPS.findIndex(s => progress >= s.min && progress < s.max);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please upload a CSV file');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  // Auto-navigate to dashboard 2s after successful upload
  useEffect(() => {
    if (uploadResult?.success) {
      const t = setTimeout(() => navigate('/dashboard'), 2000);
      return () => clearTimeout(t);
    }
  }, [uploadResult, navigate]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setError(null);
    try {
      await uploadSensorData(selectedFile);
    } catch (err) {
      setError(err.message || 'Upload failed — make sure the backend is running on port 5000');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">📤 Upload Sensor Data</h1>
        <p className="text-sm text-slate-400 mt-1">Upload your raw sensor CSV to run ML models and generate fresh dashboard data</p>
      </div>

      {/* Upload Zone */}
      <div
        className={`glass-card p-8 border-2 border-dashed transition-all duration-300 cursor-pointer
          ${dragActive ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]' : 'border-slate-600 hover:border-slate-500'}
          ${loading ? 'opacity-60 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !loading && fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex flex-col items-center gap-4 text-center">
          {loading ? (
            <>
              <Loader2 size={48} className="text-emerald-400 animate-spin" />
              <div>
                <p className="text-lg font-semibold text-white">Processing Sensor Data...</p>
                <p className="text-sm text-slate-400 mt-1">{currentStep || 'Initialising ML pipeline...'}</p>
              </div>
              {/* Real progress bar */}
              <div className="w-full max-w-sm">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{progress}%</span>
                  <span>~2 min</span>
                </div>
                <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              {/* Step list */}
              <div className="w-full max-w-sm text-left space-y-1 mt-2">
                {PIPELINE_STEPS.map((s, i) => {
                  const done = progress > s.max;
                  const active = i === activeStep;
                  return (
                    <div key={i} className={`flex items-center gap-2 text-xs transition-all ${done ? 'text-emerald-400' : active ? 'text-white font-semibold' : 'text-slate-600'}`}>
                      <span>{done ? '✓' : active ? '›' : '○'}</span>
                      <span>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : selectedFile ? (
            <>
              <FileText size={48} className="text-emerald-400" />
              <div>
                <p className="text-lg font-semibold text-white">{selectedFile.name}</p>
                <p className="text-sm text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all"
                >
                  <BarChart3 size={18} />
                  Run ML Models
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleReset(); }}
                  className="flex items-center gap-2 px-4 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors"
                >
                  <X size={18} />
                  Clear
                </button>
              </div>
            </>
          ) : (
            <>
              <Upload size={48} className="text-slate-500" />
              <div>
                <p className="text-lg font-semibold text-white">Drop your sensor CSV here</p>
                <p className="text-sm text-slate-400 mt-1">or click to browse · Supports raw, cleaned, or feature CSV files</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card p-4 border border-red-500/30 bg-red-500/10 animate-slide-up">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-400">Upload Failed</p>
              <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Result */}
      {uploadResult?.success && (
        <div className="glass-card p-6 border border-emerald-500/30 bg-emerald-500/10 animate-slide-up">
          <div className="flex items-start gap-4">
            <CheckCircle size={24} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-lg font-bold text-emerald-400">ML Models Processed Successfully!</p>
              <p className="text-sm text-slate-300 mt-1">{uploadResult.message}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <div className="p-3 rounded-xl bg-white/5">
                  <p className="text-xs text-slate-400">Rows Processed</p>
                  <p className="text-xl font-bold text-white">{(uploadResult.summary?.rows ?? uploadResult.summary?.rows_processed ?? 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5">
                  <p className="text-xs text-slate-400">Days Analyzed</p>
                  <p className="text-xl font-bold text-white">{uploadResult.summary?.days}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5">
                  <p className="text-xs text-slate-400">Predicted Eggs</p>
                  <p className="text-xl font-bold text-emerald-400">{(uploadResult.summary?.total_eggs ?? uploadResult.summary?.total_eggs_predicted ?? 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5">
                  <p className="text-xs text-slate-400">Alerts</p>
                  <p className="text-xl font-bold text-amber-400">{uploadResult.summary?.alerts ?? uploadResult.summary?.alerts_count ?? 0}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3 animate-pulse">Redirecting to dashboard in 2 seconds…</p>

              <div className="flex flex-wrap gap-3 mt-5">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:scale-105 active:scale-95 transition-all text-sm"
                >
                  View Dashboard <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => navigate('/sop')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-xl hover:bg-white/15 transition-colors text-sm"
                >
                  Generate SOP <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expected CSV Format */}
      <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '200ms' }}>
        <h3 className="text-sm font-semibold text-white mb-3">📄 Expected CSV Format</h3>
        <p className="text-xs text-slate-400 mb-3">Your CSV should have a timestamp column and sensor readings. The system auto-detects column names.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-slate-400 border-b border-slate-700">
              <tr>
                <th className="text-left py-2 pr-4">Column</th>
                <th className="text-left py-2 pr-4">Example Names</th>
                <th className="text-left py-2 pr-4">Unit</th>
                <th className="text-left py-2">Required</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {[
                ['Timestamp', 'timestamp, datetime, date', '-', 'Yes'],
                ['Temperature', 'raw_temperature_C, temperature, temp', '°C', 'Yes'],
                ['Humidity', 'raw_humidity_pct, humidity', '%', 'Yes'],
                ['Feed Weight', 'raw_feed_weight_kg, feed_weight', 'kg', 'Recommended'],
                ['Water', 'raw_water_liters, water', 'L', 'Recommended'],
                ['NH₃', 'raw_nh3_ppm, nh3, ammonia', 'ppm', 'Optional'],
                ['CO₂', 'raw_co2_ppm, co2', 'ppm', 'Optional'],
                ['Light', 'raw_light_lux, light', 'lux', 'Optional'],
                ['Bird Weight', 'raw_bird_weight_kg, bird_weight', 'kg', 'Optional'],
                ['Egg Count', 'raw_egg_count, egg_count', 'count', 'Optional'],
              ].map(([col, names, unit, req]) => (
                <tr key={col} className="border-b border-slate-800/50">
                  <td className="py-2 pr-4 font-medium text-white">{col}</td>
                  <td className="py-2 pr-4 font-mono text-emerald-400/80">{names}</td>
                  <td className="py-2 pr-4">{unit}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold
                      ${req === 'Yes' ? 'bg-emerald-500/20 text-emerald-400'
                        : req === 'Recommended' ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-500/20 text-slate-400'}`}>
                      {req}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pipeline Info */}
      <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '300ms' }}>
        <h3 className="text-sm font-semibold text-white mb-3">🔧 ML Pipeline</h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[
            { step: '1', title: 'Upload', desc: 'Raw sensor CSV' },
            { step: '2', title: 'Clean', desc: 'EMI removal + interpolation' },
            { step: '3', title: 'Features', desc: '85 engineered features' },
            { step: '4', title: 'Predict', desc: 'Feed + Egg + Risk models' },
            { step: '5', title: 'Dashboard', desc: 'Live visualizations' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {step}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-[10px] text-slate-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
