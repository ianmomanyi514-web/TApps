import { useState, useCallback } from 'react';
import { DBApp } from '@/types/database';
import { fetchApprovedApps } from '@/lib/api';
import AppIcon from '@/components/features/AppIcon';
import StarRating from '@/components/features/StarRating';
import DBAppDetailModal from '@/components/features/DBAppDetailModal';
import TopBar from '@/components/layout/TopBar';
import { cn } from '@/lib/utils';
import { APP_CATEGORIES, GAME_CATEGORIES } from '@/constants/mockData';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { ChevronLeft } from 'lucide-react';

const ALL_CATEGORIES = [
  ...APP_CATEGORIES.map(c => ({ ...c, label: c.name })),
  ...GAME_CATEGORIES.map(c => ({ ...c, label: c.name })),
];

const CategoriesPage = ({ onAuthRequired }: { onAuthRequired: () => void }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<DBApp | null>(null);
  const [activeType, setActiveType] = useState<'app' | 'game'>('app');

  const fetchFn = useCallback(
    (page: number) => fetchApprovedApps({ category: selectedCategory ?? undefined, page }),
    [selectedCategory]
  );

  const { items: apps, loading, hasMore, sentinelRef } = useInfiniteScroll<DBApp>({ fetchFn });

  const displayedCategories = ALL_CATEGORIES.filter(c => c.type === activeType);

  if (selectedCategory) {
    const catInfo = ALL_CATEGORIES.find(c => c.name === selectedCategory);
    return (
      <div className="min-h-screen bg-background pb-24">
        <TopBar />
        <div className="sticky top-[57px] z-30 bg-white border-b border-border/50 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSelectedCategory(null)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary hover:bg-accent transition-colors flex-shrink-0">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            {catInfo && <span className="text-xl">{catInfo.icon}</span>}
            <h2 className="font-bold text-base text-foreground">{selectedCategory}</h2>
          </div>
        </div>

        <div className="px-4 pt-4">
          {apps.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="text-5xl mb-4">{catInfo?.icon || '📦'}</span>
              <p className="font-semibold text-foreground">No apps in this category yet</p>
              <p className="text-sm text-muted-foreground mt-1">Be the first to submit one!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {apps.map((app, i) => (
                <button key={app.id} onClick={() => setSelectedApp(app)}
                  className="flex items-center gap-3 w-full p-3 hover:bg-accent/50 rounded-2xl transition-colors text-left">
                  <span className="w-7 text-center text-muted-foreground/40 font-black text-sm flex-shrink-0">{i + 1}</span>
                  <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground line-clamp-1">{app.name}</p>
                    <p className="text-xs text-muted-foreground">{app.developer_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StarRating rating={Number(app.avg_rating ?? 0)} size={11} />
                    </div>
                  </div>
                  <div className="px-4 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary flex-shrink-0">
                    {app.price === 0 ? 'Free' : `$${app.price}`}
                  </div>
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="space-y-2 mt-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="w-7 h-4 bg-secondary rounded animate-pulse" />
                  <div className="w-12 h-12 bg-secondary rounded-2xl animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-secondary rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-secondary rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasMore && <div ref={sentinelRef} className="h-4" />}
          {!hasMore && apps.length > 0 && (
            <p className="text-center text-xs text-muted-foreground py-6">All {apps.length} apps shown</p>
          )}
        </div>

        {selectedApp && (
          <DBAppDetailModal app={selectedApp} onClose={() => setSelectedApp(null)} onAuthRequired={onAuthRequired} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <TopBar />

      {/* Type toggle */}
      <div className="sticky top-[57px] z-30 bg-white border-b border-border/50 px-4 py-3">
        <div className="flex rounded-xl bg-secondary p-1 gap-1">
          {(['app', 'game'] as const).map(t => (
            <button key={t} onClick={() => setActiveType(t)}
              className={cn('flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all',
                activeType === t ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {t === 'app' ? '📱 Apps' : '🎮 Games'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        <h2 className="font-bold text-lg text-foreground mb-3">
          {activeType === 'app' ? 'App' : 'Game'} Categories
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {displayedCategories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.name)}
              className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:bg-accent/30 hover:border-primary/30 transition-all text-left group">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: cat.color + '22' }}>
                <span>{cat.icon}</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">{cat.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Browse {cat.name} {activeType === 'app' ? 'apps' : 'games'}</p>
              </div>
              <ChevronLeft size={16} className="text-muted-foreground rotate-180 group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoriesPage;
