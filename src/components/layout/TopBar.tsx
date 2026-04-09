import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import NotificationPanel, { NotificationBell } from '@/components/features/NotificationPanel';

interface TopBarProps {
  onProfileClick?: () => void;
  onAuthRequired?: () => void;
}

const TopBar = ({ onProfileClick, onAuthRequired }: TopBarProps) => {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-black">T</span>
            </div>
            <span className="font-bold text-base text-foreground tracking-tight">T Apps</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {user ? (
              <NotificationBell onClick={() => setShowNotifications(true)} />
            ) : (
              <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-accent transition-colors"
                onClick={() => setShowNotifications(true)}>
                <span className="text-base">🔔</span>
              </button>
            )}
            <button
              onClick={user ? onProfileClick : onAuthRequired}
              className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden transition-transform hover:scale-105"
            >
              {user ? (
                <div className={`w-full h-full flex items-center justify-center font-bold text-sm text-white ${
                  user.role === 'admin' ? 'bg-gradient-to-br from-red-500 to-orange-500' :
                  user.role === 'developer' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
                  'bg-gradient-to-br from-blue-500 to-indigo-600'
                }`}>
                  {user.username[0].toUpperCase()}
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">?</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      {showNotifications && user && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}
    </>
  );
};

export default TopBar;
