
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchAllAppsAdmin, updateAppStatus, getStoreStats, fetchAllUsers, updateUserRole, updateApp } from '@/lib/api';
import { fetchFeaturedApps, reorderFeaturedApps, sendNotificationEmail } from '@/lib/featuredApi';
import { DBApp } from '@/types/database';
import AppIcon from '@/components/features/AppIcon';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Users, Package, Star, Download, TrendingUp, ChevronLeft, Eye, Shield, UserCheck, BookmarkCheck, ChevronUp, ChevronDown, Layers, BarChart2, BadgeCheck, Flag } from 'lucide-react';
import DBAppDetailModal from '@/components/features/DBAppDetailModal';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface StoreStats {
  totalApps: number;
  approvedApps: number;
  pendingApps: number;
  totalUsers: number;
  totalReviews: number;
  totalInstalls: number;
}

type AdminTab = 'overview' | 'apps' | 'users' | 'featured' | 'analytics' | 'reports';
type AppFilter = 'all' | 'pending' | 'approved' | 'rejected';

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) => (
  <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
    <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0', color)}>
      {icon}
    </div>
    <div>
      <p className="text-xl font-black text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  </div>
);

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  developer: 'bg-emerald-100 text-emerald-700',
  user: 'bg-blue-100 text-blue-700',
};

const ROLE_AVATAR_GRADIENT: Record<string, string> = {
  admin: 'bg-gradient-to-br from-red-500 to-orange-500',
  developer: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  user: 'bg-gradient-to-br from-blue-500 to-indigo-600',
};

