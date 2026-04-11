import { useState, useEffect, useRef } from 'react';
import { Plus, Package, TrendingUp, Star, Trash2, X, ChevronDown, Image, Upload, Edit2, ArrowUpCircle, BarChart2, Sparkles, Loader2, Globe, Building2, User, Save, FileText, Smartphone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { fetchDeveloperApps, submitApp, deleteApp, uploadAppMedia, updateApp, uploadFileViaXHR } from '@/lib/api';
import { generateAppDescription } from '@/lib/featuredApi';
import { DBApp } from '@/types/database';
import AppIcon from '@/components/features/AppIcon';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ['Action', 'Adventure', 'Business', 'Casual', 'Education', 'Entertainment', 'Finance', 'Health', 'Music & Audio', 'Photography', 'Productivity', 'Puzzle', 'Racing', 'Role Playing', 'Shopping', 'Simulation', 'Social', 'Sports', 'Strategy', 'Travel', 'Video'];
const ICON_COLORS = ['#4f46e5', '#0052cc', '#16a34a', '#dc2626', '#db2777', '#ea580c', '#7c3aed', '#0891b2', '#1e1e2e', '#6b21a8'];
const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

// ── Image Upload Slot ─────────────────────────────────────────────
interface ImageUploadSlotProps {
  label: string;
  preview: string | null;
  onFile: (f: File) => void;
  ratio?: string;
  accept?: string;
}

const ImageUploadSlot = ({ label, preview, onFile, ratio = '16:9', accept = 'image/*' }: ImageUploadSlotProps) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <button type="button" onClick={() => ref.current?.click()}
      className={cn('relative rounded-2xl border-2 border-dashed border-border bg-secondary/40 hover:bg-secondary/80 hover:border-primary/50 transition-all overflow-hidden flex items-center justify-center',
        ratio === '1:1' ? 'w-full aspect-square' : 'w-full aspect-video')}>
      {preview ? (
        <>
          <img src={preview} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <Upload size={20} className="text-white" />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-1.5 py-3 px-2">
          <Image size={20} className="text-muted-foreground/60" />
          <span className="text-xs text-muted-foreground font-medium text-center">{label}</span>
        </div>
      )}
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </button>
  );
};

// ── APK Upload Slot ───────────────────────────────────────────────
interface ApkUploadSlotProps {
  fileName: string | null;
  onFile: (f: File) => void;
}

const ApkUploadSlot = ({ fileName, onFile }: ApkUploadSlotProps) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <button type="button" onClick={() => ref.current?.click()}
      className={cn(
        'w-full rounded-2xl border-2 border-dashed transition-all px-4 py-5 flex flex-col items-center gap-2',
        fileName
          ? 'border-emerald-400 bg-emerald-50'
          : 'border-border bg-secondary/40 hover:bg-secondary/80 hover:border-primary/50'
      )}>
      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center',
        fileName ? 'bg-emerald-100' : 'bg-primary/10')}>
        <Smartphone size={22} className={fileName ? 'text-emerald-600' : 'text-primary'} />
      </div>
      {fileName ? (
        <>
          <p className="text-sm font-bold text-emerald-700 text-center line-clamp-1 max-w-full px-4">{fileName}</p>
          <p className="text-xs text-emerald-600/70">Tap to change APK</p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-foreground">Upload APK File</p>
          <p className="text-xs text-muted-foreground text-center">Tap to select your Android APK file (.apk) · Max 150 MB</p>
        </>
      )}
      <input ref={ref} type="file" accept=".apk,application/vnd.android.package-archive,application/octet-stream" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </button>
  );
};

// ── Avatar Upload ─────────────────────────────────────────────────
interface AvatarUploadProps {
  userId: string;
  currentAvatar: string | null;
  username: string;
  onSaved: (url: string) => void;
}

