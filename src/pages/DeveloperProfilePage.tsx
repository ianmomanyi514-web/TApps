import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { DBApp } from '@/types/database';
import { ArrowLeft, Globe, Building2, Star, Download, Package, ExternalLink, BadgeCheck } from 'lucide-react';
import AppIcon from '@/components/features/AppIcon';
import StarRating from '@/components/features/StarRating';
import { cn } from '@/lib/utils';

interface DeveloperProfile {
  id: string;
  username: string;
  email: string;
  bio: string | null;
  company: string | null;
  website: string | null;
  avatar_url: string | null;
  created_at: string;
  verified?: boolean;
}

const DeveloperProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [developer, setDeveloper] = useState<DeveloperProfile | null>(null);
  const [apps, setApps] = useState<DBApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'apps' | 'about'>('apps');

  useEffect(() => {
    if (!id) return;

    Promise.all([
      supabase
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .eq('role', 'developer')
        .single(),
      supabase
        .from('apps_with_stats')
        .select('*')
        .eq('developer_id', id)
        .eq('status', 'approved')
        .order('downloads_count', { ascending: false }),
    ]).then(([devRes, appsRes]) => {
      if (devRes.error || !devRes.data) { navigate('/'); return; }
      setDeveloper(devRes.data as DeveloperProfile);
      setApps((appsRes.data || []) as DBApp[]);
    }).catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto">
        <div className="h-36 bg-secondary animate-pulse" />
        <div className="p-4 space-y-4">
          <div className="h-12 bg-secondary rounded-2xl animate-pulse w-1/2" />
          <div className="h-4 bg-secondary rounded animate-pulse w-3/4" />
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-secondary rounded-2xl animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!developer) return null;

  const totalDownloads = apps.reduce((s, a) => s + (a.downloads_count ?? 0), 0);
  const avgRating = apps.length > 0
    ? (apps.reduce((s, a) => s + Number(a.avg_rating ?? 0), 0) / apps.length).toFixed(1)
    : '—';
  const totalReviews = apps.reduce((s, a) => s + (a.review_count ?? 0), 0);

  const formatNum = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toString();
  };

  return (
    <div className="min-h-screen bg-white pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-5 pt-10 pb-6 relative">
        <button onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-4 mb-5 mt-4">
          {developer.avatar_url ? (
            <img src={developer.avatar_url} alt={developer.username}
              className="w-18 h-18 rounded-3xl border-2 border-white/30 object-cover" style={{ width: 72, height: 72 }} />
          ) : (
            <div className="w-[72px] h-[72px] rounded-3xl bg-white/20 flex items-center justify-center border-2 border-white/30 flex-shrink-0">
              <span className="text-white font-black text-2xl">{developer.username[0].toUpperCase()}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-white font-black text-xl leading-tight">{developer.username}</h1>
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-semibold">Developer</span>
              {developer.verified && (
                <span className="flex items-center gap-1 bg-blue-500/30 text-white text-xs px-2 py-0.5 rounded-full font-semibold border border-blue-300/30">
                  <BadgeCheck size={11} />Verified
                </span>
              )}
            </div>
            {developer.company && (
              <div className="flex items-center gap-1 mt-1">
                <Building2 size={12} className="text-white/70" />
                <p className="text-white/80 text-sm">{developer.company}</p>
              </div>
            )}
            <p className="text-white/60 text-xs mt-1">
              Member since {new Date(developer.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Apps', value: apps.length },
            { label: 'Downloads', value: formatNum(totalDownloads) },
            { label: 'Avg Rating', value: avgRating },
            { label: 'Reviews', value: formatNum(totalReviews) },
          ].map(stat => (
            <div key={stat.label} className="bg-white/15 rounded-2xl px-2 py-2.5 text-center">
              <p className="text-white font-black text-base leading-none">{stat.value}</p>
              <p className="text-white/60 text-[10px] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-border/50 sticky top-0 z-10">
        {([['apps', 'Apps', Package], ['about', 'About', Building2]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setActiveTab(id as 'apps' | 'about')}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-3.5 text-sm font-semibold border-b-2 transition-colors',
              activeTab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>
            <Icon size={15} />{label}
            {id === 'apps' && apps.length > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-bold px-1.5 py-0.5 rounded-full ml-0.5">{apps.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 pt-5">
        {activeTab === 'apps' ? (
          apps.length === 0 ? (
            <div className="text-center py-16">
              <Package size={40} className="text-muted-foreground/20 mx-auto mb-3" />
              <p className="font-semibold text-foreground">No published apps yet</p>
              <p className="text-sm text-muted-foreground mt-1">This developer hasn't published any apps</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apps.map((app, idx) => (
                <button key={app.id} onClick={() => navigate(`/app/${app.id}`)}
                  className="flex items-center gap-3 w-full p-3 bg-card border border-border rounded-2xl hover:border-primary/30 hover:shadow-sm transition-all text-left">
                  <span className="w-5 text-center text-xs font-black text-muted-foreground/30 flex-shrink-0">
                    {idx + 1}
                  </span>
                  <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground line-clamp-1">{app.name}</p>
                    <p className="text-xs text-muted-foreground">{app.category} · v{app.version}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <div className="flex items-center gap-1">
                        <Star size={10} className="fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-foreground font-semibold">{Number(app.avg_rating ?? 0).toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({app.review_count ?? 0})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download size={10} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{formatNum(app.downloads_count)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                    {app.price === 0 ? 'Free' : `$${app.price}`}
                  </div>
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-4">
            {/* Bio */}
            {developer.bio ? (
              <div className="bg-secondary/50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">About</p>
                <p className="text-sm text-foreground leading-relaxed">{developer.bio}</p>
              </div>
            ) : (
              <div className="bg-secondary/50 rounded-2xl p-4">
                <p className="text-sm text-muted-foreground italic">This developer hasn't added a bio yet.</p>
              </div>
            )}

            {/* Links */}
            <div className="bg-secondary/50 rounded-2xl overflow-hidden divide-y divide-border/50">
              {developer.website && (
                <a href={developer.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Globe size={18} className="text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Website</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{developer.website}</p>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-muted-foreground" />
                </a>
              )}
              {developer.company && (
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <Building2 size={18} className="text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Company</p>
                    <p className="text-xs text-muted-foreground">{developer.company}</p>
                  </div>
                </div>
              )}
            </div>

            {/* App categories published in */}
            {apps.length > 0 && (
              <div className="bg-secondary/50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Categories</p>
                <div className="flex flex-wrap gap-2">
                  {[...new Set(apps.map(a => a.category))].map(cat => (
                    <span key={cat} className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-semibold">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Top rated app */}
            {apps.length > 0 && (
              <div className="bg-secondary/50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Top App</p>
                <button onClick={() => navigate(`/app/${apps[0].id}`)}
                  className="flex items-center gap-3 w-full text-left">
                  <AppIcon icon={apps[0].icon} iconBg={apps[0].icon_bg} name={apps[0].name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground">{apps[0].name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <StarRating rating={Number(apps[0].avg_rating ?? 0)} size={12} />
                      <span className="text-xs text-muted-foreground ml-1">({apps[0].review_count ?? 0} reviews)</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatNum(apps[0].downloads_count)} downloads</p>
                  </div>
                  <ExternalLink size={16} className="text-muted-foreground flex-shrink-0" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeveloperProfilePage;
