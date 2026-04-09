import { App } from '@/types/app';
import AppCard from './AppCard';

interface HorizontalAppListProps {
  apps: App[];
  onAppClick: (app: App) => void;
}

const HorizontalAppList = ({ apps, onAppClick }: HorizontalAppListProps) => {
  return (
    <div className="overflow-x-auto scrollbar-hide px-4">
      <div className="flex gap-4 pb-2">
        {apps.map((app) => (
          <AppCard
            key={app.id}
            app={app}
            onClick={onAppClick}
            variant="vertical"
          />
        ))}
      </div>
    </div>
  );
};

export default HorizontalAppList;
