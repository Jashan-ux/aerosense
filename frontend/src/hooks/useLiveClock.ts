import { useState, useEffect } from 'react';

export function useLiveClock(): string {
  const [time, setTime] = useState(() => formatDateTime(new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(formatDateTime(new Date()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return time;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
