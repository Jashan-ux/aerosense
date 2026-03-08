import React, { useState, useRef } from 'react';
import { Bell, Sun, Moon, Search, X } from 'lucide-react';
import { useLiveClock } from '../../hooks/useLiveClock';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import NotificationCenter from '../notifications/NotificationCenter';
import { useNavigate } from '@tanstack/react-router';
import { useGetAllTurbines } from '../../hooks/useQueries';

export default function TopBar() {
  const clock = useLiveClock();
  const { unreadCount } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: allTurbines } = useGetAllTurbines();
  const turbineList = allTurbines || [];
  const filteredTurbines = searchQuery.length > 0
    ? turbineList.filter(t => t.id.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleTurbineSelect = (id: string) => {
    setSearchQuery('');
    setSearchOpen(false);
    navigate({ to: '/turbine/$id', params: { id } });
  };

  return (
    <header
      className="flex items-center justify-between px-6 py-3 z-40 flex-shrink-0"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderBottom: '1px solid var(--color-border)',
        height: '60px',
      }}
    >
      {/* Left: Live status + clock */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full animate-pulse-live"
            style={{ backgroundColor: '#00C853' }}
          />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#00C853' }}>
            LIVE
          </span>
        </div>
        {/* SCADA replay speed indicator */}
        <div
          className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold"
          style={{ backgroundColor: 'rgba(41, 121, 255, 0.12)', color: 'var(--color-accent-blue)', border: '1px solid rgba(41,121,255,0.25)' }}
          title="SCADA data sampled every 10 minutes. Replayed at 1 record per 10 seconds (60× speed)."
        >
          60× · 10min/10s
        </div>
        <div className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {clock}
        </div>
        <div className="hidden md:flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <span>Last update:</span>
          <span className="font-mono" style={{ color: 'var(--color-accent-blue)' }}>
            {new Date(Date.now() - 2 * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        </div>
      </div>

      {/* Center: Search */}
      <div className="relative flex-1 max-w-xs mx-4" ref={searchRef}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-secondary)' }} />
          <input
            type="text"
            placeholder="Search turbine ID..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            className="w-full pl-8 pr-8 py-2 text-xs rounded-lg outline-none transition-all"
            style={{
              backgroundColor: 'var(--color-bg-app)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <X size={12} />
            </button>
          )}
        </div>
        {searchOpen && filteredTurbines.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl z-50 overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
          >
            {filteredTurbines.slice(0, 8).map(t => {
              const color = t.riskLevel === 'critical' ? '#D50000' : t.riskLevel === 'warning' ? '#FF9100' : '#00C853';
              return (
                <button
                  key={t.id}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5 transition-colors"
                  onClick={() => handleTurbineSelect(t.id)}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>{t.id}</span>
                  <span className="text-xs ml-auto capitalize" style={{ color }}>
                    {t.riskLevel}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-all hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
          style={{ color: 'var(--color-text-secondary)' }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 rounded-lg transition-all hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
            style={{ color: unreadCount > 0 ? '#FF9100' : 'var(--color-text-secondary)' }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
          <NotificationCenter isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>
      </div>
    </header>
  );
}
