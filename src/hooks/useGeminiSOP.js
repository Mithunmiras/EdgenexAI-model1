import { useState, useCallback } from 'react';
import { generateSOP } from '../services/geminiService';

export default function useGeminiSOP() {
  const [sopResult, setSopResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const generate = useCallback(async (farmData) => {
    setLoading(true);
    try {
      const result = await generateSOP(farmData);
      setSopResult(result);
      setHistory(prev => [result, ...prev].slice(0, 10));
    } catch {
      setSopResult({ success: false, sop: 'Failed to generate SOP.', generated_at: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  }, []);

  return { sopResult, loading, history, generate };
}
