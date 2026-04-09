import { useState, useEffect, useCallback } from 'react';
import { App } from '@/types/app';
import AppIcon from './AppIcon';
import { InstallButton } from './AppCard';
import { cn } from '@/lib/utils';

interface FeaturedBannerProps {
  apps: App[];
  onAppClick: (app: App) => void;
}

const FeaturedBanner = ({ apps, onAppClick }: FeaturedBannerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % apps.length);
  }, [apps.length]);

  useEffect(() => {
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next]);

  const app = apps[currentIndex];

  return (
    <div className="px-4 mb-6">
      <div
        className="relative rounded-2xl overflow-hidden cursor-pointer"
        onClick={() => onAppClick(app)}
        style={{ aspectRatio: '16/9' }}
      >
        {/* Banner image */}
        <img
          src={app.featuredBanner}
          alt={app.featuredTitle}
          className="w-full h-full object-cover transition-opacity duration-500"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
        {/* Fallback gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${app.iconBg}dd, ${app.iconBg}88)`,
          }}
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Update badge */}
        <div className="absolute top-3 left-3">
          <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-medium">
            New Release
          </span>
        </div>

        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white font-bold text-base leading-tight mb-3">
            {app.featuredTitle}
          </p>
        </div>

        {/* Dots */}
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {apps.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
              )}
            />
          ))}
        </div>
      </div>

      {/* App info row */}
      <div className="flex items-center gap-3 mt-3 px-1" onClick={() => onAppClick(app)}>
        <AppIcon icon={app.icon} iconBg={app.iconBg} name={app.name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground line-clamp-1">{app.name}</p>
          <p className="text-xs text-muted-foreground">{app.developer}</p>
        </div>
        <InstallButton app={app} compact />
      </div>
    </div>
  );
};

export default FeaturedBanner;
