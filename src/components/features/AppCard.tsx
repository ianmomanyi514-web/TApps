import { App } from '@/types/app';
import AppIcon from './AppIcon';
import StarRating from './StarRating';
import { cn } from '@/lib/utils';

interface AppCardProps {
  app: App;
  onClick: (app: App) => void;
  variant?: 'vertical' | 'horizontal';
  rank?: number;
}

const AppCard = ({ app, onClick, variant = 'vertical', rank }: AppCardProps) => {
  if (variant === 'horizontal') {
    return (
      <button
        onClick={() => onClick(app)}
        className="flex items-center gap-3 w-full p-3 hover:bg-accent/50 rounded-xl transition-colors text-left"
      >
        {rank && (
          <span className="text-2xl font-black text-muted-foreground/40 w-6 text-center">{rank}</span>
        )}
        <AppIcon icon={app.icon} iconBg={app.iconBg} name={app.name} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground line-clamp-1">{app.name}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{app.developer}</p>
          <div className="flex items-center gap-2 mt-1">
            <StarRating rating={app.rating} size={11} />
            <span className="text-xs text-muted-foreground">{app.downloads}</span>
          </div>
        </div>
        <InstallButton app={app} compact />
      </button>
    );
  }

  return (
    <button
      onClick={() => onClick(app)}
      className="flex flex-col items-center gap-2 w-[90px] flex-shrink-0 hover:opacity-80 transition-opacity text-center"
    >
      <AppIcon icon={app.icon} iconBg={app.iconBg} name={app.name} size="lg" />
      <p className="text-xs text-foreground font-medium line-clamp-2 w-full leading-tight">{app.name}</p>
      <StarRating rating={app.rating} size={11} />
    </button>
  );
};

interface InstallButtonProps {
  app: App;
  compact?: boolean;
}

export const InstallButton = ({ app, compact = false }: InstallButtonProps) => {
  if (compact) {
    return (
      <div className={cn(
        'flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors',
        app.isInstalled
          ? 'bg-secondary text-secondary-foreground'
          : 'bg-primary/10 text-primary hover:bg-primary/20'
      )}>
        {app.isInstalled ? 'Open' : 'Install'}
      </div>
    );
  }

  return (
    <div className={cn(
      'px-5 py-2 rounded-full text-sm font-semibold transition-colors',
      app.isInstalled
        ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        : 'bg-primary text-primary-foreground hover:bg-primary/90'
    )}>
      {app.isInstalled ? 'Open' : 'Install'}
    </div>
  );
};

export default AppCard;
