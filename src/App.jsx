import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Feeding from './pages/Feeding';
import SOPPage from './pages/SOPPage';
import Environment from './pages/Environment';
import Production from './pages/Production';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import useDashboardData from './hooks/useDashboardData';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const { data } = useDashboardData();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const alertCount = data?.total_alerts ?? data?.alerts?.length ?? 0;

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
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/feeding" element={<Feeding />} />
            <Route path="/sop" element={<SOPPage />} />
            <Route path="/environment" element={<Environment />} />
            <Route path="/production" element={<Production />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
