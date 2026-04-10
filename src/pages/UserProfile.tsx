import { useState, useEffect } from 'react';
import { Bookmark, Download, Settings, LogOut, User, Code2, Star, ChevronRight, ExternalLink, Clock, ArrowUpCircle, Share2, Check, X, Bell, BellOff, Globe } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { fetchUserWishlist, removeFromWishlist } from '@/lib/api';
import { DBApp } from '@/types/database';
import AppIcon from '@/components/features/AppIcon';
import StarRating from '@/components/features/StarRating';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { authService } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useI18n, Lang } from '@/lib/i18n';

interface InstalledApp {
  app_id: string;
  installed_at: string;
  apps: DBApp;
  has_update?: boolean;
}

interface ChangelogInfo {
  appId: string;
  appName: string;
  version: string;
  changelog: string | null;
}

interface NotifPrefs {
  app_updates: boolean;
  new_reviews: boolean;
  comments: boolean;
  system: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  app_updates: true,
  new_reviews: true,
  comments: true,
  system: true,
};

const NOTIF_PREF_OPTIONS: { key: keyof NotifPrefs; label: string; desc: string }[] = [
  { key: 'app_updates', label: 'App Updates', desc: 'Get notified when installed apps release updates' },
  { key: 'new_reviews', label: 'Review Alerts', desc: 'Notified when someone reviews your app (developers)' },
  { key: 'comments', label: 'Comment Replies', desc: 'Notified when someone replies to your review' },
  { key: 'system', label: 'System & Approvals', desc: 'App approvals, announcements, and account alerts' },
];

