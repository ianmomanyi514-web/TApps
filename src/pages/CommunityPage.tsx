import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Heart, MessageSquare, Plus, X, ChevronDown, ChevronUp, Send,
  Lightbulb, Monitor, HelpCircle, MessageCircle, Flame, Search,
  Share2, Bookmark, TrendingUp, Clock, BadgeCheck, Image as ImageIcon,
  MoreHorizontal, Trash2, Award
} from 'lucide-react';
import AppIcon from '@/components/features/AppIcon';
import { useNavigate } from 'react-router-dom';
import { uploadFileViaXHR } from '@/lib/api';

interface CommunityPost {
  id: string;
  user_id: string;
  app_id: string | null;
  title: string;
  content: string;
  type: 'idea' | 'showcase' | 'question' | 'feedback';
  likes_count: number;
  created_at: string;
  image_url?: string | null;
  user_profiles?: { username: string; avatar_url: string | null; role: string; verified?: boolean };
  apps?: { id: string; name: string; icon: string; icon_bg: string } | null;
  user_liked?: boolean;
  comment_count?: number;
}

interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_profiles?: { username: string; avatar_url: string | null };
}

interface ConnectedApp {
  id: string;
  name: string;
  icon: string;
  icon_bg: string;
}

const TYPE_CONFIG = {
  idea:     { label: 'Idea',     icon: Lightbulb,     color: 'bg-purple-100 text-purple-700 border-purple-200',  dot: 'bg-purple-500' },
  showcase: { label: 'Showcase', icon: Monitor,        color: 'bg-blue-100 text-blue-700 border-blue-200',       dot: 'bg-blue-500' },
  question: { label: 'Question', icon: HelpCircle,     color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  feedback: { label: 'Feedback', icon: MessageCircle,  color: 'bg-green-100 text-green-700 border-green-200',    dot: 'bg-green-500' },
};

const SORT_OPTIONS = [
  { id: 'new',     label: 'New',     icon: Clock },
  { id: 'top',     label: 'Top',     icon: TrendingUp },
  { id: 'hot',     label: 'Hot',     icon: Flame },
] as const;

type SortOption = typeof SORT_OPTIONS[number]['id'];

interface CommunityPageProps {
  onAuthRequired: () => void;
}

// ── Avatar Helper ────────────────────────────────────────────────
const UserAvatar = ({ username, avatarUrl, size = 8 }: { username: string; avatarUrl?: string | null; size?: number }) => (
  <div className={`w-${size} h-${size} rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center`}
    style={{ width: `${size * 4}px`, height: `${size * 4}px` }}>
    {avatarUrl
      ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
      : <span className="text-white font-bold" style={{ fontSize: `${size * 1.5}px` }}>{(username || 'U')[0].toUpperCase()}</span>
    }
  </div>
);

// ── Post Card ────────────────────────────────────────────────────
const PostCard = ({
  post,
  currentUserId,
  onLike,
  onDelete,
}: {
  post: CommunityPost;
  currentUserId: string | null;
  onLike: (postId: string, liked: boolean) => void;
  onDelete?: (postId: string) => void;
}) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [saved, setSaved] = useState(false);

  const TypeIcon = TYPE_CONFIG[post.type]?.icon || Lightbulb;
  const typeConfig = TYPE_CONFIG[post.type] || TYPE_CONFIG.idea;
  const liked = post.user_liked || false;
  const isOwner = currentUserId === post.user_id;
  const username = post.user_profiles?.username || 'Unknown';
  const isVerified = post.user_profiles?.verified;

  const loadComments = async () => {
    if (!commentsLoaded) {
      const { data } = await supabase
        .from('community_comments')
        .select('*, user_profiles(username, avatar_url)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      setComments((data || []) as CommunityComment[]);
      setCommentsLoaded(true);
    }
    setShowComments(v => !v);
  };

  const handleComment = async () => {
    if (!currentUserId || !commentText.trim()) return;
    setCommentLoading(true);
    const { data, error } = await supabase.from('community_comments').insert({
      post_id: post.id,
      user_id: currentUserId,
      content: commentText.trim(),
    }).select('*, user_profiles(username, avatar_url)').single();
    setCommentLoading(false);
    if (error) { toast.error('Failed to post comment'); return; }
    setComments(prev => [...prev, data as CommunityComment]);
    setCommentText('');
  };

  const handleShare = async () => {
    const text = `${post.title}\n\n${post.content.slice(0, 100)}...`;
    if (navigator.share) {
      await navigator.share({ title: post.title, text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    setShowMenu(false);
    await supabase.from('community_posts').delete().eq('id', post.id);
    onDelete?.(post.id);
    toast.success('Post deleted');
  };

  const timeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-0">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <UserAvatar username={username} avatarUrl={post.user_profiles?.avatar_url} size={9} />
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-foreground">{username}</p>
                {isVerified && <BadgeCheck size={13} className="text-blue-500 flex-shrink-0" />}
                {post.user_profiles?.role === 'developer' && (
                  <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">DEV</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">{timeSince(post.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border', typeConfig.color)}>
              <TypeIcon size={10} />{typeConfig.label}
            </span>
            {isOwner && (
              <div className="relative">
                <button onClick={() => setShowMenu(v => !v)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-accent transition-colors">
                  <MoreHorizontal size={14} className="text-muted-foreground" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-8 bg-white border border-border rounded-xl shadow-lg z-20 py-1 min-w-[120px]">
                    <button onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/5 transition-colors">
                      <Trash2 size={12} />Delete Post
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <h3 className="font-bold text-base text-foreground mb-2 leading-tight">{post.title}</h3>
        <p className={cn('text-sm text-muted-foreground leading-relaxed', !expanded && 'line-clamp-4')}>
          {post.content}
        </p>
        {post.content.length > 200 && (
          <button onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-primary font-semibold mt-1">
            {expanded ? <><ChevronUp size={11} />Show less</> : <><ChevronDown size={11} />Read more</>}
          </button>
        )}

        {/* Post Image */}
        {post.image_url && (
          <div className="mt-3 rounded-xl overflow-hidden border border-border">
            <img src={post.image_url} alt="Post image" className="w-full object-cover max-h-64" />
          </div>
        )}

        {/* Linked App */}
        {post.apps && (
          <button onClick={() => navigate(`/app/${post.app_id}`)}
            className="flex items-center gap-2 mt-3 p-2.5 bg-secondary/60 rounded-xl hover:bg-accent/60 transition-colors w-full text-left border border-border/30">
            <AppIcon icon={post.apps.icon} iconBg={post.apps.icon_bg} name={post.apps.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground">{post.apps.name}</p>
              <p className="text-[10px] text-muted-foreground">Linked app · tap to view</p>
            </div>
          </button>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-1 px-4 py-3 mt-2 border-t border-border/40">
        <button
          onClick={() => onLike(post.id, liked)}
          disabled={!currentUserId}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95',
            liked ? 'bg-red-50 text-red-600 border border-red-200' : 'hover:bg-accent text-muted-foreground'
          )}>
          <Heart size={14} className={liked ? 'fill-red-500 text-red-500' : ''} />
          {post.likes_count > 0 && <span>{post.likes_count}</span>}
          <span>{liked ? 'Liked' : 'Like'}</span>
        </button>

        <button onClick={loadComments}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-accent text-muted-foreground transition-colors">
          <MessageSquare size={14} />
          <span>{comments.length > 0 ? comments.length : (post.comment_count || 0)}</span>
          <span>Comments</span>
        </button>

        <div className="flex-1" />

        <button onClick={() => { setSaved(v => !v); if (!saved) toast.success('Saved to bookmarks'); }}
          className={cn('w-8 h-8 flex items-center justify-center rounded-xl transition-colors',
            saved ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-accent')}>
          <Bookmark size={14} className={saved ? 'fill-primary' : ''} />
        </button>

        <button onClick={handleShare}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-accent transition-colors">
          <Share2 size={14} />
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-border/40 bg-secondary/20">
          <div className="px-4 py-3 space-y-3 max-h-72 overflow-y-auto">
            {comments.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">No comments yet. Be first!</p>
            )}
            {comments.map(c => (
              <div key={c.id} className="flex gap-2">
                <UserAvatar username={c.user_profiles?.username || 'U'} avatarUrl={c.user_profiles?.avatar_url} size={6} />
                <div className="flex-1 bg-white rounded-2xl px-3 py-2 border border-border/30">
                  <p className="text-[10px] font-bold text-foreground mb-0.5">{c.user_profiles?.username || 'User'}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
          {currentUserId ? (
            <div className="flex gap-2 items-center px-4 pb-3">
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && !commentLoading && handleComment()}
                placeholder="Write a comment..."
                className="flex-1 px-3 py-2.5 bg-white border border-border rounded-xl text-xs outline-none focus:border-primary transition-colors"
              />
              <button onClick={handleComment}
                disabled={!commentText.trim() || commentLoading}
                className="w-9 h-9 flex items-center justify-center bg-primary rounded-xl disabled:opacity-40 transition-colors hover:bg-primary/90">
                <Send size={14} className="text-white" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center pb-3">Sign in to comment</p>
          )}
        </div>
      )}
    </div>
  );
};

// ── New Post Modal ───────────────────────────────────────────────
const NewPostModal = ({
  onClose,
  onPosted,
  developerApps,
  userId,
}: {
  onClose: () => void;
  onPosted: (post: CommunityPost) => void;
  developerApps: ConnectedApp[];
  userId: string;
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'idea' | 'showcase' | 'question' | 'feedback'>('idea');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const imageRef = useRef<HTMLInputElement>(null);

  const handleImage = (f: File) => {
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const handlePost = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    let imageUrl: string | null = null;
    if (imageFile) {
      setUploadPct(1);
      imageUrl = await uploadFileViaXHR(
        imageFile,
        `${userId}/community/${Date.now()}.${imageFile.name.split('.').pop()}`,
        imageFile.type,
        (pct) => setUploadPct(pct)
      ).catch(() => null);
      setUploadPct(0);
    }
    const { data, error } = await supabase.from('community_posts').insert({
      user_id: userId,
      title: title.trim(),
      content: content.trim(),
      type,
      app_id: selectedAppId || null,
      image_url: imageUrl,
    }).select('*, user_profiles(username, avatar_url, role, verified), apps(id, name, icon, icon_bg)').single();
    setSubmitting(false);
    if (error) { toast.error('Failed to post'); return; }
    toast.success('Posted to community!');
    onPosted(data as CommunityPost);
    onClose();
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-border bg-secondary/50 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all';

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Create Post</h2>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="px-5 py-5 space-y-4">
          {/* Type */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(TYPE_CONFIG) as [typeof type, typeof TYPE_CONFIG[typeof type]][]).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button key={key} onClick={() => setType(key as typeof type)}
                    className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all text-left',
                      type === key ? cn(cfg.color, 'border-current shadow-sm') : 'border-border hover:bg-accent text-muted-foreground')}>
                    <Icon size={14} />{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls}
              placeholder="Give your post a clear title" maxLength={120} />
            <p className="text-[10px] text-muted-foreground text-right mt-0.5">{title.length}/120</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Details *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              rows={5} placeholder="Share the full details here..."
              className={cn(inputCls, 'resize-none')} />
          </div>

          {/* Image Upload */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Attach Image (optional)</label>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={imagePreview} alt="preview" className="w-full max-h-40 object-cover" />
                <button onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center">
                  <X size={12} className="text-white" />
                </button>
              </div>
            ) : (
              <button onClick={() => imageRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary/40 hover:bg-accent/30 transition-colors">
                <ImageIcon size={16} />Add photo
              </button>
            )}
            <input ref={imageRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f); }} />
            {uploadPct > 0 && (
              <div className="mt-1 bg-secondary rounded-full h-1.5">
                <div className="h-1.5 bg-primary rounded-full" style={{ width: `${uploadPct}%` }} />
              </div>
            )}
          </div>

          {/* Linked App */}
          {developerApps.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Link your app (optional)</label>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSelectedAppId(null)}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                    !selectedAppId ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent')}>
                  None
                </button>
                {developerApps.map(app => (
                  <button key={app.id} onClick={() => setSelectedAppId(selectedAppId === app.id ? null : app.id)}
                    className={cn('flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                      selectedAppId === app.id ? 'bg-primary/10 text-primary border-primary' : 'border-border text-muted-foreground hover:bg-accent')}>
                    <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="sm" />
                    {app.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={handlePost} disabled={!title.trim() || !content.trim() || submitting}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors">
            {submitting ? 'Publishing...' : 'Publish Post'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Community Page ──────────────────────────────────────────
const CommunityPage = ({ onAuthRequired }: CommunityPageProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'idea' | 'showcase' | 'question' | 'feedback'>('all');
  const [sort, setSort] = useState<SortOption>('new');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);
  const [developerApps, setDeveloperApps] = useState<ConnectedApp[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    let query = supabase
      .from('community_posts')
      .select('*, user_profiles(username, avatar_url, role, verified), apps(id, name, icon, icon_bg)');

    if (filter !== 'all') query = (query as ReturnType<typeof supabase.from>).eq('type', filter) as typeof query;
    if (search) query = (query as ReturnType<typeof supabase.from>).or(`title.ilike.%${search}%,content.ilike.%${search}%`) as typeof query;

    if (sort === 'new') query = (query as ReturnType<typeof supabase.from>).order('created_at', { ascending: false }) as typeof query;
    else if (sort === 'top') query = (query as ReturnType<typeof supabase.from>).order('likes_count', { ascending: false }) as typeof query;
    else query = (query as ReturnType<typeof supabase.from>).order('likes_count', { ascending: false }).order('created_at', { ascending: false }) as typeof query;

    query = (query as ReturnType<typeof supabase.from>).limit(60) as typeof query;

    const [{ data: postData }, { data: likeData }] = await Promise.all([
      query,
      user ? supabase.from('community_likes').select('post_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
    ]);
    setPosts((postData || []) as CommunityPost[]);
    setLikedIds(new Set((likeData || []).map((l: { post_id: string }) => l.post_id)));
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, [filter, sort, search, user?.id]);

  useEffect(() => {
    if (!user || user.role !== 'developer') return;
    supabase.from('apps').select('id, name, icon, icon_bg').eq('developer_id', user.id).eq('status', 'approved')
      .then(({ data }) => setDeveloperApps((data || []) as ConnectedApp[]));
  }, [user?.id]);

  const handleLike = async (postId: string, liked: boolean) => {
    if (!user) { onAuthRequired(); return; }
    if (liked) {
      await supabase.from('community_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      setLikedIds(prev => { const s = new Set(prev); s.delete(postId); return s; });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: Math.max(0, p.likes_count - 1), user_liked: false } : p));
    } else {
      await supabase.from('community_likes').insert({ post_id: postId, user_id: user.id });
      setLikedIds(prev => new Set([...prev, postId]));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + 1, user_liked: true } : p));
    }
  };

  const handleDelete = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const postsWithLikes = posts.map(p => ({ ...p, user_liked: likedIds.has(p.id) }));

  const totalLikes = posts.reduce((s, p) => s + p.likes_count, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 px-5 pt-10 pb-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-white/60 text-xs font-medium">T Apps</p>
            <p className="text-white font-bold text-xl">Community</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSearch(v => !v)}
              className="w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors">
              <Search size={16} />
            </button>
            <button onClick={() => user ? setShowNewPost(true) : onAuthRequired()}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-purple-700 rounded-full text-sm font-bold hover:bg-white/90 transition-colors shadow-lg">
              <Plus size={15} />Post
            </button>
          </div>
        </div>
        <p className="text-white/60 text-xs">Share ideas, showcase projects & connect with devs</p>

        {/* Stats */}
        <div className="flex gap-2 mt-4">
          {[
            { icon: MessageSquare, label: `${posts.length} posts`, color: 'text-purple-200' },
            { icon: Heart, label: `${totalLikes} likes`, color: 'text-red-300' },
            { icon: Award, label: `${new Set(posts.map(p => p.user_id)).size} members`, color: 'text-yellow-300' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="bg-white/15 rounded-2xl px-3 py-1.5 flex items-center gap-1.5">
              <Icon size={12} className={color} />
              <span className="text-white text-xs font-semibold">{label}</span>
            </div>
          ))}
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="mt-3 relative">
            <input
              autoFocus
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setSearch(searchInput)}
              placeholder="Search posts..."
              className="w-full px-4 py-2.5 pl-9 rounded-2xl bg-white/20 backdrop-blur-sm text-white placeholder-white/50 text-sm outline-none border border-white/20 focus:border-white/50"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2">
                <X size={14} className="text-white/60" />
              </button>
            )}
          </div>
        )}
        {search && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-white/70 text-xs">Results for: <strong className="text-white">"{search}"</strong></span>
            <button onClick={() => { setSearch(''); setSearchInput(''); }}
              className="text-white/70 hover:text-white text-xs underline">clear</button>
          </div>
        )}
      </div>

      {/* Filter + Sort bar */}
      <div className="bg-white border-b border-border/50 sticky top-0 z-10">
        <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto scrollbar-hide">
          {(['all', 'idea', 'showcase', 'question', 'feedback'] as const).map(f => {
            const cfg = f === 'all' ? null : TYPE_CONFIG[f];
            return (
              <button key={f} onClick={() => setFilter(f)}
                className={cn('flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                  filter === f
                    ? f === 'all' ? 'bg-primary text-primary-foreground border-primary' : cn(cfg?.color || '', 'border-current')
                    : 'border-border text-muted-foreground hover:bg-accent')}>
                {f === 'all' ? 'All' : cfg?.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 px-4 pb-2">
          {SORT_OPTIONS.map(opt => {
            const Icon = opt.icon;
            return (
              <button key={opt.id} onClick={() => setSort(opt.id)}
                className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors',
                  sort === opt.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent')}>
                <Icon size={11} />{opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Posts */}
      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-40 bg-secondary rounded-2xl animate-pulse" />)
        ) : postsWithLikes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-3xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <Lightbulb size={28} className="text-purple-500" />
            </div>
            <p className="font-bold text-foreground mb-1">{search ? 'No posts found' : 'No posts yet'}</p>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? `No results for "${search}"` : 'Be the first to share an idea or project'}
            </p>
            {!search && (
              <button onClick={() => user ? setShowNewPost(true) : onAuthRequired()}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:bg-primary/90">
                Create First Post
              </button>
            )}
          </div>
        ) : (
          postsWithLikes.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id || null}
              onLike={handleLike}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => user ? setShowNewPost(true) : onAuthRequired()}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-purple-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-purple-700 active:scale-95 transition-all">
        <Plus size={24} />
      </button>

      {showNewPost && user && (
        <NewPostModal
          onClose={() => setShowNewPost(false)}
          onPosted={post => setPosts(prev => [post, ...prev])}
          developerApps={developerApps}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default CommunityPage;
