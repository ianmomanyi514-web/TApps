import { useState, useEffect, useCallback } from 'react';
import { DBApp } from '@/types/database';
import { fetchApprovedApps } from '@/lib/api';
import AppIcon from './AppIcon';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface DBFeaturedBannerProps {
  fallbackApps?: DBApp[];
  filterType?: 'app' | 'game';
}

const DBFeaturedBanner = ({ fallbackApps = [], filterType }: DBFeaturedBannerProps) => {
  const [apps, setApps] = useState<DBApp[]>(fallbackApps);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch featured apps in order, fallback to most-downloaded
    import('@/lib/featuredApi').then(({ fetchFeaturedApps }) =>
      fetchFeaturedApps()
        .then(featured => {
          const filtered = filterType ? featured.filter(a => a.type === filterType) : featured;
          if (filtered.length >= 1) {
            setApps(filtered);
          } else {
            // Fallback: most downloaded
            fetchApprovedApps({ orderBy: 'downloads_count', page: 0, type: filterType })
              .then(data => { if (data.length > 0) setApps(data.slice(0, 5)); })
              .catch(() => {});
          }
        })
        .catch(() => {
          fetchApprovedApps({ orderBy: 'downloads_count', page: 0, type: filterType })
            .then(data => { if (data.length > 0) setApps(data.slice(0, 5)); })
            .catch(() => {});
        })
    ).catch(() => {});
  }, [filterType]);

  const next = useCallback(() => {
    setCurrentIndex(i => (i + 1) % Math.max(apps.length, 1));
  }, [apps.length]);

  useEffect(() => {
    if (apps.length <= 1) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next, apps.length]);

  if (apps.length === 0) return null;

  const app = apps[currentIndex];

  return (
    <div className="px-4 mb-6">
      <div className="relative rounded-2xl overflow-hidden cursor-pointer" style={{ aspectRatio: '16/9' }}
        onClick={() => navigate(`/app/${app.id}`)}>
        {/* Thumbnail or gradient */}
        {app.thumbnail ? (
          <img src={app.thumbnail} alt={app.name} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${app.icon_bg}ee, ${app.icon_bg}77)` }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white/10 font-black text-[120px] select-none">{app.icon}</div>
            </div>
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

        {/* Badge */}
        <div className="absolute top-3 left-3">
          <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-semibold border border-white/20">
            {app.featured ? '⭐ Featured' : '🔥 Popular'}
          </span>
        </div>

        {/* Category badge */}
        <div className="absolute top-3 right-3">
          <span className="bg-black/30 backdrop-blur-sm text-white/80 text-xs px-2.5 py-1 rounded-full font-medium">
            {app.category}
          </span>
        </div>

        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white font-black text-lg leading-tight drop-shadow-md">{app.name}</p>
          <p className="text-white/70 text-xs mt-0.5 font-medium">{app.developer_name}</p>
        </div>

        {/* Dots */}
        {apps.length > 1 && (
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {apps.map((_, i) => (
              <button key={i}
                onClick={e => { e.stopPropagation(); setCurrentIndex(i); }}
                className={cn('h-1.5 rounded-full transition-all duration-300',
                  i === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50')} />
            ))}
          </div>
        )}
      </div>

      {/* App info row */}
      <div className="flex items-center gap-3 mt-3 px-1 cursor-pointer"
        onClick={() => navigate(`/app/${app.id}`)}>
        <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground line-clamp-1">{app.name}</p>
          <p className="text-xs text-muted-foreground">{app.developer_name}</p>
        </div>
        <div className="px-5 py-2 rounded-full text-sm font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
          {app.price === 0 ? 'Free' : `$${app.price}`}
        </div>
      </div>
    </div>
  );
};

export default DBFeaturedBanner;
