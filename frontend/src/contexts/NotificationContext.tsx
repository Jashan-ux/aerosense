import React, { createContext, useContext, useState, useCallback } from 'react';

export type NotificationCategory = 'CRITICAL' | 'WARNING' | 'INFO';

export interface Notification {
  id: string;
  category: NotificationCategory;
  turbineId: string;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: '1', category: 'CRITICAL', turbineId: '0', title: 'Gearbox Overheating', description: 'Gearbox temperature +18\u00B0C above baseline. Immediate inspection required.', timestamp: new Date(Date.now() - 15 * 60000), read: false },
  { id: '2', category: 'CRITICAL', turbineId: '10', title: 'High Failure Probability', description: 'Failure probability reached 78%. RUL estimated at 8 days.', timestamp: new Date(Date.now() - 32 * 60000), read: false },
  { id: '3', category: 'CRITICAL', turbineId: '11', title: 'Vibration Anomaly', description: 'Vibration levels 40% above threshold. Drivetrain inspection needed.', timestamp: new Date(Date.now() - 58 * 60000), read: false },
  { id: '4', category: 'WARNING', turbineId: '13', title: 'Power Efficiency Drop', description: 'Power efficiency declined 12% over last 48 hours.', timestamp: new Date(Date.now() - 2 * 3600000), read: false },
  { id: '5', category: 'WARNING', turbineId: '21', title: 'Drivetrain Deviation', description: 'Drivetrain ratio deviation -1.8% from expected. Monitor closely.', timestamp: new Date(Date.now() - 3 * 3600000), read: false },
  { id: '6', category: 'WARNING', turbineId: '10', title: 'Turbulence Stress', description: 'Turbulence intensity 0.18 exceeds normal threshold of 0.15.', timestamp: new Date(Date.now() - 4 * 3600000), read: true },
  { id: '7', category: 'INFO', turbineId: '13', title: 'Maintenance Completed', description: 'Scheduled maintenance completed successfully. Health score restored to 91.', timestamp: new Date(Date.now() - 6 * 3600000), read: true },
  { id: '8', category: 'INFO', turbineId: 'FLEET', title: 'Model Retrained', description: 'Predictive model retrained with latest sensor data. Accuracy improved to 89% AUC.', timestamp: new Date(Date.now() - 12 * 3600000), read: true },
];

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllRead, dismiss }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
