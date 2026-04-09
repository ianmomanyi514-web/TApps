
import { useState, useEffect, useCallback } from 'react';
import { DBApp } from '@/types/database';
import { fetchApprovedApps } from '@/lib/api';
import AppIcon from '@/components/features/AppIcon';
import StarRating from '@/components/features/StarRating';
import DBAppDetailModal from '@/components/features/DBAppDetailModal';
import TopBar from '@/components/layout/TopBar';
import { cn } from '@/lib/utils';
import { TrendingUp, Star, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FILTER_TABS = [
  { id: 'downloads_count', label: 'Top Free', icon: TrendingUp },
  { id: 'avg_rating', label: 'Top Rated', icon: Star },
  { id: 'created_at', label: 'New', icon: Clock },
] as const;

type OrderBy = 'downloads_count' | 'avg_rating' | 'created_at';

const TopChartsPage = ({ onAuthRequired }: { onAuthRequired: () => void }) => {
  const [apps, setApps] = useState<DBApp[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [orderBy, setOrderBy] = useState<OrderBy>('downloads_count');
  const [selectedApp, setSelectedApp] = useState<DBApp | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'app' | 'game'>('all');
  const navigate = useNavigate();

  const PAGE_SIZE = 20;

  const load = useCallback(async (pageNum: number, order: OrderBy, type: 'all' | 'app' | 'game', reset = false) => {
    if (loading && !reset) return;
    setLoading(true);
    try {
      const data = await fetchApprovedApps({
        orderBy: order,
        page: pageNum,
        type: type === 'all' ? undefined : type,
      });
      if (data.length < PAGE_SIZE) setHasMore(false);
      setApps(prev => pageNum === 0 || reset ? data : [...prev, ...data]);
    } catch { setHasMore(false); }
    finally { setLoading(false); }
  }, [loading, PAGE_SIZE]); // Added missing dependencies: loading, PAGE_SIZE. Potentially orderBy, typeFilter as well if load is meant to always use the latest, but for useCallback, it needs to capture at the time of definition.

  useEffect(() => {
    setApps([]);
    setPage(0);
    setHasMore(true);
    load(0, orderBy, typeFilter, true);
  }, [orderBy, typeFilter, load]); // Added missing dependency: load

  // Infinite scroll sentinel
  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const next = page + 1;
          setPage(next);
          load(next, orderBy, typeFilter);
        }
      },
      { rootMargin: '300px' }
    );
    const sentinel = document.getElementById('top-charts-sentinel');
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, page, orderBy, typeFilter, load]); // Added missing dependency: load

  return (
    <div className="min-h-screen bg-background pb-24">
      <TopBar />

      {/* Sort tabs */}
      <div className="sticky top-[57px] z-30 bg-white border-b border-border/50">
        <div className="flex overflow-x-auto scrollbar-hide px-2">
          {FILTER_TABS.map(tab => (
            <button key={tab.id} onClick={() => setOrderBy(tab.id as OrderBy)}
              className={cn('flex items-center gap-1.5 flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2',
                orderBy === tab.id ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground')}>
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type pills */}
      <div className="flex gap-2 px-4 pt-3 pb-1">
        {(['all', 'app', 'game'] as const).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={cn('px-4 py-1.5 rounded-full text-xs font-semibold capitalize border transition-colors',
              typeFilter === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent')}>
            {t === 'all' ? 'All' : t === 'app' ? 'Apps' : 'Games'}
          </button>
        ))}
      </div>

      {/* Charts list */}
      <div className="px-4 pt-3">
        {apps.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <TrendingUp size={40} className="text-muted-foreground/30 mb-3" />
            <p className="font-semibold text-foreground">No apps yet</p>
            <p className="text-sm text-muted-foreground mt-1">Check back soon</p>
          </div>
        ) : (
          <div className="space-y-1">
            {apps.map((app, index) => (
              <button key={app.id} onClick={() => navigate(`/app/${app.id}`)}
                className="flex items-center gap-3 w-full p-3 hover:bg-accent/50 rounded-2xl transition-colors text-left">
                {/* Rank */}
                <span className={cn('font-black text-center flex-shrink-0 w-7',
                  index === 0 ? 'text-yellow-500 text-xl' :
                  index === 1 ? 'text-slate-400 text-xl' :
                  index === 2 ? 'text-amber-600 text-xl' :
                  'text-muted-foreground/40 text-lg')}>
                  {index + 1}
                </span>
                <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground line-clamp-1">{app.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{app.developer_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StarRating rating={Number(app.avg_rating ?? 0)} size={11} />
                    <span className="text-xs text-muted-foreground">
                      {app.downloads_count >= 1000
                        ? `${(app.downloads_count / 1000).toFixed(0)}K+ installs`
                        : `${app.downloads_count}+ installs`}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="px-4 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    {app.price === 0 ? 'Free' : `$${app.price}`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2 mt-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="w-7 h-5 bg-secondary rounded animate-pulse" />
                <div className="w-12 h-12 bg-secondary rounded-2xl animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-secondary rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-secondary rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sentinel */}
        {hasMore && <div id="top-charts-sentinel" className="h-4" />}

        {!hasMore && apps.length > 0 && (
          <p className="text-center text-xs text-muted-foreground py-6">You've seen all {apps.length} apps</p>
        )}
      </div>
    </div>
  );
};

export default TopChartsPage;