const UserProfile = ({ onAuthRequired }: { onAuthRequired: () => void }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { lang, setLang } = useI18n();
  const [wishlist, setWishlist] = useState<{ app_id: string; apps: DBApp }[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'wishlist' | 'notifications'>('library');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [changelogModal, setChangelogModal] = useState<ChangelogInfo | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const fetchInstalls = supabase
      .from('installs')
      .select('app_id, installed_at, apps(*)')
      .eq('user_id', user.id)
      .order('installed_at', { ascending: false });

    const fetchUpdateAlerts = supabase
      .from('notifications')
      .select('app_id')
      .eq('user_id', user.id)
      .eq('type', 'update')
      .eq('read', false);

    Promise.all([
      fetchUserWishlist(user.id).then(data => setWishlist(data as { app_id: string; apps: DBApp }[])),
      Promise.all([fetchInstalls, fetchUpdateAlerts]).then(([{ data: installData }, { data: alertData }]) => {
        const alertAppIds = new Set((alertData || []).map((n: { app_id: string | null }) => n.app_id));
        const rows = (installData || []) as InstalledApp[];
        const withAlerts = rows.map(r => ({ ...r, has_update: alertAppIds.has(r.app_id) }));
        setInstalledApps(withAlerts);
      }),
      // Load notification preferences
      supabase.from('user_profiles').select('notification_preferences').eq('id', user.id).single().then(({ data }) => {
        if (data?.notification_preferences) {
          setNotifPrefs({ ...DEFAULT_PREFS, ...(data.notification_preferences as NotifPrefs) });
        }
      }),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [user?.id]);

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      logout();
      toast.success('Signed out');
    } catch { toast.error('Failed to sign out'); }
  };

  const handleShareWishlist = async () => {
    if (wishlist.length === 0) { toast.error('Your wishlist is empty'); return; }
    const lines = wishlist
      .filter(w => w.apps)
      .map((w, i) => `${i + 1}. ${w.apps.name} — ${window.location.origin}/app/${w.app_id}`);
    const text = `My T Apps wishlist\n\n${lines.join('\n')}\n\nDiscover apps at ${window.location.origin}`;

    if (navigator.share) {
      try { await navigator.share({ title: 'My T Apps Wishlist', text }); return; }
      catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Wishlist copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch { toast.error('Failed to copy'); }
  };

  const handleRemoveWishlist = async (userId: string, appId: string) => {
    try {
      await removeFromWishlist(userId, appId);
      setWishlist(prev => prev.filter(w => w.app_id !== appId));
      toast.success('Removed from wishlist');
    } catch { toast.error('Failed to remove'); }
  };

  const handleUpdateTap = async (item: InstalledApp) => {
    const { data } = await supabase
      .from('app_versions')
      .select('version, changelog')
      .eq('app_id', item.app_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setChangelogModal({
        appId: item.app_id,
        appName: item.apps.name,
        version: data.version,
        changelog: data.changelog,
      });
    } else {
      navigate(`/app/${item.app_id}?from_update=1`);
    }
  };

  const togglePref = async (key: keyof NotifPrefs) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    setSavingPrefs(true);
    await supabase.from('user_profiles')
      .update({ notification_preferences: updated })
      .eq('id', user!.id);
    setSavingPrefs(false);
    toast.success(updated[key] ? 'Notifications enabled' : 'Notifications muted');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-5 shadow-lg">
          <span className="text-white text-3xl font-black">T</span>
        </div>
        <h2 className="font-bold text-xl text-foreground mb-2">Sign in to T Apps</h2>
        <p className="text-sm text-muted-foreground mb-6">Access your library, wishlist, and personalize your experience</p>
        <button onClick={onAuthRequired}
          className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold text-sm hover:bg-primary/90 transition-colors">
          Sign In / Create Account
        </button>
      </div>
    );
  }

  const isDeveloper = user.role === 'developer';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Changelog Modal */}
      {changelogModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setChangelogModal(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl">
            <div className="px-5 pt-5 pb-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-base text-foreground">What's New</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{changelogModal.appName} · v{changelogModal.version}</p>
                </div>
                <button onClick={() => setChangelogModal(null)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {changelogModal.changelog || 'Bug fixes and performance improvements.'}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setChangelogModal(null)}
                  className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-accent transition-colors">
                  Later
                </button>
                <button onClick={() => { setChangelogModal(null); navigate(`/app/${changelogModal.appId}?from_update=1`); }}
                  className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors">
                  View Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className={cn('px-5 pt-10 pb-6', isDeveloper
        ? 'bg-gradient-to-br from-emerald-600 to-teal-700'
        : 'bg-gradient-to-br from-blue-600 to-indigo-700')}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-2xl">{user.username[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-bold text-xl">{user.username}</p>
              <span className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold',
                isDeveloper ? 'bg-emerald-900/40 text-emerald-200' : 'bg-blue-900/40 text-blue-200')}>
                {isDeveloper ? <><Code2 size={10} />Developer</> : <><User size={10} />User</>}
              </span>
            </div>
            <p className="text-white/70 text-sm mt-0.5 truncate">{user.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/15 rounded-2xl px-3 py-3 flex items-center gap-2">
            <Download size={16} className="text-white/80 flex-shrink-0" />
            <div>
              <p className="text-white font-bold">{installedApps.length}</p>
              <p className="text-white/70 text-xs">Installed</p>
            </div>
          </div>
          <div className="bg-white/15 rounded-2xl px-3 py-3 flex items-center gap-2">
            <Bookmark size={16} className="text-white/80 flex-shrink-0" />
            <div>
              <p className="text-white font-bold">{wishlist.length}</p>
              <p className="text-white/70 text-xs">Saved</p>
            </div>
          </div>
          <div className="bg-white/15 rounded-2xl px-3 py-3 flex items-center gap-2">
            <Star size={16} className="text-white/80 flex-shrink-0" />
            <div>
              <p className="text-white font-bold text-sm">{user.role}</p>
              <p className="text-white/70 text-xs">Account</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50 bg-white sticky top-0 z-10">
        {([
          ['library', 'Library', Download],
          ['wishlist', 'Wishlist', Bookmark],
          ['notifications', 'Alerts', Bell],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setActiveTab(id as 'library' | 'wishlist' | 'notifications')}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-semibold border-b-2 transition-colors',
              activeTab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>
            <Icon size={14} />{label}
            {id === 'library' && installedApps.length > 0 && (
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{installedApps.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-secondary rounded-2xl animate-pulse" />)}
          </div>
        ) : activeTab === 'library' ? (
          installedApps.length === 0 ? (
            <div className="text-center py-16">
              <Download size={44} className="text-muted-foreground/20 mx-auto mb-4" />
              <p className="font-bold text-foreground mb-1">Your library is empty</p>
              <p className="text-sm text-muted-foreground mb-4">Discover and install apps from the store</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {installedApps.length} app{installedApps.length !== 1 ? 's' : ''} installed
                </p>
              </div>
              {installedApps.map(item => item.apps && (
                <div key={item.app_id}
                  className={cn('flex items-center gap-3 p-3 bg-card border rounded-2xl hover:border-primary/30 transition-colors',
                    item.has_update ? 'border-orange-300 bg-orange-50/30' : 'border-border')}>
                  <div className="relative">
                    <AppIcon icon={item.apps.icon} iconBg={item.apps.icon_bg} name={item.apps.name} size="md" />
                    {item.has_update && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                        <ArrowUpCircle size={10} className="text-white" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-foreground line-clamp-1">{item.apps.name}</p>
                      {item.has_update && (
                        <span className="flex-shrink-0 text-[10px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full">Update</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{item.apps.developer_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StarRating rating={Number(item.apps.avg_rating ?? 0)} size={11} />
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground/70">
                        <Clock size={9} />
                        {new Date(item.installed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => navigate(`/app/${item.app_id}`)}
                      className="p-2 rounded-xl hover:bg-accent transition-colors">
                      <ExternalLink size={15} className="text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => item.has_update ? handleUpdateTap(item) : navigate(`/app/${item.app_id}`)}
                      className={cn('px-4 py-2 rounded-full text-xs font-bold transition-colors',
                        item.has_update
                          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          : 'bg-primary/10 text-primary hover:bg-primary/20')}>
                      {item.has_update ? 'Update' : 'Open'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'wishlist' ? (
          wishlist.length === 0 ? (
            <div className="text-center py-16">
              <Bookmark size={44} className="text-muted-foreground/20 mx-auto mb-4" />
              <p className="font-bold text-foreground mb-1">No saved apps</p>
              <p className="text-sm text-muted-foreground">Tap the bookmark icon on any app to save it</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {wishlist.length} saved app{wishlist.length !== 1 ? 's' : ''}
                </p>
                <button onClick={handleShareWishlist}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
                  {copied ? <><Check size={11} />Copied!</> : <><Share2 size={11} />Share List</>}
                </button>
              </div>
              {wishlist.map(item => item.apps && (
                <div key={item.app_id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl">
                  <AppIcon icon={item.apps.icon} iconBg={item.apps.icon_bg} name={item.apps.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground line-clamp-1">{item.apps.name}</p>
                    <p className="text-xs text-muted-foreground">{item.apps.developer_name}</p>
                    <StarRating rating={Number(item.apps.avg_rating ?? 0)} size={11} />
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => navigate(`/app/${item.app_id}`)}
                      className="p-2 rounded-xl hover:bg-accent transition-colors">
                      <ExternalLink size={15} className="text-muted-foreground" />
                    </button>
                    <button onClick={() => handleRemoveWishlist(user.id, item.app_id)}
                      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-destructive/10 transition-colors">
                      <Bookmark size={16} className="text-primary fill-primary" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* ── Notification Preferences Tab ── */
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="font-bold text-base text-foreground">Notification Preferences</p>
                <p className="text-xs text-muted-foreground mt-0.5">Control which alerts you receive</p>
              </div>
              {savingPrefs && <span className="text-xs text-primary font-medium">Saving...</span>}
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border/50">
              {NOTIF_PREF_OPTIONS.map(opt => {
                const isOn = notifPrefs[opt.key];
                return (
                  <div key={opt.key} className="flex items-center justify-between px-4 py-4 hover:bg-accent/20 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                        isOn ? 'bg-primary/10' : 'bg-secondary')}>
                        {isOn
                          ? <Bell size={16} className="text-primary" />
                          : <BellOff size={16} className="text-muted-foreground/50" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-semibold', isOn ? 'text-foreground' : 'text-muted-foreground')}>{opt.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{opt.desc}</p>
                      </div>
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => togglePref(opt.key)}
                      className={cn(
                        'relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-3',
                        isOn ? 'bg-primary' : 'bg-border'
                      )}
                    >
                      <span className={cn(
                        'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                        isOn ? 'translate-x-5' : 'translate-x-0'
                      )} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="bg-secondary/50 rounded-2xl p-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                These preferences control in-app notification delivery. Changes take effect immediately and are saved to your account.
              </p>
            </div>

            {/* All off shortcut */}
            {Object.values(notifPrefs).some(Boolean) && (
              <button
                onClick={async () => {
                  const all_off = { app_updates: false, new_reviews: false, comments: false, system: false };
                  setNotifPrefs(all_off);
                  await supabase.from('user_profiles').update({ notification_preferences: all_off }).eq('id', user.id);
                  toast.success('All notifications muted');
                }}
                className="w-full py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors flex items-center justify-center gap-2">
                <BellOff size={13} />Mute all notifications
              </button>
            )}
          </div>
        )}
      </div>

        {/* Settings */}
      <div className="px-4 mt-6">
        <h3 className="font-semibold text-sm text-muted-foreground mb-2 px-1">Language</h3>
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border/50 mb-4">
          {([['en', '🇬🇧 English'], ['sw', '🇰🇪 Kiswahili']] as [Lang, string][]).map(([code, label]) => (
            <button key={code} onClick={() => setLang(code)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-accent/30 transition-colors">
              <div className="flex items-center gap-3">
                <Globe size={18} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{label}</span>
              </div>
              {lang === code && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"><Check size={11} className="text-white" /></div>}
            </button>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="px-4 mt-6">
        <h3 className="font-semibold text-sm text-muted-foreground mb-2 px-1">Account</h3>
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border/50">
          <button className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-accent/30 transition-colors">
            <div className="flex items-center gap-3">
              <Settings size={18} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Settings</span>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-destructive/5 transition-colors">
            <LogOut size={18} className="text-destructive" />
            <span className="text-sm font-medium text-destructive">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
