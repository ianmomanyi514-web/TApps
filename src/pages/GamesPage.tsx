import { useState, useCallback, useEffect } from 'react';
import { DBApp } from '@/types/database';
import { fetchApprovedApps } from '@/lib/api';
import AppIcon from '@/components/features/AppIcon';
import StarRating from '@/components/features/StarRating';
import DBFeaturedBanner from '@/components/features/DBFeaturedBanner';
import SectionHeader from '@/components/features/SectionHeader';
import TopBar from '@/components/layout/TopBar';
import { cn } from '@/lib/utils';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useNavigate } from 'react-router-dom';
import { GAME_CATEGORIES } from '@/constants/mockData';
import { Star, Flame, Trophy, Gamepad2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const GAME_TABS = ['For you', 'Top charts', 'New', 'Categories'];

const GamesPage = ({ onTabChange }: { onTabChange?: (tab: string) => void }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('For you');
  const [trendingGames, setTrendingGames] = useState<DBApp[]>([]);
  const [topRatedGames, setTopRatedGames] = useState<DBApp[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  const fetchFn = useCallback((page: number) => fetchApprovedApps({ type: 'game', page }), []);
  const { items: allGames, loading, hasMore, sentinelRef } = useInfiniteScroll<DBApp>({ fetchFn });

  useEffect(() => {
    Promise.all([
      // Trending games: most recent installs
      supabase
        .from('trending_apps')
        .select('*')
        .eq('type', 'game')
        .limit(10)
        .then(({ data }) => setTrendingGames((data || []) as DBApp[])),
      // Top rated games
      supabase
        .from('apps_with_stats')
        .select('*')
        .eq('status', 'approved')
        .eq('type', 'game')
        .order('avg_rating', { ascending: false })
        .limit(10)
        .then(({ data }) => setTopRatedGames((data || []) as DBApp[])),
    ]).catch(() => {}).finally(() => setSectionsLoading(false));
  }, []);

  const handleTab = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'Top charts') onTabChange?.('topcharts');
    if (tab === 'Categories') onTabChange?.('categories');
  };

  const GameCard = ({ app, rank }: { app: DBApp; rank?: number }) => (
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

  const SectionRow = ({ title, subtitle, icon, apps, sloading }: {
    title: string; subtitle?: string; icon: React.ReactNode; apps: DBApp[]; sloading: boolean;
  }) => (
    <div className="mb-6">
      <div className="flex items-center gap-2 px-4 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">{icon}</div>
        <div>
          <p className="font-bold text-sm text-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {sloading ? (
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
          {[1,2,3,4].map(i => <div key={i} className="flex-shrink-0 w-[150px] h-[148px] bg-secondary rounded-2xl animate-pulse" />)}
        </div>
      ) : apps.length > 0 ? (
        <div className="overflow-x-auto scrollbar-hide px-4 pb-2">
          <div className="flex gap-3">
            {apps.map((app, i) => <GameCard key={app.id} app={app} rank={i} />)}
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
          {GAME_TABS.map(tab => (
            <button key={tab} onClick={() => handleTab(tab)}
              className={cn('flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2',
                activeTab === tab ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground')}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {/* Featured Banner — games only */}
        <DBFeaturedBanner filterType="game" />

        {/* 🔥 Trending Games */}
        <SectionRow
          title="Trending Games"
          subtitle="Hot this week"
          icon={<Flame size={14} className="text-orange-500" />}
          apps={trendingGames}
          sloading={sectionsLoading}
        />

        {/* 🏆 Top Rated */}
        <SectionRow
          title="Top Rated Games"
          subtitle="Player favorites"
          icon={<Trophy size={14} className="text-yellow-500" />}
          apps={topRatedGames}
          sloading={sectionsLoading}
        />

        {/* Explore game categories */}
        <div className="mb-6">
          <SectionHeader title="Explore game categories" />
          <div className="mx-4 rounded-2xl border border-border overflow-hidden">
            <div className="grid grid-cols-2">
              {GAME_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/search?tag=${encodeURIComponent(cat.name)}`)}
                  className={cn(
                    'flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors',
                    i % 2 === 0 && 'border-r border-border',
                    i < GAME_CATEGORIES.length - 2 && 'border-b border-border'
                  )}>
                  <span className="text-sm font-medium text-foreground">{cat.name}</span>
                  <span className="text-xl">{cat.icon}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* All games — infinite scroll */}
        {allGames.length > 0 && (
          <div className="mb-6">
            <SectionHeader title="All Games" subtitle={`${allGames.length}+ games`} />
            <div className="px-4 space-y-1">
              {allGames.map((app, i) => (
                <button key={app.id} onClick={() => navigate(`/app/${app.id}`)}
                  className="flex items-center gap-3 w-full p-3 hover:bg-accent/50 rounded-2xl transition-colors text-left">
                  <span className="w-6 text-center text-xs font-bold text-muted-foreground/40 flex-shrink-0">{i + 1}</span>
                  <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground line-clamp-1">{app.name}</p>
                    <p className="text-xs text-muted-foreground">{app.developer_name} · {app.category}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StarRating rating={Number(app.avg_rating ?? 0)} size={11} />
                    </div>
                  </div>
                  <span className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    {app.price === 0 ? 'Free' : `$${app.price}`}
                  </span>
                </button>
              ))}
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
            </div>
          </div>
        )}

        {!loading && allGames.length === 0 && !sectionsLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center mb-4">
              <Gamepad2 size={28} className="text-muted-foreground" />
            </div>
            <p className="font-bold text-foreground mb-1">No games yet</p>
            <p className="text-sm text-muted-foreground">Developers haven't submitted any games. Be the first!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamesPage;
