import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { COLORS } from '../../utils/constants';

export default function ModelPerformanceBar({ data }) {
  if (!data) return null;

  const items = [];
  if (data.feed_window_classifier) {
    items.push({ name: 'Feed Window Acc', value: +(data.feed_window_classifier.accuracy * 100).toFixed(1), color: COLORS.optimal });
    items.push({ name: 'Feed F1 Score', value: +(data.feed_window_classifier.f1_score * 100).toFixed(1), color: COLORS.info });
  }
  if (data.egg_production) {
    items.push({ name: 'Egg R²', value: +(data.egg_production.r2 * 100).toFixed(1), color: COLORS.eggs });
  }

  return (
    <div className="glass-card p-5 animate-slide-up">
      <h3 className="text-sm font-semibold text-white mb-4">📊 Model Performance</h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">{item.name}</span>
              <span className="text-white font-semibold">{item.value}%</span>
            </div>
            <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${item.value}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
