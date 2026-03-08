import React, { useRef, useEffect } from 'react';
import { Bell, X, CheckCheck, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useNotifications, type Notification } from '../../contexts/NotificationContext';
import { useNavigate } from '@tanstack/react-router';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NotificationItem({ notification, onRead, onDismiss }: {
  notification: Notification;
  onRead: () => void;
  onDismiss: () => void;
}) {
  const navigate = useNavigate();

  const categoryColors = {
    CRITICAL: { border: '#D50000', bg: 'rgba(213,0,0,0.08)', icon: <AlertCircle size={14} style={{ color: '#D50000' }} /> },
    WARNING: { border: '#FF9100', bg: 'rgba(255,145,0,0.08)', icon: <AlertTriangle size={14} style={{ color: '#FF9100' }} /> },
    INFO: { border: '#2979FF', bg: 'rgba(41,121,255,0.08)', icon: <Info size={14} style={{ color: '#2979FF' }} /> },
  };

  const colors = categoryColors[notification.category];

  const handleClick = () => {
    onRead();
    if (notification.turbineId !== 'FLEET') {
      navigate({ to: '/turbine/$id', params: { id: notification.turbineId } });
    }
  };

  return (
    <div
      className="relative flex gap-3 p-3 cursor-pointer transition-all duration-200 hover:opacity-90"
      style={{
        borderLeft: `3px solid ${colors.border}`,
        backgroundColor: notification.read ? 'transparent' : colors.bg,
        borderBottom: '1px solid var(--color-border)',
      }}
      onClick={handleClick}
    >
      <div className="mt-0.5 flex-shrink-0">{colors.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-montserrat font-600 text-xs" style={{ color: colors.border }}>
            {notification.turbineId === 'FLEET' ? 'FLEET' : `T-${notification.turbineId.padStart(2, '0')}`}
          </span>
          <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
            {timeAgo(notification.timestamp)}
          </span>
        </div>
        <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
          {notification.title}
        </p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {notification.description}
        </p>
      </div>
      <button
        className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <X size={12} />
      </button>
      {!notification.read && (
        <div className="absolute top-3 right-8 w-2 h-2 rounded-full" style={{ backgroundColor: colors.border }} />
      )}
    </div>
  );
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllRead, dismiss } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const critical = notifications.filter(n => n.category === 'CRITICAL');
  const warning = notifications.filter(n => n.category === 'WARNING');
  const info = notifications.filter(n => n.category === 'INFO');

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-96 rounded-lg shadow-2xl z-50 animate-slide-in-up overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <Bell size={16} style={{ color: 'var(--color-accent-blue)' }} />
          <span className="font-montserrat font-700 text-sm" style={{ color: 'var(--color-text-primary)' }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold text-white" style={{ backgroundColor: '#D50000' }}>
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors hover:bg-white/10"
              style={{ color: 'var(--color-accent-blue)' }}
              onClick={markAllRead}
            >
              <CheckCheck size={12} />
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
        {notifications.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>
            <Bell size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <>
            {critical.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-montserrat font-700 uppercase tracking-wider" style={{ color: '#D50000', backgroundColor: 'rgba(213,0,0,0.05)' }}>
                  🚨 Critical ({critical.length})
                </div>
                {critical.map(n => (
                  <NotificationItem key={n.id} notification={n} onRead={() => markAsRead(n.id)} onDismiss={() => dismiss(n.id)} />
                ))}
              </div>
            )}
            {warning.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-montserrat font-700 uppercase tracking-wider" style={{ color: '#FF9100', backgroundColor: 'rgba(255,145,0,0.05)' }}>
                  ⚠️ Warning ({warning.length})
                </div>
                {warning.map(n => (
                  <NotificationItem key={n.id} notification={n} onRead={() => markAsRead(n.id)} onDismiss={() => dismiss(n.id)} />
                ))}
              </div>
            )}
            {info.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-montserrat font-700 uppercase tracking-wider" style={{ color: '#2979FF', backgroundColor: 'rgba(41,121,255,0.05)' }}>
                  ℹ️ Info ({info.length})
                </div>
                {info.map(n => (
                  <NotificationItem key={n.id} notification={n} onRead={() => markAsRead(n.id)} onDismiss={() => dismiss(n.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