const AvatarUpload = ({ userId, currentAvatar, username, onSaved }: AvatarUploadProps) => {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentAvatar);

  const handleFile = async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/avatar/profile.${ext}`;
      const { error } = await supabase.storage
        .from('app-media')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('app-media').getPublicUrl(path);
      const url = data.publicUrl;
      await supabase.from('user_profiles').update({ avatar_url: url }).eq('id', userId);
      onSaved(url);
      toast.success('Avatar updated!');
    } catch {
      toast.error('Failed to upload avatar');
      setPreview(currentAvatar);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="relative">
        <button type="button" onClick={() => ref.current?.click()}
          className="w-16 h-16 rounded-3xl overflow-hidden ring-2 ring-white/30 hover:ring-white/60 transition-all flex-shrink-0 relative group">
          {preview ? (
            <img src={preview} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/20 flex items-center justify-center">
              <span className="text-white font-black text-2xl">{username[0].toUpperCase()}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {uploading ? (
              <Loader2 size={16} className="text-white animate-spin" />
            ) : (
              <Upload size={16} className="text-white" />
            )}
          </div>
        </button>
        <input ref={ref} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
      <div>
        <p className="text-white font-bold text-lg">{username}</p>
        <button type="button" onClick={() => ref.current?.click()}
          className="text-white/70 text-xs hover:text-white transition-colors">
          {uploading ? 'Uploading...' : 'Change photo'}
        </button>
      </div>
    </div>
  );
};

// ── App Form ──────────────────────────────────────────────────────
interface AppFormProps {
  developerId: string;
  developerName: string;
  onClose: () => void;
  onDone: (app: DBApp) => void;
  editApp?: DBApp | null;
}

const AppForm = ({ developerId, developerName, onClose, onDone, editApp }: AppFormProps) => {
  const isEdit = !!editApp;
  const [form, setForm] = useState({
    name: editApp?.name || '',
    category: editApp?.category || 'Productivity',
    type: (editApp?.type as 'app' | 'game') || 'app',
    description: editApp?.description || '',
    icon: editApp?.icon || 'AP',
    icon_bg: editApp?.icon_bg || '#4f46e5',
    version: editApp?.version || '1.0.0',
    size: editApp?.size || '10 MB',
    content_rating: editApp?.content_rating || 'Everyone',
    price: editApp?.price || 0,
    tags: editApp?.tags?.join(', ') || '',
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(editApp?.thumbnail || null);
  const [screenshotFiles, setScreenshotFiles] = useState<(File | null)[]>([null, null, null]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<(string | null)[]>(
    editApp?.screenshots_urls?.length
      ? [...editApp.screenshots_urls, null, null, null].slice(0, 3)
      : [null, null, null]
  );
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [existingApkUrl] = useState<string | null>(editApp?.apk_url || null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generatingDesc, setGeneratingDesc] = useState(false);

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const handleGenerateDescription = async () => {
    if (!form.name) { toast.error('Enter an app name first'); return; }
    setGeneratingDesc(true);
    try {
      const desc = await generateAppDescription({
        appName: form.name,
        category: form.category,
        type: form.type,
        tags: form.tags,
      });
      set('description', desc);
      toast.success('Description generated!');
    } catch {
      toast.error('Failed to generate description. Try again.');
    } finally {
      setGeneratingDesc(false);
    }
  };

  const handleThumbnail = (file: File) => {
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleScreenshot = (index: number, file: File) => {
    const files = [...screenshotFiles]; files[index] = file;
    const previews = [...screenshotPreviews]; previews[index] = URL.createObjectURL(file);
    setScreenshotFiles(files);
    setScreenshotPreviews(previews);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.description) { toast.error('Fill in name and description'); return; }
    setLoading(true);
    try {
      const targetId = editApp?.id || crypto.randomUUID();
      let thumbnailUrl: string | undefined = editApp?.thumbnail;
      if (thumbnailFile) {
        thumbnailUrl = await uploadAppMedia(thumbnailFile, developerId, targetId, 'thumbnail');
      }
      const screenshotUrls: string[] = editApp?.screenshots_urls ? [...editApp.screenshots_urls] : [];
      for (let i = 0; i < screenshotFiles.length; i++) {
        const f = screenshotFiles[i];
        if (f) {
          const url = await uploadAppMedia(f, developerId, targetId, `screenshot_${i}`);
          screenshotUrls[i] = url;
        }
      }

      // Upload APK via XHR (no timeout, progress tracking, handles 150MB+)
      let apkUrl: string | undefined = existingApkUrl || undefined;
      if (apkFile) {
        const ext = apkFile.name.split('.').pop() || 'apk';
        const path = `${developerId}/${targetId}/app.${ext}`;
        setUploadProgress(1); // show progress bar
        apkUrl = await uploadFileViaXHR(
          apkFile,
          path,
          'application/octet-stream',
          (pct) => setUploadProgress(pct)
        );
        setUploadProgress(0);
        // Auto-fill size from file
        const sizeMB = (apkFile.size / (1024 * 1024)).toFixed(1);
        form.size = `${sizeMB} MB`;
      }

      const payload = {
        developer_id: developerId,
        developer_name: developerName,
        name: form.name,
        category: form.category,
        type: form.type,
        description: form.description,
        icon: form.icon.slice(0, 3).toUpperCase(),
        icon_bg: form.icon_bg,
        version: form.version,
        size: form.size,
        content_rating: form.content_rating,
        price: form.price,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        thumbnail: thumbnailUrl,
        screenshots_urls: screenshotUrls.filter(Boolean),
        apk_url: apkUrl,
      };
      let result: DBApp;
      if (isEdit && editApp) {
        result = await updateApp(editApp.id, payload);
        toast.success('App updated!');
      } else {
        result = await submitApp(payload);
        toast.success('App is now live on T Apps!');
      }
      onDone(result);
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-border bg-secondary/50 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">{isEdit ? 'Edit App' : 'Submit New App'}</h2>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="px-5 py-5 space-y-5">
          {/* APK Upload */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">APK File</label>
            <ApkUploadSlot
              fileName={apkFile ? apkFile.name : existingApkUrl ? 'APK already uploaded (tap to replace)' : null}
              onFile={setApkFile}
            />
            {existingApkUrl && !apkFile && (
              <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                <Smartphone size={11} />APK uploaded · leave empty to keep existing
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">Featured Thumbnail</label>
            <ImageUploadSlot label="Upload thumbnail (16:9 recommended)" preview={thumbnailPreview} onFile={handleThumbnail} ratio="16:9" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">Screenshots (up to 3)</label>
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-black text-muted-foreground/40 w-4 text-center flex-shrink-0">{i + 1}</span>
                  <div className="flex-1">
                    <ImageUploadSlot
                      label={`Screenshot ${i + 1}`}
                      preview={screenshotPreviews[i]}
                      onFile={f => handleScreenshot(i, f)}
                      ratio="16:9"
                    />
                  </div>
                  {screenshotPreviews[i] && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => {
                          if (i === 0) return;
                          const files = [...screenshotFiles];
                          const previews = [...screenshotPreviews];
                          [files[i], files[i-1]] = [files[i-1], files[i]];
                          [previews[i], previews[i-1]] = [previews[i-1], previews[i]];
                          setScreenshotFiles(files);
                          setScreenshotPreviews(previews);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-accent disabled:opacity-20 transition-colors text-xs font-bold">
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={i === 2 || !screenshotPreviews[i+1]}
                        onClick={() => {
                          if (i >= 2 || !screenshotPreviews[i+1]) return;
                          const files = [...screenshotFiles];
                          const previews = [...screenshotPreviews];
                          [files[i], files[i+1]] = [files[i+1], files[i]];
                          [previews[i], previews[i+1]] = [previews[i+1], previews[i]];
                          setScreenshotFiles(files);
                          setScreenshotPreviews(previews);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-accent disabled:opacity-20 transition-colors text-xs font-bold">
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const files = [...screenshotFiles];
                          const previews = [...screenshotPreviews];
                          files[i] = null;
                          previews[i] = null;
                          // Compact: shift remaining up
                          const compactFiles = [...files.filter(Boolean), null, null, null].slice(0, 3) as (File | null)[];
                          const compactPreviews = [...previews.filter(Boolean), null, null, null].slice(0, 3) as (string | null)[];
                          setScreenshotFiles(compactFiles);
                          setScreenshotPreviews(compactPreviews);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-200 hover:bg-red-50 transition-colors">
                        <X size={12} className="text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Use ↑↓ to reorder · ✕ to remove</p>
          </div>
          <div className="flex items-center gap-4">
            <AppIcon icon={form.icon} iconBg={form.icon_bg} name={form.name || 'App'} size="xl" />
            <div className="flex-1 space-y-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Icon Text (1-3 chars)</label>
                <input value={form.icon} onChange={e => set('icon', e.target.value.slice(0, 3).toUpperCase())} className={inputCls} placeholder="AP" maxLength={3} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Icon Color</label>
                <div className="flex gap-2 flex-wrap">
                  {ICON_COLORS.map(c => (
                    <button key={c} onClick={() => set('icon_bg', c)}
                      className={cn('w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110', form.icon_bg === c ? 'border-foreground scale-110' : 'border-transparent')}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">App Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="My Awesome App" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
              <div className="flex rounded-xl border border-border overflow-hidden">
                {(['app', 'game'] as const).map(t => (
                  <button key={t} onClick={() => set('type', t)}
                    className={cn('flex-1 py-2.5 text-sm font-medium transition-colors capitalize',
                      form.type === t ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 hover:bg-accent')}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
              <div className="relative">
                <select value={form.category} onChange={e => set('category', e.target.value)}
                  className={cn(inputCls, 'appearance-none pr-8')}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground">Description *</label>
              <button type="button" onClick={handleGenerateDescription} disabled={generatingDesc || !form.name}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {generatingDesc
                  ? <><Loader2 size={11} className="animate-spin" />Generating...</>
                  : <><Sparkles size={11} />AI Generate</>}
              </button>
            </div>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={4} placeholder="Describe your app... or click AI Generate above" className={cn(inputCls, 'resize-none')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Version</label>
              <input value={form.version} onChange={e => set('version', e.target.value)} className={inputCls} placeholder="1.0.0" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Size</label>
              <input value={form.size} onChange={e => set('size', e.target.value)} className={inputCls} placeholder="Auto from APK" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Content Rating</label>
              <div className="relative">
                <select value={form.content_rating} onChange={e => set('content_rating', e.target.value)}
                  className={cn(inputCls, 'appearance-none pr-8')}>
                  {['Everyone', 'Everyone 10+', '13+', '16+', '18+'].map(r => <option key={r}>{r}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Price ($)</label>
              <input type="number" value={form.price} onChange={e => set('price', parseFloat(e.target.value) || 0)}
                min={0} step={0.99} className={inputCls} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags (comma separated)</label>
            <input value={form.tags} onChange={e => set('tags', e.target.value)} className={inputCls} placeholder="Productivity, Tools, Utility" />
          </div>
          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-60">
            {loading ? (uploadProgress > 0 ? `Uploading APK... ${uploadProgress}%` : isEdit ? 'Saving...' : 'Submitting...') : isEdit ? 'Save Changes' : 'Submit for Review'}
          </button>
          {uploadProgress > 0 && (
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div className="h-2 bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
          {!isEdit && (
            <p className="text-xs text-muted-foreground text-center">Your app will be published immediately and visible to all users</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Changelog Modal ───────────────────────────────────────────────
function bumpVersionStr(v: string): string {
  const parts = v.split('.').map(Number);
  parts[parts.length - 1] = (parts[parts.length - 1] || 0) + 1;
  return parts.join('.');
}

interface ChangelogModalProps {
  app: DBApp;
  onConfirm: (changelog: string) => void;
  onClose: () => void;
}

const ChangelogModal = ({ app, onConfirm, onClose }: ChangelogModalProps) => {
  const [changelog, setChangelog] = useState('');
  const newVersion = bumpVersionStr(app.version);

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="px-5 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">Release Update</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {app.name} · v{app.version} → <span className="text-primary font-semibold">v{newVersion}</span>
              </p>
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">
              What's new in v{newVersion}?
            </label>
            <textarea
              value={changelog}
              onChange={e => setChangelog(e.target.value)}
              rows={5}
              placeholder={`- Bug fixes and performance improvements\n- New feature: ...\n- Improved UI for ...`}
              className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This changelog appears in the version history and notifies all installed users.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-accent transition-colors">
              Cancel
            </button>
            <button onClick={() => onConfirm(changelog)}
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 flex items-center justify-center gap-2 transition-colors">
              <ArrowUpCircle size={15} />Release Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Bio Edit Modal ────────────────────────────────────────────────
interface BioEditModalProps {
  userId: string;
  initial: { bio: string; company: string; website: string };
  onClose: () => void;
  onSaved: (data: { bio: string; company: string; website: string }) => void;
}

const BioEditModal = ({ userId, initial, onClose, onSaved }: BioEditModalProps) => {
  const [bio, setBio] = useState(initial.bio);
  const [company, setCompany] = useState(initial.company);
  const [website, setWebsite] = useState(initial.website);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('user_profiles')
      .update({ bio, company, website })
      .eq('id', userId);
    setSaving(false);
    if (error) { toast.error('Failed to save profile'); return; }
    toast.success('Profile updated!');
    onSaved({ bio, company, website });
    onClose();
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-border bg-secondary/50 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="px-5 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Edit Developer Profile</h2>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <User size={12} />Bio
            </label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4}
              placeholder="Tell users about yourself and your apps..."
              className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Building2 size={12} />Company
            </label>
            <input value={company} onChange={e => setCompany(e.target.value)} className={inputCls} placeholder="Acme Corp" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Globe size={12} />Website
            </label>
            <input value={website} onChange={e => setWebsite(e.target.value)} className={inputCls} placeholder="https://example.com" type="url" />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
            <Save size={15} />{saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Analytics Section ─────────────────────────────────────────────
const AnalyticsSection = ({ apps }: { apps: DBApp[] }) => {
  const downloadsData = apps.map(a => ({
    name: a.name.length > 10 ? a.name.slice(0, 10) + '…' : a.name,
    downloads: a.downloads_count,
  }));

  const ratingData = [5, 4, 3, 2, 1].map(star => {
    const appsWithRating = apps.filter(a => Math.round(Number(a.avg_rating ?? 0)) === star);
    return { star: `${star}★`, count: appsWithRating.length };
  });

  const statusData = [
    { name: 'Approved', value: apps.filter(a => a.status === 'approved').length, color: '#10b981' },
    { name: 'Pending', value: apps.filter(a => a.status === 'pending').length, color: '#f59e0b' },
    { name: 'Rejected', value: apps.filter(a => a.status === 'rejected').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const catMap: Record<string, number> = {};
  apps.forEach(a => { catMap[a.category] = (catMap[a.category] || 0) + 1; });
  const categoryData = Object.entries(catMap).map(([cat, count]) => ({
    cat: cat.length > 9 ? cat.slice(0, 9) + '…' : cat,
    count,
  }));

  // Real install data — last 7 days
  const [weeklyData, setWeeklyData] = useState<{day:string;installs:number}[]>(
    ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => ({ day, installs: 0 }))
  );

  useEffect(() => {
    if (apps.length === 0) return;
    const appIds = apps.map(a => a.id);
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    supabase
      .from('installs')
      .select('installed_at')
      .in('app_id', appIds)
      .gte('installed_at', since.toISOString())
      .then(({ data }) => {
        const buckets: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString('en-US', { weekday: 'short' });
          buckets[key] = 0;
        }
        (data || []).forEach((row: {installed_at: string}) => {
          const key = new Date(row.installed_at).toLocaleDateString('en-US', { weekday: 'short' });
          if (key in buckets) buckets[key]++;
        });
        setWeeklyData(Object.entries(buckets).map(([day, installs]) => ({ day, installs })));
      });
  }, [apps]);


  if (apps.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <BarChart2 size={36} className="text-muted-foreground/30 mx-auto mb-3" />
        <p className="font-semibold text-foreground">No data yet</p>
        <p className="text-sm text-muted-foreground mt-1">Submit your first app to see analytics</p>
      </div>
    );
  }

  const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-card border border-border rounded-2xl p-4 mb-4">
      <p className="font-bold text-sm text-foreground mb-3">{title}</p>
      {children}
    </div>
  );

  return (
    <div className="space-y-0">
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Total Downloads', value: apps.reduce((s, a) => s + a.downloads_count, 0), color: 'text-emerald-600' },
          { label: 'Apps Published', value: apps.filter(a => a.status === 'approved').length, color: 'text-blue-600' },
          { label: 'Avg Rating', value: apps.length > 0 ? (apps.reduce((s, a) => s + Number(a.avg_rating ?? 0), 0) / apps.length).toFixed(1) : '—', color: 'text-yellow-600' },
          { label: 'Total Reviews', value: apps.reduce((s, a) => s + (a.review_count ?? 0), 0), color: 'text-purple-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl p-3">
            <p className={cn('text-2xl font-black', stat.color)}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <ChartCard title="Installs — Last 7 Days (Real Data)">
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={weeklyData}>
            <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Line type="monotone" dataKey="installs" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {downloadsData.length > 0 && (
        <ChartCard title="Downloads by App">
          <ResponsiveContainer width="100%" height={Math.max(100, downloadsData.length * 36)}>
            <BarChart data={downloadsData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="downloads" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                {downloadsData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {categoryData.length > 1 && (
        <ChartCard title="Apps by Category">
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={categoryData}>
              <XAxis dataKey="cat" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]}>
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {statusData.length > 1 && (
        <ChartCard title="App Status Distribution">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}
                label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <ChartCard title="Apps by Average Rating">
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={ratingData}>
            <XAxis dataKey="star" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

// ── Main DeveloperPortal ──────────────────────────────────────────
type PortalTab = 'apps' | 'analytics' | 'profile';

const DeveloperPortal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState<DBApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingApp, setEditingApp] = useState<DBApp | null>(null);
  const [bumpingId, setBumpingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PortalTab>('apps');
  const [changelogApp, setChangelogApp] = useState<DBApp | null>(null);
  const [showBioEdit, setShowBioEdit] = useState(false);
  const [devProfile, setDevProfile] = useState({ bio: '', company: '', website: '' });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchDeveloperApps(user.id).then(setApps).catch(() => {}).finally(() => setLoading(false));
    supabase.from('user_profiles').select('bio, company, website, avatar_url').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setDevProfile({ bio: data.bio || '', company: data.company || '', website: data.website || '' });
          setAvatarUrl(data.avatar_url || null);
        }
      })
      .catch(() => {});
  }, [user?.id]);

  if (!user) return null;

  const totalDownloads = apps.reduce((s, a) => s + a.downloads_count, 0);
  const approvedCount = apps.filter(a => a.status === 'approved').length;
  const avgRating = apps.length > 0 ? (apps.reduce((s, a) => s + Number(a.avg_rating ?? 0), 0) / apps.length).toFixed(1) : '—';

  const hasUpdateBadge = (app: DBApp) => app.tags?.includes('update-pending') && app.status === 'approved';

  const handleDelete = async (appId: string) => {
    try {
      await deleteApp(appId);
      setApps(prev => prev.filter(a => a.id !== appId));
      toast.success('App deleted');
    } catch { toast.error('Failed to delete app'); }
  };

  const handleBumpVersion = async (app: DBApp, changelog: string) => {
    setBumpingId(app.id);
    setChangelogApp(null);
    try {
      const newVersion = bumpVersionStr(app.version);
      const newTags = [...(app.tags || []).filter(t => t !== 'update-pending'), 'update-pending'];
      const [updated] = await Promise.all([
        updateApp(app.id, { version: newVersion, tags: newTags }),
        supabase.from('app_versions').insert({
          app_id: app.id,
          version: newVersion,
          changelog: changelog.trim() || null,
        }),
      ]);
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, version: (updated as DBApp).version, tags: (updated as DBApp).tags } : a));
      toast.success(`v${newVersion} released! Installed users notified.`);
    } catch { toast.error('Failed to bump version'); }
    finally { setBumpingId(null); }
  };

  const handleFormDone = (app: DBApp) => {
    if (editingApp) {
      setApps(prev => prev.map(a => a.id === app.id ? app : a));
    } else {
      setApps(prev => [app, ...prev]);
    }
    setEditingApp(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-5 pt-10 pb-5">
        <div className="flex items-end justify-between mb-4">
          <AvatarUpload
            userId={user.id}
            currentAvatar={avatarUrl}
            username={user.username}
            onSaved={setAvatarUrl}
          />
          <button onClick={() => { setEditingApp(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full text-sm font-semibold transition-colors mb-1">
            <Plus size={15} />Submit
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Apps Live', value: approvedCount },
            { label: 'Downloads', value: totalDownloads > 999 ? `${(totalDownloads / 1000).toFixed(0)}K` : totalDownloads },
            { label: 'Avg Rating', value: avgRating },
          ].map(stat => (
            <div key={stat.label} className="bg-white/15 rounded-2xl px-3 py-3 text-center">
              <p className="text-white font-bold text-xl">{stat.value}</p>
              <p className="text-white/70 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-border/50 sticky top-0 z-10">
        {([['apps', 'My Apps', Package], ['analytics', 'Analytics', BarChart2], ['profile', 'Profile', User]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setActiveTab(id as PortalTab)}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-3.5 text-sm font-semibold border-b-2 transition-colors',
              activeTab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-5">
        {activeTab === 'analytics' ? (
          <AnalyticsSection apps={apps} />
        ) : activeTab === 'profile' ? (
          /* ── Profile Tab ── */
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-sm text-foreground">Developer Profile</p>
                <button onClick={() => setShowBioEdit(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
                  <Edit2 size={11} />Edit
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    <User size={11} />Bio
                  </p>
                  {devProfile.bio ? (
                    <p className="text-sm text-foreground leading-relaxed">{devProfile.bio}</p>
                  ) : (
                    <button onClick={() => setShowBioEdit(true)} className="text-sm text-muted-foreground italic hover:text-primary transition-colors text-left">
                      Add a bio to introduce yourself to users...
                    </button>
                  )}
                </div>
                {devProfile.company && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <Building2 size={11} />Company
                    </p>
                    <p className="text-sm text-foreground">{devProfile.company}</p>
                  </div>
                )}
                {devProfile.website && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <Globe size={11} />Website
                    </p>
                    <a href={devProfile.website} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline">{devProfile.website}</a>
                  </div>
                )}
                {!devProfile.bio && !devProfile.company && !devProfile.website && (
                  <button onClick={() => setShowBioEdit(true)}
                    className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2">
                    <Plus size={15} />Complete your developer profile
                  </button>
                )}
              </div>
            </div>

            <button onClick={() => navigate(`/developer/${user.id}`)}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-card border border-border rounded-2xl hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Globe size={16} className="text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-foreground">View Public Profile</p>
                  <p className="text-xs text-muted-foreground">See how users see your developer page</p>
                </div>
              </div>
              <FileText size={15} className="text-muted-foreground" />
            </button>

            {apps.filter(a => a.status === 'approved').length > 0 && (
              <div className="bg-secondary/50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Live Apps</p>
                <div className="space-y-2">
                  {apps.filter(a => a.status === 'approved').slice(0, 3).map(app => (
                    <div key={app.id} className="flex items-center gap-2">
                      <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-1">{app.name}</p>
                        <p className="text-xs text-muted-foreground">v{app.version} · {app.downloads_count} installs</p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Live</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Apps Tab ── */
          <>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-secondary rounded-2xl animate-pulse" />)}
              </div>
            ) : apps.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center mx-auto mb-4">
                  <Package size={28} className="text-muted-foreground" />
                </div>
                <p className="font-semibold text-foreground mb-1">No apps yet</p>
                <p className="text-sm text-muted-foreground mb-4">Submit your first app to get started</p>
                <button onClick={() => setShowForm(true)}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:bg-primary/90">
                  Submit App
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {apps.map(app => (
                  <div key={app.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                    {app.thumbnail && (
                      <div className="relative">
                        <img src={app.thumbnail} alt={app.name} className="w-full h-28 object-cover" />
                        {hasUpdateBadge(app) && (
                          <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <ArrowUpCircle size={11} />Update Pending
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-3 p-3">
                      <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-foreground line-clamp-1">{app.name}</p>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                            app.status === 'approved' ? 'bg-green-100 text-green-700' :
                            app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
                            {app.status}
                          </span>
                          {app.apk_url && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                              <Smartphone size={9} />APK
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{app.category} · v{app.version}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1">
                            <TrendingUp size={11} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{app.downloads_count} installs</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star size={11} className="fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-muted-foreground">{Number(app.avg_rating ?? 0).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 px-3 pb-3">
                      <button onClick={() => navigate(`/app/${app.id}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-accent transition-colors">
                        View
                      </button>
                      <button onClick={() => { setEditingApp(app); setShowForm(true); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-accent transition-colors">
                        <Edit2 size={12} />Edit
                      </button>
                      {app.status === 'approved' && (
                        <button onClick={() => setChangelogApp(app)} disabled={bumpingId === app.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-orange-200 bg-orange-50 text-orange-700 text-xs font-semibold hover:bg-orange-100 disabled:opacity-60 transition-colors">
                          <ArrowUpCircle size={12} />{bumpingId === app.id ? '...' : 'Bump'}
                        </button>
                      )}
                      <button onClick={() => handleDelete(app.id)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-destructive/10 border border-border flex-shrink-0 transition-colors">
                        <Trash2 size={14} className="text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Changelog Modal */}
      {changelogApp && (
        <ChangelogModal
          app={changelogApp}
          onClose={() => setChangelogApp(null)}
          onConfirm={(changelog) => handleBumpVersion(changelogApp, changelog)}
        />
      )}

      {/* Bio Edit Modal */}
      {showBioEdit && (
        <BioEditModal
          userId={user.id}
          initial={devProfile}
          onClose={() => setShowBioEdit(false)}
          onSaved={(data) => setDevProfile(data)}
        />
      )}

      {/* App Form */}
      {showForm && (
        <AppForm
          developerId={user.id}
          developerName={user.username}
          onClose={() => { setShowForm(false); setEditingApp(null); }}
          onDone={handleFormDone}
          editApp={editingApp}
        />
      )}
    </div>
  );
};

export default DeveloperPortal;
