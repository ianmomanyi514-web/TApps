import { useState, useCallback, useEffect } from 'react';
import { DBApp } from '@/types/database';
import { fetchApprovedApps } from '@/lib/api';
import AppIcon from '@/components/features/AppIcon';
import StarRating from '@/components/features/StarRating';
import DBFeaturedBanner from '@/components/features/DBFeaturedBanner';
import PromotionBanner from '@/components/features/PromotionBanner';
import SectionHeader from '@/components/features/SectionHeader';
import TopBar from '@/components/layout/TopBar';
import { cn } from '@/lib/utils';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useNavigate } from 'react-router-dom';
import { Star, TrendingUp, Flame, Zap } from 'lucide-react';
import { useTopRatedApps } from '@/hooks/useTopRatedApps';
import { useTrendingApps } from '@/hooks/useTrendingApps';
import { supabase } from '@/lib/supabase';

const TABS = ['For you', 'Top charts', 'Kids', 'Categories'];

interface LiveAppsPageProps {
  onAuthRequired: () => void;
  onTabChange?: (tab: string) => void;
}

const AppCardHorizontal = ({ app, rank }: { app: DBApp; rank?: number }) => {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(`/app/${app.id}`)}
      className="flex-shrink-0 w-[150px] bg-card border border-border rounded-2xl p-3 hover:shadow-md transition-all text-left group">
      <div className="flex items-start justify-between mb-2">
        <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="md" />
        {rank !== undefined && (
          <span className={cn('text-xs font-black',
            rank === 0 ? 'text-yellow-500' : rank === 1 ? 'text-slate-400' : rank === 2 ? 'text-amber-600' : 'text-muted-foreground/30')}>
            #{rank + 1}
          </span>
        )}
      </div>
      <p className="font-bold text-xs text-foreground line-clamp-1 mb-0.5">{app.name}</p>
      <p className="text-[10px] text-muted-foreground line-clamp-1 mb-1.5">{app.developer_name}</p>
      <div className="flex items-center gap-1 mb-2">
        <Star size={10} className="fill-yellow-400 text-yellow-400 flex-shrink-0" />
        <span className="text-[10px] font-bold">{Number(app.avg_rating ?? 0).toFixed(1)}</span>
      </div>
      <div className="py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold text-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        {app.price === 0 ? 'Free' : `$${app.price}`}
      </div>
    </button>
  );
};

