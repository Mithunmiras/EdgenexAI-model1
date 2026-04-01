import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Utensils, FileText, Thermometer,
  BarChart3, AlertTriangle, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/feeding', icon: Utensils, label: 'Feeding' },
  { to: '/sop', icon: FileText, label: 'SOP Generator' },
  { to: '/environment', icon: Thermometer, label: 'Environment' },
  { to: '/production', icon: BarChart3, label: 'Production' },
  { to: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`hidden lg:flex flex-col fixed top-0 left-0 h-screen z-30
        bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50
        transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-700/50">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center font-extrabold text-slate-900 text-sm shrink-0">
          EN
        </div>
        {!collapsed && (
          <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent truncate animate-fade-in">
            EdgeNexAI
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
              ${isActive
                ? 'bg-emerald-500/15 text-emerald-400 shadow-lg shadow-emerald-500/5'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <Icon size={20} className="shrink-0" />
            {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-center h-12 border-t border-slate-700/50 text-slate-400 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
