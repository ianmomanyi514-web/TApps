import { useState, useEffect } from 'react';
import { fetchCollections, fetchCollectionApps } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { ChevronLeft, Plus, X, Trash2, Package, ChevronRight, Save } from 'lucide-react';
import { DBApp } from '@/types/database';
import AppIcon from '@/components/features/AppIcon';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Collection {
  id: string;
  name: string;
  description: string | null;
  color: string;
  emoji: string;
  position: number;
  created_at: string;
}

// ── Collection Detail ────────────────────────────────────────────
const CollectionDetail = ({
  collection,
  onBack,
  isAdmin,
}: {
  collection: Collection;
  onBack: () => void;
  isAdmin: boolean;
}) => {
  const navigate = useNavigate();
  const [apps, setApps] = useState<DBApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [allApps, setAllApps] = useState<DBApp[]>([]);
  const [showAddApp, setShowAddApp] = useState(false);
  const [searchApp, setSearchApp] = useState('');

  useEffect(() => {
    fetchCollectionApps(collection.id).then(setApps).catch(() => {}).finally(() => setLoading(false));
  }, [collection.id]);

  const loadAllApps = async () => {
    const { data } = await supabase.from('apps_with_stats').select('*').eq('status', 'approved').order('downloads_count', { ascending: false }).limit(50);
    setAllApps((data || []) as DBApp[]);
    setShowAddApp(true);
  };

  const addApp = async (app: DBApp) => {
    if (apps.some(a => a.id === app.id)) { toast('Already in collection'); return; }
    await supabase.from('collection_apps').insert({ collection_id: collection.id, app_id: app.id, position: apps.length });
    setApps(prev => [...prev, app]);
    toast.success(`${app.name} added!`);
  };

  const removeApp = async (appId: string) => {
    await supabase.from('collection_apps').delete().eq('collection_id', collection.id).eq('app_id', appId);
    setApps(prev => prev.filter(a => a.id !== appId));
    toast.success('Removed from collection');
  };

  const filteredAll = allApps.filter(a =>
    !apps.some(ca => ca.id === a.id) &&
    (!searchApp || a.name.toLowerCase().includes(searchApp.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-10 pb-6" style={{ background: `linear-gradient(135deg, ${collection.color}cc, ${collection.color}88)` }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <ChevronLeft size={18} className="text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{collection.emoji}</span>
              <p className="text-white font-bold text-xl truncate">{collection.name}</p>
            </div>
            {collection.description && (
              <p className="text-white/70 text-xs mt-0.5 ml-10">{collection.description}</p>
            )}
          </div>
          {isAdmin && (
            <button onClick={loadAllApps}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full text-xs font-semibold transition-colors">
              <Plus size={13} />Add
            </button>
          )}
        </div>
        <p className="text-white/60 text-xs ml-12">{apps.length} app{apps.length !== 1 ? 's' : ''} in this collection</p>
      </div>

      <div className="px-4 pt-4 space-y-2.5">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-20 bg-secondary rounded-2xl animate-pulse" />)
        ) : apps.length === 0 ? (
          <div className="text-center py-16">
            <Package size={40} className="text-muted-foreground/20 mx-auto mb-3" />
            <p className="font-semibold text-foreground">No apps yet</p>
            {isAdmin && (
              <button onClick={loadAllApps}
                className="mt-3 px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:bg-primary/90">
                Add Apps
              </button>
            )}
          </div>
        ) : (
          apps.map((app) => (
            <div key={app.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl">
              <button onClick={() => navigate(`/app/${app.id}`)} className="flex-1 flex items-center gap-3 min-w-0 text-left">
                <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground truncate">{app.name}</p>
                  <p className="text-xs text-muted-foreground">{app.developer_name} · {app.category}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">⭐ {Number(app.avg_rating ?? 0).toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">↓ {app.downloads_count}</span>
                  </div>
                </div>
              </button>
              {isAdmin && (
                <button onClick={() => removeApp(app.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-destructive/10 transition-colors flex-shrink-0">
                  <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add App Modal */}
      {showAddApp && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddApp(false)} />
          <div className="relative bg-white w-full max-w-lg max-h-[80vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/50 flex-shrink-0">
              <p className="font-bold text-lg">Add Apps</p>
              <button onClick={() => setShowAddApp(false)} className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary">
                <X size={18} />
              </button>
            </div>
            <div className="px-4 py-3 flex-shrink-0">
              <input value={searchApp} onChange={e => setSearchApp(e.target.value)}
                placeholder="Search apps..."
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-secondary/50 text-sm outline-none focus:border-primary" />
            </div>
            <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-2">
              {filteredAll.map(app => (
                <button key={app.id} onClick={() => addApp(app)}
                  className="w-full flex items-center gap-3 p-3 bg-card border border-border rounded-2xl hover:border-primary/30 transition-colors text-left">
                  <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{app.name}</p>
                    <p className="text-xs text-muted-foreground">{app.category}</p>
                  </div>
                  <Plus size={16} className="text-primary flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Collections Page ─────────────────────────────────────────────
const CollectionsPage = ({ onBack }: { onBack?: () => void }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Collection | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '#10b981', emoji: '🎯' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCollections().then(data => setCollections(data as Collection[])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.from('collections').insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
      color: form.color,
      emoji: form.emoji,
      created_by: user?.id,
      position: collections.length,
    }).select().single();
    setCreating(false);
    if (error) { toast.error('Failed to create collection'); return; }
    setCollections(prev => [...prev, data as Collection]);
    setForm({ name: '', description: '', color: '#10b981', emoji: '🎯' });
    setShowCreate(false);
    toast.success('Collection created!');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('collections').delete().eq('id', id);
    setCollections(prev => prev.filter(c => c.id !== id));
    toast.success('Collection deleted');
  };

  if (selected) {
    return (
      <CollectionDetail
        collection={selected}
        onBack={() => setSelected(null)}
        isAdmin={isAdmin}
      />
    );
  }

  const EMOJIS = ['🎯', '🔥', '⭐', '🎮', '🛠️', '🎨', '📱', '🚀', '🧠', '💡', '🏆', '🌟'];
  const COLORS = ['#10b981','#3b82f6','#8b5cf6','#ef4444','#f59e0b','#06b6d4','#ec4899','#1e293b','#16a34a','#dc2626'];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-to-br from-teal-600 to-emerald-700 px-5 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => onBack ? onBack() : navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <ChevronLeft size={18} className="text-white" />
          </button>
          <div className="flex-1">
            <p className="text-white/70 text-xs">T Apps</p>
            <p className="text-white font-bold text-xl">Collections</p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-teal-700 rounded-full text-sm font-bold hover:bg-white/90 transition-colors">
              <Plus size={15} />New
            </button>
          )}
        </div>
        <p className="text-white/60 text-xs ml-12">Curated app collections for every interest</p>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-24 bg-secondary rounded-2xl animate-pulse" />)
        ) : collections.length === 0 ? (
          <div className="text-center py-20">
            <Package size={40} className="text-muted-foreground/20 mx-auto mb-3" />
            <p className="font-bold text-foreground">No collections yet</p>
            {isAdmin && (
              <button onClick={() => setShowCreate(true)}
                className="mt-3 px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:bg-primary/90">
                Create First Collection
              </button>
            )}
          </div>
        ) : (
          collections.map(col => (
            <button key={col.id} onClick={() => setSelected(col)}
              className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-primary/30 hover:shadow-sm transition-all text-left">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                style={{ backgroundColor: col.color + '20', border: `2px solid ${col.color}40` }}>
                {col.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground">{col.name}</p>
                {col.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{col.description}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-[10px] text-muted-foreground">{new Date(col.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isAdmin && (
                  <button onClick={(e) => handleDelete(col.id, e)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-destructive/10 transition-colors">
                    <Trash2 size={13} className="text-muted-foreground" />
                  </button>
                )}
                <ChevronRight size={15} className="text-muted-foreground" />
              </div>
            </button>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl">
            <div className="px-5 pt-5 pb-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <p className="font-bold text-lg">New Collection</p>
                <button onClick={() => setShowCreate(false)} className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="px-5 py-5 space-y-4">
              {/* Preview */}
              <div className="flex items-center gap-3 p-3 rounded-2xl border border-border"
                style={{ backgroundColor: form.color + '15' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: form.color + '25', border: `2px solid ${form.color}50` }}>
                  {form.emoji}
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">{form.name || 'Collection Name'}</p>
                  <p className="text-xs text-muted-foreground">{form.description || 'Description...'}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Emoji</label>
                <div className="flex gap-2 flex-wrap">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => setForm(p => ({ ...p, emoji: e }))}
                      className={cn('w-9 h-9 text-lg rounded-xl border-2 transition-all',
                        form.emoji === e ? 'border-primary bg-primary/5 scale-110' : 'border-border hover:border-primary/40')}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                      className={cn('w-8 h-8 rounded-xl border-2 transition-transform hover:scale-110',
                        form.color === c ? 'border-foreground scale-110' : 'border-transparent')}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Best Productivity Apps"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-secondary/50 text-sm outline-none focus:border-primary transition-all" />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Short description (optional)"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-secondary/50 text-sm outline-none focus:border-primary transition-all" />
              </div>

              <button onClick={handleCreate} disabled={!form.name.trim() || creating}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
                <Save size={15} />{creating ? 'Creating...' : 'Create Collection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionsPage;
