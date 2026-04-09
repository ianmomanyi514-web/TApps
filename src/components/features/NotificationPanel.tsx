import { Bell, X, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { markNotificationRead } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const typeIcon: Record<string, string> = {
  app_approved: '🎉',
  app_rejected: '❌',
  new_review: '⭐',
  install: '📲',
  success: '✅',
  warning: '⚠️',
  info: '📣',
};

const NotificationPanel = ({ onClose }: { onClose: () => void }) => {
  const { notifications, unreadCount, markAllRead, remove } = useNotifications();

  const handleClick = async (id: string, read: boolean) => {
    if (!read) await markNotificationRead(id);
  };

  return (
    <div className="fixed inset-0 z-[55] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-foreground" />
            <h2 className="font-bold text-lg text-foreground">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs text-primary font-semibold px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors">
                <CheckCheck size={14} />Mark all read
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary hover:bg-accent transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
              <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center mb-4">
                <Bell size={28} className="text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-foreground mb-1">All caught up!</p>
              <p className="text-sm text-muted-foreground">Notifications about your apps and account will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n.id, n.read)}
                  className={cn(
                    'flex items-start gap-3 px-5 py-4 transition-colors cursor-pointer group',
                    !n.read ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-accent/30'
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg',
                    !n.read ? 'bg-primary/15' : 'bg-secondary')}>
                    {typeIcon[n.type] || '📣'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm leading-tight', !n.read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80')}>
                        {n.title}
                      </p>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); remove(n.id); }}
                    className="w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all flex-shrink-0"
                  >
                    <Trash2 size={13} className="text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const NotificationBell = ({ onClick }: { onClick: () => void }) => {
  const { unreadCount } = useNotifications();
  return (
    <button onClick={onClick} className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-accent transition-colors">
      <Bell size={20} className="text-foreground" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 leading-none">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationPanel;
