import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchNotifications, markAllNotificationsRead, deleteNotification, DBNotification } from '@/lib/api';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchNotifications(user.id);
      setNotifications(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
    // Poll every 30 seconds
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const remove = async (id: string) => {
    await deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return { notifications, unreadCount, loading, markAllRead, remove, refresh: load };
}
