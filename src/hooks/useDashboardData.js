import { useDashboardContext } from './DashboardContext';

export default function useDashboardData() {
  const { data, loading } = useDashboardContext();
  return { data, loading: loading || !data };
}
