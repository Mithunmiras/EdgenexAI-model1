import { Bell, Sun, Moon, Menu } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Utensils, FileText, Thermometer,
  BarChart3, AlertTriangle, Settings, X,
} from 'lucide-react';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/feeding', icon: Utensils, label: 'Feeding' },
  { to: '/sop', icon: FileText, label: 'SOP Generator' },
  { to: '/environment', icon: Thermometer, label: 'Environment' },
  { to: '/production', icon: BarChart3, label: 'Production' },
  { to: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Header({ alertCount = 0, darkMode, toggleDarkMode }) {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 sm:px-6 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileNav(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-400">
            <Menu size={20} />
          </button>
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center font-bold text-slate-900 text-xs lg:hidden">
              EN
            </div>
            <span className="text-sm text-slate-400">Farm: <span className="text-white font-semibold">NCHU Research</span></span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <NavLink to="/alerts" className="relative p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <Bell size={18} />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {alertCount}
              </span>
            )}
          </NavLink>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNav(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-slate-900 border-r border-slate-700 p-4 animate-slide-right">
            <div className="flex items-center justify-between mb-6">
              <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">EdgeNexAI</span>
              <button onClick={() => setMobileNav(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"><X size={18} /></button>
            </div>
            <nav className="space-y-1">
              {links.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setMobileNav(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                    ${isActive ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`
                  }
                >
                  <Icon size={20} />
                  <span className="text-sm font-medium">{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
