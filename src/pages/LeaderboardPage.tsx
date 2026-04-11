import { useState, useEffect } from 'react';
import { fetchDeveloperLeaderboard } from '@/lib/api';
import { cn } from '@/lib/utils';
import { BadgeCheck, Download, Star, Package, Trophy, ChevronLeft, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LeaderboardDev {
  id: string;
  username: string;
  avatar_url: string | null;
  verified: boolean;
  bio: string | null;
  company: string | null;
  app_count: number;
  total_downloads: number;
  avg_rating: number;
  total_reviews: number;
  score: number;
}

const MEDAL: Record<number, { emoji: string; bg: string; text: string }> = {
  0: { emoji: '🥇', bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-600' },
  1: { emoji: '🥈', bg: 'bg-slate-50 border-slate-200', text: 'text-slate-500' },
  2: { emoji: '🥉', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-600' },
};

const LeaderboardPage = ({ onBack }: { onBack?: () => void }) => {
  const navigate = useNavigate();
  const [devs, setDevs] = useState<LeaderboardDev[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'score' | 'downloads' | 'rating' | 'apps'>('score');

  useEffect(() => {
    fetchDeveloperLeaderboard(30)
      .then(data => setDevs(data as LeaderboardDev[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...devs].sort((a, b) => {
    if (sortBy === 'downloads') return b.total_downloads - a.total_downloads;
    if (sortBy === 'rating') return b.avg_rating - a.avg_rating;
    if (sortBy === 'apps') return b.app_count - a.app_count;
    return b.score - a.score;
  });

  const formatNum = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-yellow-500 to-orange-600 px-5 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => onBack ? onBack() : navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <ChevronLeft size={18} className="text-white" />
          </button>
          <div>
            <p className="text-white/70 text-xs">T Apps</p>
            <p className="text-white font-bold text-xl">Developer Leaderboard</p>
          </div>
        </div>
        <p className="text-white/70 text-xs ml-12">Top developers ranked by downloads, ratings & activity</p>

        {/* Top 3 podium */}
        {!loading && sorted.length >= 3 && (
          <div className="flex items-end justify-center gap-3 mt-5 pb-1">
            {/* 2nd */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mb-1 overflow-hidden">
                {sorted[1].avatar_url
                  ? <img src={sorted[1].avatar_url} className="w-full h-full object-cover" alt="" />
                  : <span className="text-white font-black text-lg">{sorted[1].username[0].toUpperCase()}</span>}
              </div>
              <span className="text-lg">🥈</span>
              <p className="text-white text-[10px] font-bold text-center max-w-[60px] truncate">{sorted[1].username}</p>
              <p className="text-white/60 text-[9px]">{formatNum(sorted[1].total_downloads)} dl</p>
              <div className="w-16 h-10 bg-white/20 rounded-t-xl mt-1" />
            </div>
            {/* 1st */}
            <div className="flex flex-col items-center -mb-1">
              <div className="w-16 h-16 rounded-full bg-white/30 border-2 border-yellow-200 flex items-center justify-center mb-1 overflow-hidden ring-2 ring-white/50">
                {sorted[0].avatar_url
                  ? <img src={sorted[0].avatar_url} className="w-full h-full object-cover" alt="" />
                  : <span className="text-white font-black text-2xl">{sorted[0].username[0].toUpperCase()}</span>}
              </div>
              <span className="text-2xl">🥇</span>
              <p className="text-white text-xs font-bold text-center max-w-[70px] truncate">{sorted[0].username}</p>
              <p className="text-white/70 text-[10px]">{formatNum(sorted[0].total_downloads)} dl</p>
              <div className="w-16 h-14 bg-white/25 rounded-t-xl mt-1" />
            </div>
            {/* 3rd */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center mb-1 overflow-hidden">
                {sorted[2].avatar_url
                  ? <img src={sorted[2].avatar_url} className="w-full h-full object-cover" alt="" />
                  : <span className="text-white font-black text-lg">{sorted[2].username[0].toUpperCase()}</span>}
              </div>
              <span className="text-lg">🥉</span>
              <p className="text-white text-[10px] font-bold text-center max-w-[60px] truncate">{sorted[2].username}</p>
              <p className="text-white/60 text-[9px]">{formatNum(sorted[2].total_downloads)} dl</p>
              <div className="w-16 h-7 bg-white/15 rounded-t-xl mt-1" />
            </div>
          </div>
        )}
      </div>

      {/* Sort controls */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-border bg-white sticky top-0 z-10">
        {([
          ['score', 'Overall', Trophy],
          ['downloads', 'Downloads', Download],
          ['rating', 'Rating', Star],
          ['apps', 'Apps', Package],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setSortBy(id)}
            className={cn('flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
              sortBy === id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent')}>
            <Icon size={11} />{label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-3 space-y-2.5">
        {loading ? (
          [1,2,3,4,5].map(i => <div key={i} className="h-20 bg-secondary rounded-2xl animate-pulse" />)
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <Trophy size={40} className="text-muted-foreground/20 mx-auto mb-3" />
            <p className="font-bold text-foreground">No developers yet</p>
            <p className="text-sm text-muted-foreground mt-1">Be the first to submit an app</p>
          </div>
        ) : (
          sorted.map((dev, idx) => {
            const medal = MEDAL[idx];
            return (
              <button
                key={dev.id}
                onClick={() => navigate(`/developer/${dev.id}`)}
                className={cn(
                  'w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all hover:shadow-sm active:scale-[0.99]',
                  medal ? medal.bg : 'bg-card border-border'
                )}>
                {/* Rank */}
                <div className={cn('w-8 flex-shrink-0 text-center', medal ? medal.text : 'text-muted-foreground')}>
                  {medal ? (
                    <span className="text-xl">{medal.emoji}</span>
                  ) : (
                    <span className="text-sm font-black">#{idx + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                  {dev.avatar_url
                    ? <img src={dev.avatar_url} className="w-full h-full object-cover" alt="" />
                    : <span className="text-white font-black text-lg">{dev.username[0].toUpperCase()}</span>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-sm text-foreground truncate">{dev.username}</p>
                    {dev.verified && <BadgeCheck size={13} className="text-blue-500 flex-shrink-0" />}
                    {dev.company && (
                      <span className="text-[9px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full truncate max-w-[80px]">
                        {dev.company}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                      <Download size={10} />{formatNum(dev.total_downloads)}
                    </span>
                    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                      <Star size={10} className="fill-yellow-400 text-yellow-400" />
                      {dev.avg_rating.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                      <Package size={10} />{dev.app_count} apps
                    </span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right flex-shrink-0">
                  <div className={cn('flex items-center gap-1 text-xs font-bold', medal ? medal.text : 'text-primary')}>
                    <TrendingUp size={11} />
                    {formatNum(Math.round(dev.score))}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">score</p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
