export const COLORS = {
  optimal: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  critical: '#DC2626',
  info: '#3B82F6',
  temperature: '#EF4444',
  humidity: '#3B82F6',
  ammonia: '#8B5CF6',
  co2: '#92400E',
  light: '#F59E0B',
  eggs: '#10B981',
  feed: '#F97316',
  thi_normal: '#10B981',
  thi_mild: '#FBBF24',
  thi_moderate: '#F97316',
  thi_severe: '#DC2626',
};

export const THI_THRESHOLDS = {
  normal: { max: 72, color: COLORS.thi_normal, label: 'Normal' },
  mild: { max: 78, color: COLORS.thi_mild, label: 'Mild Stress' },
  moderate: { max: 84, color: COLORS.thi_moderate, label: 'Moderate' },
  severe: { max: 100, color: COLORS.thi_severe, label: 'Severe' },
};

export const SENSOR_LIMITS = {
  temperature: { min: 18, max: 35, danger: 32, unit: '°C' },
  humidity: { min: 40, max: 90, danger: 85, unit: '%' },
  ammonia: { min: 0, max: 50, danger: 25, unit: 'ppm' },
  co2: { min: 0, max: 2500, danger: 2000, unit: 'ppm' },
  light: { min: 0, max: 100, danger: 80, unit: 'lux' },
};
