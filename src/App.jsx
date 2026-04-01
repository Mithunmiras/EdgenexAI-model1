import { Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect, Component } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Feeding from './pages/Feeding';
import SOPPage from './pages/SOPPage';
import Environment from './pages/Environment';
import Production from './pages/Production';
import Alerts from './pages/Alerts';
import NoiseFilter from './pages/NoiseFilter';
import useDashboardData from './hooks/useDashboardData';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h2>
          <p className="text-slate-400 text-sm mb-4">{this.state.error?.message || 'Unknown error'}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500">Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const { data } = useDashboardData();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const alertCount = data?.total_alerts ?? data?.alerts?.length ?? 0;

  // Landing page: no sidebar/header
  const isLanding = location.pathname === '/';

  if (isLanding) {
    return (
      <ErrorBoundary>
        <LandingPage />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Sidebar />
      <div className="lg:pl-64 transition-all duration-300">
        <Header
          alertCount={alertCount}
          darkMode={darkMode}
          toggleDarkMode={() => setDarkMode(d => !d)}
        />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <ErrorBoundary>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/feeding" element={<Feeding />} />
              <Route path="/sop" element={<SOPPage />} />
              <Route path="/environment" element={<Environment />} />
              <Route path="/production" element={<Production />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/noise" element={<NoiseFilter />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
