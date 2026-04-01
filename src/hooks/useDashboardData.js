import { useState, useEffect } from 'react';
import { loadDashboardData } from '../services/dataService';

export default function useDashboardData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const d = loadDashboardData();
      setData(d);
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading };
}
