import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Heart, MessageSquare, Plus, X, ChevronDown, ChevronUp, Send, Lightbulb, Monitor, HelpCircle, MessageCircle, Flame } from 'lucide-react';
import AppIcon from '@/components/features/AppIcon';
import { useNavigate } from 'react-router-dom';

interface CommunityPost {
  id: string;
  user_id: string;
  app_id: string | null;
  title: string;
  content: string;
  type: 'idea' | 'showcase' | 'question' | 'feedback';
  likes_count: number;
  created_at: string;
  user_profiles?: { username: string; avatar_url: string | null; role: string };
  apps?: { id: string; name: string; icon: string; icon_bg: string } | null;
  comments?: CommunityComment[];
  user_liked?: boolean;
}

interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_profiles?: { username: string };
}

interface ConnectedApp {
  id: string;
  name: string;
  icon: string;
  icon_bg: string;
}

const TYPE_CONFIG = {
  idea: { label: 'Idea', icon: Lightbulb, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  showcase: { label: 'Showcase', icon: Monitor, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  question: { label: 'Question', icon: HelpCircle, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  feedback: { label: 'Feedback', icon: MessageCircle, color: 'bg-green-100 text-green-700 border-green-200' },
};

const FILTER_TYPES = ['all', 'idea', 'showcase', 'question', 'feedback'] as const;

interface CommunityPageProps {
  onAuthRequired: () => void;
}

const PostCard = ({
  post,
  currentUserId,
  onLike,
  developerApps,
}: {
  post: CommunityPost;
  currentUserId: string | null;
  onLike: (postId: string, liked: boolean) => void;
  developerApps: ConnectedApp[];
}) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>(post.comments || []);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  const TypeIcon = TYPE_CONFIG[post.type]?.icon || Lightbulb;
  const typeColor = TYPE_CONFIG[post.type]?.color || TYPE_CONFIG.idea.color;
  const typeLabel = TYPE_CONFIG[post.type]?.label || 'Idea';
  const liked = post.user_liked || false;

  const loadComments = async () => {
    if (commentsLoaded) { setShowComments(!showComments); return; }
    const { data } = await supabase
      .from('community_comments')
      .select('*, user_profiles(username)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    setComments((data || []) as CommunityComment[]);
    setCommentsLoaded(true);
    setShowComments(true);
  };

  const handleComment = async () => {
    if (!currentUserId || !commentText.trim()) return;
    setCommentLoading(true);
    const { data, error } = await supabase.from('community_comments').insert({
      post_id: post.id,
      user_id: currentUserId,
      content: commentText.trim(),
    }).select('*, user_profiles(username)').single();
    setCommentLoading(false);
    if (error) { toast.error('Failed to post comment'); return; }
    setComments(prev => [...prev, data as CommunityComment]);
    setCommentText('');
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Post Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {(post.user_profiles?.username || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{post.user_profiles?.username || 'Unknown'}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
          <span className={cn('flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border', typeColor)}>
            <TypeIcon size={10} />{typeLabel}
          </span>
        </div>

        <h3 className="font-bold text-sm text-foreground mb-1.5">{post.title}</h3>
        <p className={cn('text-sm text-muted-foreground leading-relaxed', !expanded && 'line-clamp-3')}>
          {post.content}
        </p>
        {post.content.length > 150 && (
          <button onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-primary font-semibold mt-1">
            {expanded ? <><ChevronUp size={12} />Less</> : <><ChevronDown size={12} />Read more</>}
          </button>
        )}

        {/* Linked App */}
        {post.apps && (
          <button onClick={() => navigate(`/app/${post.app_id}`)}
            className="flex items-center gap-2 mt-3 p-2 bg-secondary/60 rounded-xl hover:bg-accent/50 transition-colors w-full text-left">
            <AppIcon icon={post.apps.icon} iconBg={post.apps.icon_bg} name={post.apps.name} size="sm" />
            <div>
              <p className="text-xs font-semibold text-foreground">{post.apps.name}</p>
              <p className="text-[10px] text-muted-foreground">Linked app</p>
            </div>
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 px-4 pb-3 pt-1 border-t border-border/40">
        <button
          onClick={() => onLike(post.id, liked)}
          disabled={!currentUserId}
          className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
            liked ? 'bg-red-100 text-red-600' : 'hover:bg-accent text-muted-foreground')}
        >
          <Heart size={14} className={liked ? 'fill-red-500 text-red-500' : ''} />
          {post.likes_count}
        </button>
        <button
          onClick={loadComments}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-accent text-muted-foreground transition-colors"
        >
          <MessageSquare size={14} />
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-border/40 px-4 py-3 bg-secondary/20 space-y-2">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary text-[10px] font-bold">
                  {(c.user_profiles?.username || 'U')[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 bg-white rounded-xl px-3 py-2">
                <p className="text-[10px] font-bold text-foreground">{c.user_profiles?.username}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
          {currentUserId && (
            <div className="flex gap-2 items-center mt-2">
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 bg-white border border-border rounded-xl text-xs outline-none focus:border-primary"
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim() || commentLoading}
                className="w-8 h-8 flex items-center justify-center bg-primary rounded-xl disabled:opacity-40">
                <Send size={13} className="text-white" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── New Post Modal ─────────────────────────────────────────────────
const NewPostModal = ({
  onClose,
  onPosted,
  developerApps,
}: {
  onClose: () => void;
  onPosted: (post: CommunityPost) => void;
  developerApps: ConnectedApp[];
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'idea' | 'showcase' | 'question' | 'feedback'>('idea');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePost = async () => {
    if (!user || !title.trim() || !content.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase.from('community_posts').insert({
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
      type,
      app_id: selectedAppId || null,
    }).select('*, user_profiles(username, avatar_url, role), apps(id, name, icon, icon_bg)').single();
    setSubmitting(false);
    if (error) { toast.error('Failed to post'); return; }
    toast.success('Post published to community!');
    onPosted(data as CommunityPost);
    onClose();
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-border bg-secondary/50 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Share with Community</h2>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="px-5 py-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">Post Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(TYPE_CONFIG) as [typeof type, typeof TYPE_CONFIG[typeof type]][]).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button key={key} onClick={() => setType(key)}
                    className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors text-left',
                      type === key ? cn(cfg.color, 'border-current') : 'border-border hover:bg-accent text-muted-foreground')}>
                    <Icon size={14} />{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls}
              placeholder="What's your idea or question?" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Details *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              rows={5} placeholder="Share the details of your idea, project, or question..."
              className={cn(inputCls, 'resize-none')} />
          </div>

          {developerApps.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Link to your app (optional)</label>
              <div className="space-y-2">
                <button onClick={() => setSelectedAppId(null)}
                  className={cn('w-full px-3 py-2 rounded-xl border text-sm text-left transition-colors',
                    !selectedAppId ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-border hover:bg-accent text-muted-foreground')}>
                  No app linked
                </button>
                {developerApps.map(app => (
                  <button key={app.id} onClick={() => setSelectedAppId(app.id)}
                    className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-colors',
                      selectedAppId === app.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent')}>
                    <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="sm" />
                    <span className="text-sm font-semibold text-foreground">{app.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={handlePost} disabled={!title.trim() || !content.trim() || submitting}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-60">
            {submitting ? 'Publishing...' : 'Publish Post'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Community Page ────────────────────────────────────────────
const CommunityPage = ({ onAuthRequired }: CommunityPageProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<typeof FILTER_TYPES[number]>('all');
  const [showNewPost, setShowNewPost] = useState(false);
  const [developerApps, setDeveloperApps] = useState<ConnectedApp[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    const query = supabase
      .from('community_posts')
      .select('*, user_profiles(username, avatar_url, role), apps(id, name, icon, icon_bg)')
      .order('created_at', { ascending: false })
      .limit(50);

    Promise.all([
      filter === 'all' ? query : query.eq('type', filter),
      user ? supabase.from('community_likes').select('post_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
    ]).then(([{ data: postData }, { data: likeData }]) => {
      setPosts((postData || []) as CommunityPost[]);
      setLikedIds(new Set((likeData || []).map((l: { post_id: string }) => l.post_id)));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filter, user?.id]);

  useEffect(() => {
    if (!user || user.role !== 'developer') return;
    supabase.from('apps').select('id, name, icon, icon_bg').eq('developer_id', user.id).eq('status', 'approved')
      .then(({ data }) => setDeveloperApps((data || []) as ConnectedApp[]));
  }, [user?.id]);

  const handleLike = async (postId: string, liked: boolean) => {
    if (!user) { onAuthRequired(); return; }
    if (liked) {
      await supabase.from('community_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      await supabase.from('community_posts').update({ likes_count: supabase.rpc('decrement' as never, {}) }).eq('id', postId);
      setLikedIds(prev => { const s = new Set(prev); s.delete(postId); return s; });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: Math.max(0, p.likes_count - 1), user_liked: false } : p));
    } else {
      await supabase.from('community_likes').insert({ post_id: postId, user_id: user.id });
      setLikedIds(prev => new Set([...prev, postId]));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + 1, user_liked: true } : p));
    }
  };

  const postsWithLikes = posts.map(p => ({ ...p, user_liked: likedIds.has(p.id) }));

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 px-5 pt-10 pb-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-white/60 text-xs font-medium">T Apps</p>
            <p className="text-white font-bold text-xl">Community</p>
          </div>
          <button
            onClick={() => user ? setShowNewPost(true) : onAuthRequired()}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full text-sm font-semibold transition-colors">
            <Plus size={15} />Post
          </button>
        </div>
        <p className="text-white/60 text-xs mt-1">Share ideas, showcase your projects & connect with developers</p>

        {/* Stats Row */}
        <div className="flex gap-3 mt-4">
          <div className="bg-white/15 rounded-2xl px-3 py-2 flex items-center gap-2">
            <Flame size={14} className="text-orange-300" />
            <span className="text-white text-xs font-bold">{posts.length} posts</span>
          </div>
          <div className="bg-white/15 rounded-2xl px-3 py-2 flex items-center gap-2">
            <Heart size={14} className="text-red-300" />
            <span className="text-white text-xs font-bold">
              {posts.reduce((s, p) => s + p.likes_count, 0)} likes
            </span>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-border/50 bg-white sticky top-0 z-10">
        {FILTER_TYPES.map(f => {
          const cfg = f === 'all' ? null : TYPE_CONFIG[f];
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold capitalize border transition-colors',
                filter === f
                  ? f === 'all' ? 'bg-primary text-primary-foreground border-primary' : cn(cfg?.color || '', 'border-current')
                  : 'border-border text-muted-foreground hover:bg-accent')}>
              {f === 'all' ? 'All Posts' : cfg?.label}
            </button>
          );
        })}
      </div>

      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-32 bg-secondary rounded-2xl animate-pulse" />)
        ) : postsWithLikes.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 rounded-3xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <Lightbulb size={28} className="text-purple-500" />
            </div>
            <p className="font-bold text-foreground mb-1">No posts yet</p>
            <p className="text-sm text-muted-foreground mb-4">Be the first to share an idea or project</p>
            <button onClick={() => user ? setShowNewPost(true) : onAuthRequired()}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:bg-primary/90">
              Create First Post
            </button>
          </div>
        ) : (
          postsWithLikes.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id || null}
              onLike={handleLike}
              developerApps={developerApps}
            />
          ))
        )}
      </div>

      {showNewPost && (
        <NewPostModal
          onClose={() => setShowNewPost(false)}
          onPosted={post => setPosts(prev => [post, ...prev])}
          developerApps={developerApps}
        />
      )}
    </div>
  );
};

export default CommunityPage;