const LiveAppsPage = ({ onAuthRequired, onTabChange }: LiveAppsPageProps) => {
  const [activeSubTab, setActiveSubTab] = useState('For you');
  const navigate = useNavigate();
  const [newestApps, setNewestApps] = useState<DBApp[]>([]);
  const [newestLoading, setNewestLoading] = useState(true);

  const fetchFn = useCallback((page: number) => fetchApprovedApps({ page }), []);
  const { items: dbApps, loading, hasMore, sentinelRef } = useInfiniteScroll<DBApp>({ fetchFn });

  // Sections
  const { apps: topRatedApps, loading: topRatedLoading } = useTopRatedApps();
  const { apps: trendingApps, loading: trendingLoading } = useTrendingApps(10);

  // Newest apps (last 7 days)
  useEffect(() => {
    supabase
      .from('apps_with_stats')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => {
        setNewestApps((data || []) as DBApp[]);
        setNewestLoading(false);
      })
      .catch(() => setNewestLoading(false));
  }, []);

  const handleSubTab = (tab: string) => {
    setActiveSubTab(tab);
    if (tab === 'Top charts') onTabChange?.('topcharts');
    if (tab === 'Categories') onTabChange?.('categories');
  };

  const HorizontalSection = ({ title, subtitle, icon, apps, loading: sectionLoading, onMore }: {
    title: string; subtitle?: string; icon?: React.ReactNode; apps: DBApp[]; loading: boolean; onMore?: () => void;
  }) => (
    <div className="mb-6">
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          {icon && <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">{icon}</div>}
          <div>
            <p className="font-bold text-sm text-foreground">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {onMore && (
          <button onClick={onMore} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
            <TrendingUp size={11} />See all
          </button>
        )}
      </div>
      {sectionLoading ? (
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
          {[1,2,3,4].map(i => <div key={i} className="flex-shrink-0 w-[150px] h-[148px] bg-secondary rounded-2xl animate-pulse" />)}
        </div>
      ) : apps.length > 0 ? (
        <div className="overflow-x-auto scrollbar-hide px-4 pb-2">
          <div className="flex gap-3">
            {apps.map((app, idx) => <AppCardHorizontal key={app.id} app={app} rank={idx} />)}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <TopBar />
      <div className="sticky top-[57px] z-30 bg-white border-b border-border/50">
        <div className="flex overflow-x-auto scrollbar-hide px-2">
          {TABS.map(tab => (
            <button key={tab} onClick={() => handleSubTab(tab)}
              className={cn('flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2',
                activeSubTab === tab ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground')}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {/* Featured banner */}
        <DBFeaturedBanner />

        {/* Promotion Banner */}
        <PromotionBanner />

        {/* 🔥 Trending This Week */}
        <HorizontalSection
          title="Trending This Week"
          subtitle="Most installs in 7 days"
          icon={<Flame size={14} className="text-orange-500" />}
          apps={trendingApps}
          loading={trendingLoading}
          onMore={() => onTabChange?.('topcharts')}
        />

        {/* ⭐ Top Rated */}
        {(topRatedApps.length > 0 || topRatedLoading) && (
          <HorizontalSection
            title="Top Rated This Week"
            subtitle="Highest community ratings"
            icon={<Star size={14} className="fill-yellow-500 text-yellow-500" />}
            apps={topRatedApps}
            loading={topRatedLoading}
            onMore={() => onTabChange?.('topcharts')}
          />
        )}

        {/* ⚡ New & Updated */}
        {(newestApps.length > 0 || newestLoading) && (
          <HorizontalSection
            title="New & Updated"
            subtitle="Recently published apps"
            icon={<Zap size={14} className="text-blue-500" />}
            apps={newestApps}
            loading={newestLoading}
          />
        )}

        {/* All Apps — infinite scroll list */}
        {dbApps.length > 0 && (
          <div className="mb-6">
            <SectionHeader title="All Apps on T Apps" subtitle={`${dbApps.length}+ apps available`} />
            <div className="px-4">
              <div className="space-y-1">
                {dbApps.map((app, i) => (
                  <button key={app.id} onClick={() => navigate(`/app/${app.id}`)}
                    className="flex items-center gap-3 w-full p-3 hover:bg-accent/50 rounded-2xl transition-colors text-left">
                    <span className="w-6 text-center text-xs font-bold text-muted-foreground/40 flex-shrink-0">{i + 1}</span>
                    <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground line-clamp-1">{app.name}</p>
                      <p className="text-xs text-muted-foreground">{app.developer_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarRating rating={Number(app.avg_rating ?? 0)} size={11} />
                        <span className="text-xs text-muted-foreground">{app.downloads_count}+ installs</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                      {app.price === 0 ? 'Free' : `$${app.price}`}
                    </div>
                  </button>
                ))}
              </div>

              {hasMore && <div ref={sentinelRef} className="h-4" />}

              {loading && (
                <div className="space-y-2 py-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <div className="w-6 h-4 bg-secondary rounded animate-pulse" />
                      <div className="w-12 h-12 bg-secondary rounded-2xl animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-secondary rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-secondary rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!hasMore && dbApps.length > 0 && (
                <p className="text-center text-xs text-muted-foreground py-6">All {dbApps.length} apps shown</p>
              )}
            </div>
          </div>
        )}

        {loading && dbApps.length === 0 && (
          <div className="px-4 mb-6 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="w-6 h-4 bg-secondary rounded animate-pulse" />
                <div className="w-12 h-12 bg-secondary rounded-2xl animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-secondary rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-secondary rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && dbApps.length === 0 && trendingApps.length === 0 && topRatedApps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-5">
              <span className="text-white text-3xl font-black">T</span>
            </div>
            <p className="font-bold text-xl text-foreground mb-2">T Apps is just getting started</p>
            <p className="text-sm text-muted-foreground mb-6">Be the first developer to publish an app!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveAppsPage;
