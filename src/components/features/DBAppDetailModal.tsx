import { useState, useEffect } from 'react';
import { DBApp } from '@/types/database';
import { DBReview } from '@/types/database';
import { X, Star, Download, Shield, ChevronDown, ChevronUp, Share2, Bookmark, BookmarkCheck, Trash2, CheckCircle2 } from 'lucide-react';
import AppIcon from './AppIcon';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { fetchAppReviews, submitReview, deleteReview, addToWishlist, removeFromWishlist, isInWishlist, installApp } from '@/lib/api';

interface DBAppDetailModalProps {
  app: DBApp | null;
  onClose: () => void;
  onAuthRequired: () => void;
}

const StarPicker = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((s) => (
      <button key={s} onClick={() => onChange(s)}>
        <Star size={24} className={s <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'} />
      </button>
    ))}
  </div>
);

const DBAppDetailModal = ({ app, onClose, onAuthRequired }: DBAppDetailModalProps) => {
  const { user } = useAuth();
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [reviews, setReviews] = useState<DBReview[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    if (!app) return;
    setShowFullDesc(false);
    setInstalled(false);
    setWishlisted(false);
    setReviewRating(5);
    setReviewComment('');
    setShowReviewForm(false);

    fetchAppReviews(app.id).then(setReviews).catch(() => {});

    if (user) {
      isInWishlist(user.id, app.id).then(setWishlisted).catch(() => {});
    }
  }, [app?.id, user?.id]);

  if (!app) return null;

  const formatReviews = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toString();
  };

  const handleInstall = async () => {
    if (!user) { onAuthRequired(); return; }
    if (installed) { toast.success(`Opening ${app.name}...`); return; }
    setInstalling(true);
    try {
      await installApp(user.id, app.id);
      setInstalled(true);
      // Auto-install: show progress then success
      toast.loading(`Installing ${app.name}...`, { id: 'install-toast' });
      await new Promise(r => setTimeout(r, 1200));
      toast.dismiss('install-toast');
      toast.success(`${app.name} installed successfully!`, {
        description: 'Tap Open to launch the app',
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
    if (!user) { onAuthRequired(); return; }
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
    } catch {
      toast.error('Action failed');
    }
  };

  const handleSubmitReview = async () => {
    if (!user) { onAuthRequired(); return; }
    setSubmittingReview(true);
    try {
      const rev = await submitReview({ app_id: app.id, user_id: user.id, rating: reviewRating, comment: reviewComment });
      setReviews(prev => [{ ...rev, user_profiles: { username: user.username, avatar_url: user.avatar || null, role: user.role } }, ...prev.filter(r => r.user_id !== user.id)]);
      setShowReviewForm(false);
      setReviewComment('');
      toast.success('Review submitted!');
    } catch {
      toast.error('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteReview(reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      toast.success('Review deleted');
    } catch {
      toast.error('Failed to delete review');
    }
  };

  const avgRating = app.avg_rating ?? 0;
  const reviewCount = app.review_count ?? 0;

  // Compute star distribution from reviews
  const starDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length > 0 ? Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100) : 0,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary hover:bg-accent transition-colors">
              <X size={18} />
            </button>
            <div className="flex items-center gap-2">
              <button onClick={handleWishlist} className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary hover:bg-accent transition-colors">
                {wishlisted ? <BookmarkCheck size={18} className="text-primary" /> : <Bookmark size={18} />}
              </button>
              <button onClick={() => toast.success('Link copied!')} className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary hover:bg-accent transition-colors">
                <Share2 size={18} />
              </button>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="xl" />
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-xl text-foreground leading-tight">{app.name}</h2>
              <p className="text-primary text-sm font-medium mt-0.5">{app.developer_name}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {app.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{tag}</span>
                ))}
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                  app.status === 'approved' ? 'bg-green-100 text-green-700' : app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
                  {app.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-border py-4 mx-4">
          <div className="flex flex-col items-center gap-1 px-3">
            <div className="flex items-center gap-1">
              <span className="font-bold text-base">{Number(avgRating).toFixed(1)}</span>
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
            </div>
            <p className="text-xs text-muted-foreground">{formatReviews(reviewCount)} reviews</p>
          </div>
          <div className="flex flex-col items-center gap-1 px-3">
            <div className="flex items-center gap-1">
              <Download size={14} />
              <span className="font-bold text-base">{app.downloads_count >= 1000 ? `${(app.downloads_count / 1000).toFixed(0)}K+` : `${app.downloads_count}+`}</span>
            </div>
            <p className="text-xs text-muted-foreground">Downloads</p>
          </div>
          <div className="flex flex-col items-center gap-1 px-3">
            <div className="flex items-center gap-1">
              <Shield size={14} />
              <span className="font-bold text-sm">{app.content_rating}</span>
            </div>
            <p className="text-xs text-muted-foreground">Rated for</p>
          </div>
        </div>

        {/* Install Button */}
        <div className="px-4 mb-4">
          <button onClick={handleInstall} disabled={installing}
            className={cn('w-full py-3 rounded-full font-semibold text-base transition-all',
              installed ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90',
              installing && 'opacity-70 cursor-not-allowed')}>
            {installing ? 'Installing...' : installed ? 'Open' : 'Install'}
          </button>
        </div>

        {/* Thumbnail */}
        {app.thumbnail && (
          <div className="px-4 mb-3">
            <div className="w-full rounded-2xl overflow-hidden aspect-video">
              <img src={app.thumbnail} alt={`${app.name} thumbnail`} className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        {/* Screenshots */}
        {app.screenshots_urls && app.screenshots_urls.length > 0 ? (
          <div className="px-4 mb-4">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {app.screenshots_urls.map((url, i) => (
                <div key={i} className="flex-shrink-0 w-36 h-64 rounded-2xl overflow-hidden border border-border">
                  <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 mb-4">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex-shrink-0 w-36 h-64 rounded-2xl overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${app.icon_bg}33, ${app.icon_bg}88)` }}>
                  <div className="w-full h-full flex items-center justify-center">
                    <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="lg" className="opacity-30" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="px-4 mb-4">
          <h3 className="font-bold text-base mb-2">About this app</h3>
          <p className={cn('text-sm text-muted-foreground leading-relaxed', !showFullDesc && 'line-clamp-3')}>
            {app.description}
          </p>
          <button onClick={() => setShowFullDesc(!showFullDesc)} className="flex items-center gap-1 text-primary text-sm font-medium mt-2">
            {showFullDesc ? <><ChevronUp size={16} />Show less</> : <><ChevronDown size={16} />Read more</>}
          </button>
        </div>

        {/* Review Analytics */}
        {reviews.length > 0 && (
          <div className="px-4 mb-4">
            <h3 className="font-bold text-base mb-3">Rating Breakdown</h3>
            <div className="flex gap-4">
              <div className="flex flex-col items-center justify-center">
                <p className="text-4xl font-black text-foreground">{Number(avgRating).toFixed(1)}</p>
                <div className="flex gap-0.5 my-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={12} className={s <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{reviewCount} reviews</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {starDist.map(({ star, pct }) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-2 text-right">{star}</span>
                    <Star size={10} className="fill-yellow-400 text-yellow-400 flex-shrink-0" />
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-7 text-right">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-base">Reviews & Ratings</h3>
            {user && user.role === 'user' && (
              <button onClick={() => setShowReviewForm(!showReviewForm)}
                className="text-sm text-primary font-semibold hover:underline">
                {showReviewForm ? 'Cancel' : 'Write Review'}
              </button>
            )}
          </div>

          {showReviewForm && (
            <div className="bg-secondary/50 rounded-2xl p-4 mb-4 space-y-3">
              <StarPicker value={reviewRating} onChange={setReviewRating} />
              <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                placeholder="Share your experience..." rows={3}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm outline-none focus:border-primary resize-none" />
              <button onClick={handleSubmitReview} disabled={submittingReview}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-60">
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          )}

          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No reviews yet. Be the first!</p>
          ) : (
            <div className="space-y-3">
              {reviews.slice(0, 5).map(review => (
                <div key={review.id} className="bg-secondary/40 rounded-2xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">
                          {(review.user_profiles?.username || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{review.user_profiles?.username || 'Anonymous'}</p>
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={11} className={s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'} />
                          ))}
                        </div>
                      </div>
                    </div>
                    {user && (user.id === review.user_id || user.role === 'developer') && (
                      <button onClick={() => handleDeleteReview(review.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                  </div>
                  {review.comment && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{review.comment}</p>}
                  <p className="text-xs text-muted-foreground/60 mt-1.5">{new Date(review.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* App Info */}
        <div className="px-4 mb-8">
          <h3 className="font-bold text-base mb-3">App info</h3>
          <div className="space-y-0">
            {[
              { label: 'Version', value: app.version },
              { label: 'Category', value: app.category },
              { label: 'Size', value: app.size },
              { label: 'Content rating', value: app.content_rating },
              { label: 'Price', value: app.price === 0 ? 'Free' : `$${app.price}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2.5 border-b border-border/50 last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DBAppDetailModal;
