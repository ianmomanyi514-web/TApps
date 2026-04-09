import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { DBApp, DBReview } from '@/types/database';
import {
  ArrowLeft, Star, Download, Shield, Share2, Bookmark, BookmarkCheck,
  ChevronDown, ChevronUp, Trash2, CheckCircle2, X, Tag, Smartphone,
  Flag, MessageSquareQuote, Send, BadgeCheck
} from 'lucide-react';
import AppIcon from '@/components/features/AppIcon';
import StarRating from '@/components/features/StarRating';
import ReviewComments from '@/components/features/ReviewComments';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchAppReviews, submitReview, deleteReview,
  addToWishlist, removeFromWishlist, isInWishlist, installApp, fetchApprovedApps
} from '@/lib/api';

const REPORT_REASONS = [
  'Spam or misleading',
  'Inappropriate content',
  'Malware or virus',
  'Copyright infringement',
  'Privacy violation',
  'Other',
];

type ReviewWithResponse = DBReview & { developer_response?: string; developer_response_at?: string };

const StarPicker = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((s) => (
      <button key={s} onClick={() => onChange(s)}>
        <Star size={26} className={s <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'} />
      </button>
    ))}
  </div>
);

const AppDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [app, setApp] = useState<DBApp | null>(null);
  const [reviews, setReviews] = useState<ReviewWithResponse[]>([]);
  const [relatedApps, setRelatedApps] = useState<DBApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [versionHistory, setVersionHistory] = useState<{ id: string; version: string; changelog: string | null; created_at: string }[]>([]);
  const [showAllVersions, setShowAllVersions] = useState(false);
  // Update changelog view
  const [updateNotifId, setUpdateNotifId] = useState<string | null>(null);
  const [updateChangelog, setUpdateChangelog] = useState<{ version: string; changelog: string | null } | null>(null);
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  // Report
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);
  // Developer responses
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  useEffect(() => {
    const fromUpdate = searchParams.get('from_update');
    const notifId = searchParams.get('notif');
    if (fromUpdate === '1' && notifId) setUpdateNotifId(notifId);
  }, [searchParams]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    supabase
      .from('apps_with_stats')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { navigate('/'); return; }
        setApp(data as DBApp);
        fetchApprovedApps({ category: data.category, page: 0 })
          .then(all => setRelatedApps(all.filter(a => a.id !== id).slice(0, 8)))
          .catch(() => {});
      });

    fetchAppReviews(id).then(data => {
      setReviews(data as ReviewWithResponse[]);
    }).catch(() => {});

    supabase
      .from('app_versions')
      .select('*')
      .eq('app_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const versions = (data || []) as { id: string; version: string; changelog: string | null; created_at: string }[];
        setVersionHistory(versions);
        if (updateNotifId && versions.length > 0) {
          setUpdateChangelog(versions[0]);
          setShowChangelogModal(true);
        }
      })
      .catch(() => {});

    if (user) {
      isInWishlist(user.id, id).then(setWishlisted).catch(() => {});
      supabase.from('installs').select('id').eq('user_id', user.id).eq('app_id', id).maybeSingle()
        .then(({ data }) => { if (data) setInstalled(true); });
      supabase.from('reports').select('id').eq('user_id', user.id).eq('app_id', id).maybeSingle()
        .then(({ data }) => { if (data) setAlreadyReported(true); });
    }

    setLoading(false);
  }, [id, user?.id]);

  useEffect(() => {
    if (updateNotifId && versionHistory.length > 0 && !showChangelogModal) {
      setUpdateChangelog(versionHistory[0]);
      setShowChangelogModal(true);
    }
  }, [updateNotifId, versionHistory.length]);

  if (loading || !app) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto">
        <div className="h-64 bg-secondary animate-pulse" />
        <div className="p-4 space-y-4">
          <div className="h-8 bg-secondary rounded animate-pulse w-2/3" />
          <div className="h-4 bg-secondary rounded animate-pulse w-1/3" />
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-secondary rounded-2xl animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  const avgRating = Number(app.avg_rating ?? 0);
  const reviewCount = app.review_count ?? 0;
  const starDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length > 0 ? Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100) : 0,
  }));

  const formatNum = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toString();
  };

  const handleInstall = async () => {
    if (!user) { toast.error('Sign in to install apps'); return; }
    if (installed) { toast.success(`Opening ${app.name}...`); return; }
    setInstalling(true);
    try {
      await installApp(user.id, app.id);
      setInstalled(true);
      toast.loading(`Installing ${app.name}...`, { id: 'install-toast' });
      await new Promise(r => setTimeout(r, 1200));
      toast.dismiss('install-toast');
      toast.success(`${app.name} installed!`, {
        description: 'Tap Open to launch',
        icon: <CheckCircle2 size={16} className="text-green-500" />,
        duration: 4000,
      });
    } catch {
      toast.dismiss('install-toast');
      toast.error('Installation failed');
    } finally {
      setInstalling(false);
    }
  };

  const handleWishlist = async () => {
    if (!user) { toast.error('Sign in to save apps'); return; }
    try {
      if (wishlisted) {
        await removeFromWishlist(user.id, app.id);
        setWishlisted(false);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist(user.id, app.id);
        setWishlisted(true);
        toast.success('Added to wishlist');
      }
    } catch { toast.error('Action failed'); }
  };

  const handleSubmitReview = async () => {
    if (!user) { toast.error('Sign in to review'); return; }
    setSubmittingReview(true);
    try {
      const rev = await submitReview({ app_id: app.id, user_id: user.id, rating: reviewRating, comment: reviewComment });
      setReviews(prev => [{ ...rev, user_profiles: { username: user.username, avatar_url: user.avatar || null, role: user.role } }, ...prev.filter(r => r.user_id !== user.id)]);
      setShowReviewForm(false);
      setReviewComment('');
      toast.success('Review submitted!');
    } catch { toast.error('Failed to submit review'); }
    finally { setSubmittingReview(false); }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteReview(reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      toast.success('Review deleted');
    } catch { toast.error('Failed to delete review'); }
  };

  const handleTagClick = (tag: string) => {
    navigate(`/search?tag=${encodeURIComponent(tag)}`);
  };

  const handleReport = async () => {
    if (!user || !reportReason) return;
    setReportSubmitting(true);
    const { error } = await supabase.from('reports').insert({
      app_id: app.id,
      user_id: user.id,
      reason: reportReason,
      details: reportDetails.trim() || null,
    });
    setReportSubmitting(false);
    if (error && error.code === '23505') {
      toast.error('You already reported this app');
      setAlreadyReported(true);
    } else if (error) {
      toast.error('Failed to submit report');
    } else {
      toast.success('Report submitted. Thank you!');
      setAlreadyReported(true);
      setShowReportModal(false);
    }
  };

  const handleDevResponse = async (reviewId: string) => {
    if (!user || !responseText.trim()) return;
    if (user.id !== app.developer_id && user.role !== 'admin') return;
    setSubmittingResponse(true);
    const { error } = await supabase.from('reviews')
      .update({ developer_response: responseText.trim(), developer_response_at: new Date().toISOString() })
      .eq('id', reviewId);
    setSubmittingResponse(false);
    if (error) { toast.error('Failed to post response'); return; }
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, developer_response: responseText.trim() } : r));
    setRespondingTo(null);
    setResponseText('');
    toast.success('Response posted!');
  };

  const dismissUpdateModal = async () => {
    setShowChangelogModal(false);
    if (updateNotifId) {
      await supabase.from('notifications').update({ read: true }).eq('id', updateNotifId);
    }
  };

  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3);
  const isDevOrAdmin = user && (user.id === app.developer_id || user.role === 'admin');

  return (
    <div className="min-h-screen bg-white pb-28 max-w-lg mx-auto">
      {/* Changelog/Update Modal */}
      {showChangelogModal && updateChangelog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismissUpdateModal} />
          <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl">
            <div className="px-5 pt-5 pb-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
                    <ArrowLeft size={16} className="text-orange-600 rotate-180" />
                  </div>
                  <div>
                    <p className="font-bold text-base text-foreground">What's New</p>
                    <p className="text-xs text-muted-foreground">{app.name} · v{updateChangelog.version}</p>
                  </div>
                </div>
                <button onClick={dismissUpdateModal} className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {updateChangelog.changelog || 'Bug fixes and performance improvements.'}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={dismissUpdateModal}
                  className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-accent transition-colors">
                  Later
                </button>
                <button onClick={() => { dismissUpdateModal(); handleInstall(); }}
                  className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors">
                  Update Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReportModal(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="px-5 pt-5 pb-4 border-b border-border/50 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
                    <Flag size={15} className="text-red-600" />
                  </div>
                  <div>
                    <p className="font-bold text-base">Report App</p>
                    <p className="text-xs text-muted-foreground">{app.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowReportModal(false)} className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reason for report</p>
                {REPORT_REASONS.map(reason => (
                  <button key={reason} onClick={() => setReportReason(reason)}
                    className={cn('w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium text-left transition-colors',
                      reportReason === reason
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : 'border-border hover:bg-accent text-foreground')}>
                    {reason}
                    {reportReason === reason && (
                      <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Additional details (optional)</p>
                <textarea value={reportDetails} onChange={e => setReportDetails(e.target.value)}
                  rows={3} placeholder="Provide more context about this issue..."
                  className="w-full px-4 py-3 rounded-xl border border-border text-sm outline-none focus:border-red-400 resize-none transition-colors" />
              </div>
              <button onClick={handleReport} disabled={!reportReason || reportSubmitting}
                className="w-full py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 disabled:opacity-50 transition-colors">
                {reportSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
              <p className="text-xs text-muted-foreground text-center">Reports are reviewed by our admin team within 24 hours.</p>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative">
        {app.thumbnail ? (
          <div className="relative">
            <img src={app.thumbnail} alt={app.name} className="w-full h-56 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </div>
        ) : (
          <div className="w-full h-56 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${app.icon_bg}cc, ${app.icon_bg}55)` }}>
            <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="xl" className="opacity-20 scale-[3]" />
          </div>
        )}

        <button onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors">
          <ArrowLeft size={20} />
        </button>

        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={handleWishlist}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors">
            {wishlisted ? <BookmarkCheck size={18} className="text-yellow-300" /> : <Bookmark size={18} />}
          </button>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors">
            <Share2 size={18} />
          </button>
          {user && !isDevOrAdmin && (
            <button
              onClick={() => alreadyReported ? toast.info('Already reported') : setShowReportModal(true)}
              className={cn('w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-sm text-white transition-colors',
                alreadyReported ? 'bg-red-500/70' : 'bg-black/40 hover:bg-red-500/60')}>
              <Flag size={16} />
            </button>
          )}
        </div>
      </div>

      {/* App Info Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border/40">
        <div className="flex items-start gap-4">
          <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="xl" />
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-xl text-foreground leading-tight">{app.name}</h1>
            <button
              onClick={() => navigate(`/developer/${app.developer_id}`)}
              className="flex items-center gap-1 text-primary font-semibold text-sm mt-0.5 hover:underline text-left">
              {app.developer_name}
              {app.developer_verified && (
                <span title="Verified Developer" className="inline-flex items-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" className="flex-shrink-0">
                    <circle cx="12" cy="12" r="12" fill="#3b82f6"/>
                    <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
            </button>
            {app.tags && app.tags.filter(t => t !== 'update-pending').length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {app.tags.filter(t => t !== 'update-pending').slice(0, 4).map(tag => (
                  <button key={tag} onClick={() => handleTagClick(tag)}
                    className="flex items-center gap-1 text-xs bg-primary/8 hover:bg-primary/15 text-primary px-2.5 py-0.5 rounded-full font-medium border border-primary/20 transition-colors">
                    <Tag size={9} />{tag}
                  </button>
                ))}
                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-semibold">
                  {app.content_rating}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button onClick={handleInstall} disabled={installing}
            className={cn('flex-1 py-3 rounded-full font-bold text-base transition-all shadow-sm',
              installed ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90',
              installing && 'opacity-70 cursor-not-allowed')}>
            {installing ? 'Installing...' : installed ? 'Open' : app.price === 0 ? 'Install' : `Buy $${app.price}`}
          </button>
          {app.apk_url && (
            <a href={app.apk_url} download
              className="flex items-center gap-2 px-4 py-3 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-accent transition-colors flex-shrink-0">
              <Smartphone size={16} />APK
            </a>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 divide-x divide-border/50 py-4 bg-white">
        <div className="flex flex-col items-center gap-1 px-3">
          <div className="flex items-center gap-1">
            <span className="font-black text-lg">{avgRating.toFixed(1)}</span>
            <Star size={14} className="fill-yellow-400 text-yellow-400" />
          </div>
          <p className="text-xs text-muted-foreground">{formatNum(reviewCount)} reviews</p>
        </div>
        <div className="flex flex-col items-center gap-1 px-3">
          <div className="flex items-center gap-1">
            <Download size={14} className="text-muted-foreground" />
            <span className="font-black text-lg">{app.downloads_count >= 1000 ? `${(app.downloads_count/1000).toFixed(0)}K+` : `${app.downloads_count}+`}</span>
          </div>
          <p className="text-xs text-muted-foreground">Downloads</p>
        </div>
        <div className="flex flex-col items-center gap-1 px-3">
          <div className="flex items-center gap-1">
            <Shield size={14} className="text-muted-foreground" />
            <span className="font-black text-sm">{app.content_rating}</span>
          </div>
          <p className="text-xs text-muted-foreground">Rated for</p>
        </div>
      </div>

      {/* Screenshots Gallery */}
      {(app.screenshots_urls && app.screenshots_urls.length > 0) && (
        <div className="py-4 border-t border-border/40">
          <h2 className="px-4 font-bold text-base text-foreground mb-3">Screenshots</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
            {app.screenshots_urls.map((url, i) => (
              <button key={i} onClick={() => setLightboxImg(url)}
                className="flex-shrink-0 w-44 h-80 rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow">
                <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="px-4 py-4 border-t border-border/40">
        <h2 className="font-bold text-base text-foreground mb-2">About this app</h2>
        <p className={cn('text-sm text-muted-foreground leading-relaxed', !showFullDesc && 'line-clamp-4')}>
          {app.description}
        </p>
        <button onClick={() => setShowFullDesc(!showFullDesc)}
          className="flex items-center gap-1 text-primary text-sm font-semibold mt-2">
          {showFullDesc ? <><ChevronUp size={16} />Show less</> : <><ChevronDown size={16} />Read more</>}
        </button>

        {app.tags && app.tags.filter(t => t !== 'update-pending').length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/40">
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Tag size={11} />Browse similar
            </p>
            <div className="flex flex-wrap gap-2">
              {app.tags.filter(t => t !== 'update-pending').map(tag => (
                <button key={tag} onClick={() => handleTagClick(tag)}
                  className="text-xs bg-secondary hover:bg-primary/10 hover:text-primary text-muted-foreground px-3 py-1.5 rounded-full font-medium border border-border hover:border-primary/30 transition-all">
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* App Info Table */}
      <div className="px-4 py-4 border-t border-border/40">
        <h2 className="font-bold text-base text-foreground mb-3">App details</h2>
        <div className="bg-secondary/40 rounded-2xl overflow-hidden">
          {[
            { label: 'Version', value: app.version },
            { label: 'Category', value: app.category },
            { label: 'Type', value: app.type === 'game' ? 'Game' : 'App' },
            { label: 'Size', value: app.size },
            { label: 'Content rating', value: app.content_rating },
            { label: 'Price', value: app.price === 0 ? 'Free' : `$${app.price}` },
            { label: 'Released', value: new Date(app.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
            ...(app.apk_url ? [{ label: 'APK', value: 'Available for download' }] : []),
          ].map(({ label, value }, idx, arr) => (
            <div key={label} className={cn('flex justify-between items-center px-4 py-3',
              idx < arr.length - 1 && 'border-b border-border/50')}>
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-semibold text-foreground">{value}</span>
            </div>
          ))}
        </div>
        {app.apk_url && (
          <a href={app.apk_url} download
            className="mt-3 flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-accent transition-colors">
            <Smartphone size={16} className="text-primary" />Download APK File
          </a>
        )}
      </div>

      {/* Ratings & Reviews */}
      <div className="px-4 py-4 border-t border-border/40">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base text-foreground">Ratings & Reviews</h2>
          {user && user.id !== app.developer_id && user.role !== 'admin' && (
            <button onClick={() => setShowReviewForm(!showReviewForm)}
              className="text-sm text-primary font-bold hover:underline">
              {showReviewForm ? 'Cancel' : 'Write Review'}
            </button>
          )}
        </div>

        {reviews.length > 0 && (
          <div className="flex gap-5 mb-5 bg-secondary/40 rounded-2xl p-4">
            <div className="flex flex-col items-center justify-center min-w-[72px]">
              <p className="text-5xl font-black text-foreground leading-none">{avgRating.toFixed(1)}</p>
              <div className="flex gap-0.5 my-1.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={13} className={s <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20'} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{formatNum(reviewCount)}</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {starDist.map(({ star, pct }) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-2">{star}</span>
                  <Star size={10} className="fill-yellow-400 text-yellow-400 flex-shrink-0" />
                  <div className="flex-1 h-2 bg-white rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-yellow-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-7 text-right">{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showReviewForm && (
          <div className="bg-secondary/40 rounded-2xl p-4 mb-5 space-y-3">
            <p className="font-semibold text-sm text-foreground">Your Review</p>
            <StarPicker value={reviewRating} onChange={setReviewRating} />
            <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
              placeholder="Share your experience with this app..." rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm outline-none focus:border-primary resize-none" />
            <button onClick={handleSubmitReview} disabled={submittingReview}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-60">
              {submittingReview ? 'Submitting...' : 'Post Review'}
            </button>
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="text-center py-10">
            <Star size={36} className="text-muted-foreground/20 mx-auto mb-3" />
            <p className="font-semibold text-foreground">No reviews yet</p>
            <p className="text-sm text-muted-foreground mt-1">Be the first to review this app</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleReviews.map(review => (
              <div key={review.id} className="bg-secondary/40 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">
                        {(review.user_profiles?.username || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{review.user_profiles?.username || 'Anonymous'}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={12} className={s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20'} />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  {user && (user.id === review.user_id || user.role === 'admin') && (
                    <button onClick={() => handleDeleteReview(review.id)}
                      className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
                      <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>

                {review.comment && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                )}

                {/* Developer Response */}
                {review.developer_response ? (
                  <div className="mt-3 ml-1 pl-3 border-l-2 border-emerald-300 bg-emerald-50/60 rounded-r-xl py-2 pr-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BadgeCheck size={13} className="text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700">Developer Response</span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">{review.developer_response}</p>
                  </div>
                ) : isDevOrAdmin ? (
                  <>
                    <button
                      onClick={() => { setRespondingTo(review.id); setResponseText(''); }}
                      className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold mt-2 transition-colors">
                      <MessageSquareQuote size={12} />Reply as Developer
                    </button>
                    {respondingTo === review.id && (
                      <div className="mt-2 flex gap-2 items-center">
                        <div className="flex-1 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                          <input
                            autoFocus
                            value={responseText}
                            onChange={e => setResponseText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleDevResponse(review.id)}
                            placeholder="Write your public response..."
                            className="flex-1 bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground"
                          />
                          <button onClick={() => handleDevResponse(review.id)}
                            disabled={submittingResponse || !responseText.trim()}
                            className="text-emerald-600 disabled:opacity-40">
                            <Send size={13} />
                          </button>
                        </div>
                        <button onClick={() => setRespondingTo(null)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-secondary flex-shrink-0">
                          <X size={13} className="text-muted-foreground" />
                        </button>
                      </div>
                    )}
                  </>
                ) : null}

                <ReviewComments reviewId={review.id} reviewUserId={review.user_id} />
              </div>
            ))}
            {reviews.length > 3 && (
              <button onClick={() => setShowAllReviews(!showAllReviews)}
                className="w-full py-3 rounded-2xl border border-border text-sm font-semibold text-foreground hover:bg-accent transition-colors">
                {showAllReviews ? 'Show fewer reviews' : `See all ${reviews.length} reviews`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Version History */}
      {versionHistory.length > 0 && (
        <div className="px-4 py-4 border-t border-border/40">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base text-foreground">What's New</h2>
            <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full font-medium">v{app.version}</span>
          </div>
          <div className="relative">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/60" />
            <div className="space-y-4">
              {(showAllVersions ? versionHistory : versionHistory.slice(0, 3)).map((ver, idx) => (
                <div key={ver.id} className="flex gap-3 relative">
                  <div className={cn('w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 z-10 mt-0.5',
                    idx === 0 ? 'bg-primary' : 'bg-secondary border border-border')}>
                    <div className={cn('w-2 h-2 rounded-full', idx === 0 ? 'bg-white' : 'bg-muted-foreground/40')} />
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn('text-xs font-bold', idx === 0 ? 'text-primary' : 'text-foreground')}>v{ver.version}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ver.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {idx === 0 && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">Latest</span>}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {ver.changelog || 'Bug fixes and performance improvements.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {versionHistory.length > 3 && (
            <button onClick={() => setShowAllVersions(!showAllVersions)}
              className="flex items-center gap-1 text-primary text-sm font-semibold mt-3">
              {showAllVersions ? <><ChevronUp size={16} />Show less</> : <><ChevronDown size={16} />Show all {versionHistory.length} versions</>}
            </button>
          )}
        </div>
      )}

      {/* Similar Apps Section */}
      {relatedApps.length > 0 && (
        <div className="py-4 border-t border-border/40">
          <div className="px-4 mb-3">
            <h2 className="font-bold text-base text-foreground">Users Also Install</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Similar apps in {app.category}</p>
          </div>
          <div className="space-y-1 px-2">
            {relatedApps.slice(0, 5).map((related, idx) => (
              <button key={related.id} onClick={() => navigate(`/app/${related.id}`)}
                className="flex items-center gap-3 w-full p-2.5 hover:bg-accent/50 rounded-xl transition-colors text-left">
                <span className="w-5 text-center text-xs font-black text-muted-foreground/30 flex-shrink-0">{idx + 1}</span>
                <AppIcon icon={related.icon} iconBg={related.icon_bg} name={related.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground line-clamp-1">{related.name}</p>
                  <p className="text-xs text-muted-foreground">{related.developer_name}</p>
                  <StarRating rating={Number(related.avg_rating ?? 0)} size={11} />
                </div>
                <div className="flex-shrink-0">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                    {related.price === 0 ? 'Free' : `$${related.price}`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fixed Bottom Install Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-border/60 px-4 py-3 z-30">
        <div className="flex items-center gap-3">
          <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground truncate">{app.name}</p>
            <p className="text-xs text-muted-foreground">{app.price === 0 ? 'Free' : `$${app.price}`}</p>
          </div>
          {app.apk_url && (
            <a href={app.apk_url} download
              className="px-3 py-2.5 rounded-full border border-border text-xs font-bold text-foreground hover:bg-accent transition-colors flex items-center gap-1">
              <Smartphone size={13} />APK
            </a>
          )}
          <button onClick={handleInstall} disabled={installing}
            className={cn('px-6 py-2.5 rounded-full font-bold text-sm transition-all',
              installed ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90',
              installing && 'opacity-70 cursor-not-allowed')}>
            {installing ? '...' : installed ? 'Open' : 'Install'}
          </button>
        </div>
      </div>

      {/* Screenshot Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white">
            <X size={20} />
          </button>
          <img src={lightboxImg} alt="Screenshot" className="max-w-full max-h-full rounded-2xl object-contain" />
        </div>
      )}
    </div>
  );
};

export default AppDetailPage;
