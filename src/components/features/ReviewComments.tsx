import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { MessageCircle, CornerDownRight, Send, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Comment {
  id: string;
  review_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  user_profiles?: { username: string; role: string } | null;
  replies?: Comment[];
}

interface ReviewCommentsProps {
  reviewId: string;
  reviewUserId: string;
}

const ReviewComments = ({ reviewId, reviewUserId }: ReviewCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount] = useState(0);

  // Fetch count on mount (lightweight)
  useEffect(() => {
    supabase
      .from('review_comments')
      .select('id', { count: 'exact', head: true })
      .eq('review_id', reviewId)
      .then(({ count: c }) => setCount(c ?? 0));
  }, [reviewId]);

  const loadComments = async () => {
    if (loading) return;
    setLoading(true);
    const { data } = await supabase
      .from('review_comments')
      .select('*, user_profiles(username, role)')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: true });

    const all = (data || []) as Comment[];
    // Build thread tree: top-level + replies
    const top = all.filter(c => !c.parent_id);
    const replies = all.filter(c => c.parent_id);
    const threaded = top.map(c => ({
      ...c,
      replies: replies.filter(r => r.parent_id === c.id),
    }));
    setComments(threaded);
    setCount(all.length);
    setLoading(false);
  };

  const handleExpand = () => {
    setExpanded(true);
    if (comments.length === 0) loadComments();
  };

  const handleSubmit = async () => {
    if (!user) { toast.error('Sign in to comment'); return; }
    if (!newComment.trim()) return;
    setSubmitting(true);

    const payload = {
      review_id: reviewId,
      user_id: user.id,
      parent_id: replyingTo?.id || null,
      content: newComment.trim(),
    };

    const { data, error } = await supabase
      .from('review_comments')
      .insert(payload)
      .select('*, user_profiles(username, role)')
      .single();

    if (error) { toast.error('Failed to post comment'); setSubmitting(false); return; }

    const newC = data as Comment;
    if (newC.parent_id) {
      setComments(prev => prev.map(c =>
        c.id === newC.parent_id
          ? { ...c, replies: [...(c.replies || []), newC] }
          : c
      ));
    } else {
      setComments(prev => [...prev, { ...newC, replies: [] }]);
    }
    setCount(n => n + 1);
    setNewComment('');
    setReplyingTo(null);
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string, parentId: string | null) => {
    const { error } = await supabase.from('review_comments').delete().eq('id', commentId);
    if (error) { toast.error('Failed to delete'); return; }
    if (parentId) {
      setComments(prev => prev.map(c =>
        c.id === parentId
          ? { ...c, replies: (c.replies || []).filter(r => r.id !== commentId) }
          : c
      ));
    } else {
      setComments(prev => prev.filter(c => c.id !== commentId));
    }
    setCount(n => Math.max(0, n - 1));
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={cn('flex gap-2.5', isReply && 'ml-8 mt-2')}>
      {isReply && <CornerDownRight size={13} className="text-muted-foreground/30 flex-shrink-0 mt-1" />}
      <div className="flex-1">
        <div className="bg-secondary/60 rounded-xl px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground">
                {comment.user_profiles?.username || 'User'}
              </span>
              {comment.user_id === reviewUserId && (
                <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">Author</span>
              )}
              <span className="text-[10px] text-muted-foreground/60">{formatTime(comment.created_at)}</span>
            </div>
            {user && (user.id === comment.user_id || user.role === 'admin') && (
              <button onClick={() => handleDelete(comment.id, comment.parent_id || null)}
                className="p-1 hover:bg-destructive/10 rounded-lg transition-colors">
                <Trash2 size={11} className="text-muted-foreground/50 hover:text-destructive" />
              </button>
            )}
          </div>
          <p className="text-xs text-foreground leading-relaxed">{comment.content}</p>
        </div>
        {/* Reply button for top-level only */}
        {!isReply && user && (
          <button
            onClick={() => setReplyingTo(
              replyingTo?.id === comment.id ? null : { id: comment.id, username: comment.user_profiles?.username || 'User' }
            )}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary font-semibold mt-1 ml-1 transition-colors">
            <CornerDownRight size={10} />Reply
          </button>
        )}
        {/* Nested replies */}
        {!isReply && comment.replies && comment.replies.length > 0 && (
          <div className="space-y-2 mt-2">
            {comment.replies.map(reply => (
              <CommentItem key={reply.id} comment={reply} isReply />
            ))}
          </div>
        )}
        {/* Inline reply input */}
        {!isReply && replyingTo?.id === comment.id && (
          <div className="ml-8 mt-2 flex gap-2 items-center">
            <div className="flex-1 flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
              <input
                autoFocus
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                placeholder={`Reply to ${replyingTo.username}…`}
                className="flex-1 bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground"
              />
              <button onClick={handleSubmit} disabled={submitting || !newComment.trim()}
                className="text-primary disabled:opacity-40">
                <Send size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!expanded && count === 0 && !user) return null;

  return (
    <div className="mt-2">
      {/* Toggle button */}
      <button
        onClick={expanded ? () => setExpanded(false) : handleExpand}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary font-medium transition-colors ml-1">
        <MessageCircle size={12} />
        {count > 0 ? `${count} comment${count !== 1 ? 's' : ''}` : 'Add comment'}
        {count > 0 && (expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-12 bg-secondary/60 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            comments.map(c => <CommentItem key={c.id} comment={c} />)
          )}

          {/* New top-level comment input */}
          {!replyingTo && user && (
            <div className="flex gap-2 items-center mt-2">
              <div className="flex-1 flex items-center gap-2 bg-secondary rounded-xl px-3 py-2.5 border border-border/60">
                <input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                  placeholder="Add a comment…"
                  className="flex-1 bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground"
                />
                <button onClick={handleSubmit} disabled={submitting || !newComment.trim()}
                  className="text-primary disabled:opacity-40 transition-opacity">
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}

          {!user && (
            <p className="text-[11px] text-muted-foreground text-center py-2">Sign in to join the conversation</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewComments;
