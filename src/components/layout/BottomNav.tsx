import { Gamepad2, Grid3X3, Search, User, Code2, Shield, BarChart2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isDeveloper = user?.role === 'developer';

  const tabs = isAdmin
    ? [
        { id: 'apps', label: 'Apps', icon: Grid3X3 },
        { id: 'topcharts', label: 'Charts', icon: BarChart2 },
        { id: 'categories', label: 'Categories', icon: Layers },
        { id: 'search', label: 'Search', icon: Search },
        { id: 'admin', label: 'Admin', icon: Shield },
      ]
    : [
        { id: 'games', label: 'Games', icon: Gamepad2 },
        { id: 'apps', label: 'Apps', icon: Grid3X3 },
        { id: 'topcharts', label: 'Charts', icon: BarChart2 },
        { id: 'categories', label: 'Categories', icon: Layers },
        { id: 'search', label: 'Search', icon: Search },
        {
          id: 'profile',
          label: isDeveloper ? 'Dev Portal' : 'Profile',
          icon: isDeveloper ? Code2 : User,
        },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border max-w-lg mx-auto">
      <div className="flex items-center justify-around py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-2 min-w-0 flex-1 transition-colors duration-200',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'flex items-center justify-center w-10 h-6 rounded-full transition-all duration-200',
                isActive && 'bg-primary/10'
              )}>
                <Icon size={isAdmin ? 18 : 20} strokeWidth={isActive ? 2.5 : 1.8}
                  className={tab.id === 'admin' ? (isActive ? 'text-red-500' : 'text-muted-foreground') : ''} />
              </div>
              <span className={cn(
                'text-[9px] font-medium transition-colors truncate w-full text-center',
                isActive ? 'text-primary font-semibold' : 'text-muted-foreground',
                tab.id === 'admin' && isActive && 'text-red-500'
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
