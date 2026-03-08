import React, { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Wind,
  TrendingUp,
  Cpu,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Fleet Overview', icon: LayoutDashboard, description: 'C-Level Command Center' },
  { path: '/turbine/0', label: 'Turbine Deep Dive', icon: Wind, description: 'Engineer View' },
  { path: '/business', label: 'Business Impact', icon: TrendingUp, description: 'Executive View' },
  { path: '/component/gearbox', label: 'Component Analysis', icon: Cpu, description: 'Technician View' },
  { path: '/analytics', label: 'Historical Analytics', icon: BarChart3, description: 'Data Scientist View' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    if (path.startsWith('/turbine')) return currentPath.startsWith('/turbine');
    if (path.startsWith('/component')) return currentPath.startsWith('/component');
    return currentPath === path;
  };

  return (
    <aside
      className="flex flex-col flex-shrink-0 transition-all duration-300 relative z-30"
      style={{
        width: collapsed ? '64px' : '220px',
        backgroundColor: 'var(--color-bg-sidebar)',
        borderRight: '1px solid var(--color-border)',
        minHeight: '100vh',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)', height: '60px' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--color-accent-blue)' }}
        >
          <Zap size={16} color="white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-montserrat font-800 text-sm leading-tight whitespace-nowrap" style={{ color: 'var(--color-text-sidebar)' }}>
              WindGuard
            </div>
            <div className="text-xs whitespace-nowrap" style={{ color: 'var(--color-text-sidebar-secondary)' }}>
              Predictive AI
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-hidden">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className="sidebar-nav-item"
              style={{
                backgroundColor: active ? 'rgba(41, 121, 255, 0.15)' : 'transparent',
                color: active ? 'var(--color-accent-blue)' : 'var(--color-text-sidebar-secondary)',
                borderLeft: active ? '3px solid var(--color-accent-blue)' : '3px solid transparent',
                paddingLeft: active ? '13px' : '16px',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <span className="truncate text-xs font-semibold">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 pb-4" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg transition-all hover:bg-black/5 dark:hover:bg-white/10 min-h-[44px]"
          style={{ color: 'var(--color-text-sidebar-secondary)' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <div className="flex items-center gap-2">
              <ChevronLeft size={16} />
              <span className="text-xs">Collapse</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