const AdminPanel = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [apps, setApps] = useState<DBApp[]>([]);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [appFilter, setAppFilter] = useState<AppFilter>('pending');
  const [selectedApp, setSelectedApp] = useState<DBApp | null>(null);
  const [appsPage, setAppsPage] = useState(0);
  const [hasMoreApps, setHasMoreApps] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [roleChangingId, setRoleChangingId] = useState<string | null>(null);
  const [featuredApps, setFeaturedApps] = useState<DBApp[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<{ categoryData: {name:string;count:number}[]; statusData: {name:string;value:number;color:string}[]; topApps: {name:string;installs:number}[] } | null>(null);
  const [reports, setReports] = useState<Record<string, unknown>[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [appSearch, setAppSearch] = useState('');

  useEffect(() => {
    getStoreStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics' && !analyticsData) {
      Promise.all([
        supabase.from('apps').select('category, status'),
        supabase.from('apps_with_stats').select('name, install_count').eq('status', 'approved').order('install_count', { ascending: false }).limit(8),
      ]).then(([catRes, topRes]) => {
        const apps = catRes.data || [];
        const catMap: Record<string,number> = {};
        apps.forEach(a => { catMap[a.category] = (catMap[a.category] || 0) + 1; });
        const categoryData = Object.entries(catMap).sort((a,b) => b[1]-a[1]).slice(0,8)
          .map(([name, count]) => ({ name: name.length > 10 ? name.slice(0,10)+'…' : name, count }));
        const statusData = [
          { name: 'Approved', value: apps.filter(a => a.status === 'approved').length, color: '#10b981' },
          { name: 'Pending', value: apps.filter(a => a.status === 'pending').length, color: '#f59e0b' },
          { name: 'Rejected', value: apps.filter(a => a.status === 'rejected').length, color: '#ef4444' },
        ].filter(d => d.value > 0);
        const topApps = (topRes.data || []).map((a: {name: string; install_count: number | null}) => ({ name: a.name.length > 12 ? a.name.slice(0,12)+'…' : a.name, installs: a.install_count || 0 }));
        setAnalyticsData({ categoryData, statusData, topApps });
      }).catch(() => {});
    }
  }, [activeTab, analyticsData]);

  useEffect(() => {
    if (activeTab === 'reports' && reports.length === 0) {
      setReportsLoading(true);
      supabase
        .from('reports')
        .select('*, apps(name, icon, icon_bg, developer_name), user_profiles(username, email)')
        .order('created_at', { ascending: false })
        .limit(50)
        .then(({ data }) => setReports((data || []) as Record<string, unknown>[]))
        .catch(() => {})
        .finally(() => setReportsLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'featured') {
      setFeaturedLoading(true);
      fetchFeaturedApps().then(setFeaturedApps).catch(() => {}).finally(() => setFeaturedLoading(false));
    }
  }, [activeTab]);

  const moveFeatured = async (index: number, direction: 'up' | 'down') => {
    const newApps = [...featuredApps];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newApps.length) return;
    [newApps[index], newApps[swapIdx]] = [newApps[swapIdx], newApps[index]];
    setFeaturedApps(newApps);
    setReordering(true);
    try {
      await reorderFeaturedApps(newApps.map(a => a.id));
      toast.success('Order saved');
    } catch { toast.error('Failed to save order'); }
    finally { setReordering(false); }
  };

  const handleUnfeature = async (app: DBApp) => {
    try {
      await updateApp(app.id, { featured: false, featured_order: 0 });
      setFeaturedApps(prev => prev.filter(a => a.id !== app.id));
      toast.success(`${app.name} removed from featured`);
    } catch { toast.error('Failed to unfeature app'); }
  };

  const loadApps = useCallback(async (filter: AppFilter, page: number, reset = false) => {
    if (page === 0) setLoading(true); else setLoadingMore(true);
    try {
      const data = await fetchAllAppsAdmin({ status: filter, page });
      if (data.length < 20) setHasMoreApps(false);
      setApps(prev => reset || page === 0 ? data : [...prev, ...data]);
    } catch { toast.error('Failed to load apps'); }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'apps') {
      setApps([]);
      setAppsPage(0);
      setHasMoreApps(true);
      loadApps(appFilter, 0, true);
    }
  }, [activeTab, appFilter, loadApps]);

  useEffect(() => {
    if (activeTab === 'users') {
      setLoading(true);
      fetchAllUsers(0).then(setUsers).catch(() => {}).finally(() => setLoading(false));
    }
  }, [activeTab]);

  const handleToggleFeatured = async (app: DBApp) => {
    try {
      await updateApp(app.id, { featured: !app.featured });
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, featured: !a.featured } : a));
      toast.success(app.featured ? `${app.name} removed from featured` : `${app.name} is now featured!`);
    } catch { toast.error('Failed to update featured status'); }
  };

  const handleApprove = async (app: DBApp) => {
    try {
      await updateAppStatus(app.id, 'approved');
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, status: 'approved' } : a));
      if (appFilter === 'pending') setApps(prev => prev.filter(a => a.id !== app.id));
      toast.success(`${app.name} approved!`);
      getStoreStats().then(setStats).catch(() => {});
      // Send email notification
      const devProfile = await import('@/lib/supabase').then(m =>
        m.supabase.from('user_profiles').select('email, username').eq('id', app.developer_id).single()
      );
      if (devProfile.data) {
        sendNotificationEmail({
          type: 'app_approved',
          recipientEmail: devProfile.data.email,
          recipientName: devProfile.data.username || app.developer_name,
          appName: app.name,
          appId: app.id,
        });
      }
    } catch { toast.error('Failed to approve app'); }
  };

  const handleReject = async (app: DBApp) => {
    try {
      await updateAppStatus(app.id, 'rejected');
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, status: 'rejected' } : a));
      if (appFilter === 'pending') setApps(prev => prev.filter(a => a.id !== app.id));
      toast.success(`${app.name} rejected`);
      getStoreStats().then(setStats).catch(() => {});
      // Send email notification
      const devProfile = await import('@/lib/supabase').then(m =>
        m.supabase.from('user_profiles').select('email, username').eq('id', app.developer_id).single()
      );
      if (devProfile.data) {
        sendNotificationEmail({
          type: 'app_rejected',
          recipientEmail: devProfile.data.email,
          recipientName: devProfile.data.username || app.developer_name,
          appName: app.name,
        });
      }
    } catch { toast.error('Failed to reject app'); }
  };

  const handleRoleChange = async (userId: string, currentRole: string, newRole: string) => {
    if (userId === user?.id) { toast.error("You can't change your own role"); return; }
    setRoleChangingId(userId);
    try {
      await updateUserRole(userId, newRole as 'user' | 'developer' | 'admin');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(`Role updated to ${newRole}`);
    } catch {
      toast.error('Failed to update role');
    } finally {
      setRoleChangingId(null);
    }
  };

  const loadMore = () => {
    if (loadingMore || !hasMoreApps) return;
    const next = appsPage + 1;
    setAppsPage(next);
    loadApps(appFilter, next);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-4xl mb-4">🔒</p>
          <p className="font-bold text-lg text-foreground">Admin Access Only</p>
          <p className="text-sm text-muted-foreground mt-2">You need admin privileges to view this page.</p>
          <button onClick={onBack} className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold text-sm">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-5 pt-10 pb-5">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <ChevronLeft size={18} className="text-white" />
          </button>
          <div>
            <p className="text-white/60 text-xs font-medium">T Apps</p>
            <p className="text-white font-bold text-xl">Admin Panel</p>
          </div>
          <div className="ml-auto bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
            <Shield size={11} />Admin
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-border/50 sticky top-0 z-10">
        {([['overview', 'Overview', TrendingUp], ['apps', 'Apps', Package], ['featured', 'Featured', Layers], ['analytics', 'Analytics', BarChart2], ['users', 'Users', Users], ['reports', 'Reports', Flag]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setActiveTab(id as AdminTab)}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-semibold border-b-2 transition-colors',
              activeTab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            <h2 className="font-bold text-lg text-foreground mb-3">Store Overview</h2>
            {stats ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={<Package size={20} className="text-blue-600" />} label="Total Apps" value={stats.totalApps} color="bg-blue-100" />
                  <StatCard icon={<CheckCircle size={20} className="text-green-600" />} label="Approved" value={stats.approvedApps} color="bg-green-100" />
                  <StatCard icon={<XCircle size={20} className="text-yellow-600" />} label="Pending Review" value={stats.pendingApps} color="bg-yellow-100" />
                  <StatCard icon={<Users size={20} className="text-purple-600" />} label="Total Users" value={stats.totalUsers} color="bg-purple-100" />
                  <StatCard icon={<Star size={20} className="text-orange-600" />} label="Reviews" value={stats.totalReviews} color="bg-orange-100" />
                  <StatCard icon={<Download size={20} className="text-teal-600" />} label="Total Installs" value={stats.totalInstalls} color="bg-teal-100" />
                </div>
                {stats.pendingApps > 0 && (
                  <button onClick={() => { setActiveTab('apps'); setAppFilter('pending'); }}
                    className="w-full mt-2 py-3 bg-yellow-500 text-white rounded-2xl font-semibold text-sm hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2">
                    <Package size={16} />
                    Review {stats.pendingApps} Pending App{stats.pendingApps !== 1 ? 's' : ''}
                  </button>
                )}
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 bg-secondary rounded-2xl animate-pulse" />)}
              </div>
            )}
          </div>
        )}

        {/* Apps Tab */}
        {activeTab === 'apps' && (
          <div>
            <div className="relative mb-3">
              <input
                value={appSearch}
                onChange={e => setAppSearch(e.target.value)}
                placeholder="Search by app name or developer..."
                className="w-full px-4 py-2.5 pl-9 rounded-xl border border-border bg-secondary/50 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <Package size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              {appSearch && (
                <button onClick={() => setAppSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <XCircle size={14} className="text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
              {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
                <button key={f} onClick={() => setAppFilter(f)}
                  className={cn('flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold capitalize border transition-colors',
                    appFilter === f
                      ? f === 'pending' ? 'bg-yellow-500 text-white border-yellow-500'
                        : f === 'approved' ? 'bg-green-500 text-white border-green-500'
                        : f === 'rejected' ? 'bg-red-500 text-white border-red-500'
                        : 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:bg-accent')}>
                  {f}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-secondary rounded-2xl animate-pulse" />)}
              </div>
            ) : apps.length === 0 ? (
              <div className="text-center py-16">
                <Package size={40} className="text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-semibold text-foreground">No {appFilter === 'all' ? '' : appFilter} apps</p>
              </div>
            ) : (
              <div className="space-y-3">
                {apps.filter(app =>
                  !appSearch ||
                  app.name.toLowerCase().includes(appSearch.toLowerCase()) ||
                  app.developer_name.toLowerCase().includes(appSearch.toLowerCase())
                ).map(app => (
                  <div key={app.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                    {app.thumbnail && (
                      <img src={app.thumbnail} alt={app.name} className="w-full h-24 object-cover" />
                    )}
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-foreground">{app.name}</p>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                              app.status === 'approved' ? 'bg-green-100 text-green-700' :
                              app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
                              {app.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">By {app.developer_name} · {app.category}</p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">{app.description}</p>
                          <p className="text-xs text-muted-foreground/50 mt-1">
                            Submitted {new Date(app.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => setSelectedApp(app)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-accent transition-colors">
                          <Eye size={13} />Preview
                        </button>
                        {app.status !== 'approved' && (
                          <button onClick={() => handleApprove(app)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors">
                            <CheckCircle size={13} />Approve
                          </button>
                        )}
                        {app.status !== 'rejected' && (
                          <button onClick={() => handleReject(app)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors">
                            <XCircle size={13} />Reject
                          </button>
                        )}
                        {app.status === 'approved' && (
                          <button onClick={() => handleToggleFeatured(app)}
                            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors border',
                              app.featured
                                ? 'bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-600'
                                : 'border-border text-muted-foreground hover:bg-accent')}>
                            <BookmarkCheck size={13} />{app.featured ? 'Featured' : 'Feature'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!appSearch && hasMoreApps && (
                  <button onClick={loadMore} disabled={loadingMore}
                    className="w-full py-3 border border-border rounded-2xl text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-60">
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-secondary rounded-2xl animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((u: Record<string, unknown>) => {
                  const uid = u.id as string;
                  const uRole = u.role as string;
                  const isCurrentUser = uid === user?.id;
                  const isChanging = roleChangingId === uid;
                  return (
                    <div key={uid} className="bg-card border border-border rounded-2xl p-3">
                      <div className="flex items-center gap-3 mb-2.5">
                        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold',
                          ROLE_AVATAR_GRADIENT[uRole] || ROLE_AVATAR_GRADIENT.user)}>
                          {(u.username as string)?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground line-clamp-1">{u.username as string || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{u.email as string}</p>
                        </div>
                        <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0', ROLE_COLORS[uRole] || ROLE_COLORS.user)}>
                          {uRole}
                        </span>
                      </div>
                      {/* Role assignment buttons */}
                      {!isCurrentUser && (
                        <div className="space-y-2">
                          <div className="flex gap-1.5">
                            {(['user', 'developer', 'admin'] as const).map(role => (
                              <button key={role} disabled={uRole === role || isChanging}
                                onClick={() => handleRoleChange(uid, uRole, role)}
                                className={cn('flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                                  uRole === role
                                    ? 'bg-primary text-primary-foreground border-primary cursor-default'
                                    : 'border-border text-muted-foreground hover:bg-accent disabled:opacity-50')}>
                                {role === 'admin' && <Shield size={10} />}
                                {role === 'developer' && <UserCheck size={10} />}
                                {isChanging && uRole !== role ? '...' : role.charAt(0).toUpperCase() + role.slice(1)}
                              </button>
                            ))}
                          </div>
                          {uRole === 'developer' && (
                            <button
                              onClick={async () => {
                                const { data: profile } = await supabase.from('user_profiles').select('verified').eq('id', uid).single();
                                const newVal = !(profile as Record<string, unknown>)?.verified;
                                await supabase.from('user_profiles').update({ verified: newVal }).eq('id', uid);
                                setUsers(prev => prev.map(pu => pu.id === uid ? { ...pu, verified: newVal } : pu));
                                toast.success(newVal ? 'Developer verified!' : 'Verification removed');
                              }}
                              className={cn('w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                                (u.verified as boolean)
                                  ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-50'
                                  : 'border-border text-muted-foreground hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200')}>
                              <BadgeCheck size={11} />
                              {(u.verified as boolean) ? 'Verified Developer ✓' : 'Grant Verified Badge'}
                            </button>
                          )}
                        </div>
                      )}
                      {isCurrentUser && (
                        <p className="text-xs text-muted-foreground text-center py-1">Your account</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <h2 className="font-bold text-base text-foreground">Store Analytics</h2>
            {!analyticsData ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-40 bg-secondary rounded-2xl animate-pulse" />)}</div>
            ) : (
              <>
                {analyticsData.topApps.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-4">
                    <p className="font-bold text-sm text-foreground mb-3">Top Apps by Installs</p>
                    <ResponsiveContainer width="100%" height={Math.max(100, analyticsData.topApps.length * 36)}>
                      <BarChart data={analyticsData.topApps} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                        <Bar dataKey="installs" radius={[0,6,6,0]}>
                          {analyticsData.topApps.map((_: unknown, i: number) => (
                            <Cell key={i} fill={['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#14b8a6'][i%8]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {analyticsData.categoryData.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-4">
                    <p className="font-bold text-sm text-foreground mb-3">Apps by Category</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={analyticsData.categoryData}>
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                        <Bar dataKey="count" radius={[6,6,0,0]}>
                          {analyticsData.categoryData.map((_: unknown, i: number) => (
                            <Cell key={i} fill={['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#14b8a6'][i%8]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {analyticsData.statusData.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-4">
                    <p className="font-bold text-sm text-foreground mb-3">Approval Status Breakdown</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={analyticsData.statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}
                          label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`} labelLine={false}>
                          {analyticsData.statusData.map((entry: { name: string; value: number; color: string }, i: number) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-base text-foreground">App Reports</p>
              <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold">{reports.filter(r => r.status === 'pending').length} pending</span>
            </div>
            {reportsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-secondary rounded-2xl animate-pulse" />)}</div>
            ) : reports.length === 0 ? (
              <div className="text-center py-16">
                <Flag size={36} className="text-muted-foreground/20 mx-auto mb-3" />
                <p className="font-semibold text-foreground">No reports yet</p>
                <p className="text-sm text-muted-foreground mt-1">App reports from users will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => {
                  const rApp = report.apps as Record<string, unknown> | null;
                  const rUser = report.user_profiles as Record<string, unknown> | null;
                  const isPending = report.status === 'pending';
                  return (
                    <div key={report.id as string} className="bg-card border border-border rounded-2xl p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn('w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0',
                          isPending ? 'bg-red-100' : 'bg-secondary')}>
                          <Flag size={16} className={isPending ? 'text-red-600' : 'text-muted-foreground'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="font-semibold text-sm text-foreground">{rApp?.name as string || 'Unknown App'}</p>
                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold',
                              isPending ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                              {report.status as string}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">By {rUser?.username as string || 'Unknown'}</p>
                          <div className="mt-2 bg-secondary/60 rounded-xl px-3 py-2">
                            <p className="text-xs font-semibold text-foreground">{report.reason as string}</p>
                            {report.details && <p className="text-xs text-muted-foreground mt-0.5">{report.details as string}</p>}
                          </div>
                          <p className="text-xs text-muted-foreground/50 mt-1.5">
                            {new Date(report.created_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      {isPending && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={async () => {
                              await supabase.from('reports').update({ status: 'reviewed' }).eq('id', report.id as string);
                              setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'reviewed' } : r));
                              toast.success('Report marked as reviewed');
                            }}
                            className="flex-1 py-2 rounded-xl bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200 transition-colors">
                            Mark Reviewed
                          </button>
                          <button
                            onClick={async () => {
                              await supabase.from('reports').update({ status: 'dismissed' }).eq('id', report.id as string);
                              setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'dismissed' } : r));
                              toast.success('Report dismissed');
                            }}
                            className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-accent transition-colors">
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Featured Slider Tab */}
        {activeTab === 'featured' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-base text-foreground">Featured App Slider</p>
                <p className="text-xs text-muted-foreground mt-0.5">Drag to reorder. Featured apps appear in the homepage banner.</p>
              </div>
              {reordering && <span className="text-xs text-primary font-medium">Saving...</span>}
            </div>

            {featuredLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-secondary rounded-2xl animate-pulse" />)}
              </div>
            ) : featuredApps.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center mx-auto mb-4">
                  <Layers size={28} className="text-muted-foreground" />
                </div>
                <p className="font-semibold text-foreground">No featured apps yet</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Go to the Apps tab, approve an app and click "Feature" to add it here.</p>
                <button onClick={() => { setActiveTab('apps'); setAppFilter('approved'); }}
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:bg-primary/90">
                  Go to Apps
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {featuredApps.map((app, idx) => (
                  <div key={app.id} className="bg-card border border-border rounded-2xl overflow-hidden flex">
                    {/* Thumbnail strip */}
                    {app.thumbnail ? (
                      <img src={app.thumbnail} alt={app.name} className="w-24 h-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-24 flex-shrink-0 flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${app.icon_bg}cc, ${app.icon_bg}55)` }}>
                        <span className="text-white/60 font-black text-2xl">{app.icon}</span>
                      </div>
                    )}
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-muted-foreground/40">#{idx + 1}</span>
                            <p className="font-bold text-sm text-foreground line-clamp-1">{app.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{app.developer_name} · {app.category}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star size={11} className="fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-semibold">{Number(app.avg_rating ?? 0).toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">· {app.downloads_count} installs</span>
                          </div>
                        </div>
                        {/* Order controls */}
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button onClick={() => moveFeatured(idx, 'up')} disabled={idx === 0 || reordering}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-accent disabled:opacity-30 transition-colors">
                            <ChevronUp size={13} />
                          </button>
                          <button onClick={() => moveFeatured(idx, 'down')} disabled={idx === featuredApps.length - 1 || reordering}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-accent disabled:opacity-30 transition-colors">
                            <ChevronDown size={13} />
                          </button>
                        </div>
                        <button onClick={() => handleUnfeature(app)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 border border-border flex-shrink-0 transition-colors">
                          <XCircle size={13} className="text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="bg-secondary/50 rounded-2xl p-4 text-center">
                  <p className="text-xs text-muted-foreground">Use ↑↓ to reorder · ✕ to remove from slider</p>
                  <p className="text-xs text-muted-foreground mt-1">Changes apply to the homepage banner immediately</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedApp && (
        <DBAppDetailModal app={selectedApp} onClose={() => setSelectedApp(null)} onAuthRequired={() => {}} />
      )}
    </div>
  );
};

export default AdminPanel;
