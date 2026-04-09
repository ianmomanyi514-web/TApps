import { useState } from 'react';
import { App } from '@/types/app';
import { X, Star, Download, Shield, ChevronDown, ChevronUp, Share2 } from 'lucide-react';
import AppIcon from './AppIcon';
import { InstallButton } from './AppCard';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AppDetailModalProps {
  app: App | null;
  onClose: () => void;
}

const AppDetailModal = ({ app, onClose }: AppDetailModalProps) => {
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installed, setInstalled] = useState(app?.isInstalled || false);

  if (!app) return null;

  const formatReviews = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toString();
  };

  const handleInstall = () => {
    if (installed) {
      toast.success(`Opening ${app.name}...`);
      return;
    }
    setIsInstalling(true);
    toast.loading(`Installing ${app.name}...`, { duration: 2000 });
    setTimeout(() => {
      setIsInstalling(false);
      setInstalled(true);
      toast.success(`${app.name} installed successfully!`);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary hover:bg-accent transition-colors"
            >
              <X size={18} />
            </button>
            <button
              onClick={() => toast.success('Link copied!')}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary hover:bg-accent transition-colors"
            >
              <Share2 size={18} />
            </button>
          </div>

          <div className="flex items-start gap-4">
            <AppIcon icon={app.icon} iconBg={app.iconBg} name={app.name} size="xl" />
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-xl text-foreground leading-tight">{app.name}</h2>
              <p className="text-primary text-sm font-medium mt-0.5">{app.developer}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {app.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-border py-4 mx-4">
          <div className="flex flex-col items-center gap-1 px-3">
            <div className="flex items-center gap-1">
              <span className="font-bold text-base">{app.rating.toFixed(1)}</span>
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
            </div>
            <p className="text-xs text-muted-foreground">{formatReviews(app.reviews)} reviews</p>
          </div>
          <div className="flex flex-col items-center gap-1 px-3">
            <div className="flex items-center gap-1">
              <Download size={14} className="text-foreground" />
              <span className="font-bold text-base">{app.downloads}</span>
            </div>
            <p className="text-xs text-muted-foreground">Downloads</p>
          </div>
          <div className="flex flex-col items-center gap-1 px-3">
            <div className="flex items-center gap-1">
              <Shield size={14} className="text-foreground" />
              <span className="font-bold text-sm">{app.contentRating}</span>
            </div>
            <p className="text-xs text-muted-foreground">Rated for</p>
          </div>
        </div>

        {/* Install Button */}
        <div className="px-4 mb-4">
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className={cn(
              'w-full py-3 rounded-full font-semibold text-base transition-all',
              installed
                ? 'bg-secondary text-secondary-foreground hover:bg-accent'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
              isInstalling && 'opacity-70 cursor-not-allowed'
            )}
          >
            {isInstalling ? 'Installing...' : installed ? 'Open' : 'Install'}
          </button>
        </div>

        {/* Fake screenshots placeholder */}
        <div className="px-4 mb-4">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-36 h-64 rounded-2xl overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${app.iconBg}33, ${app.iconBg}88)`,
                }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <AppIcon icon={app.icon} iconBg={app.iconBg} name={app.name} size="lg" className="opacity-30" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="px-4 mb-4">
          <h3 className="font-bold text-base mb-2">About this app</h3>
          <p className={cn(
            'text-sm text-muted-foreground leading-relaxed',
            !showFullDesc && 'line-clamp-3'
          )}>
            {app.description}
          </p>
          <button
            onClick={() => setShowFullDesc(!showFullDesc)}
            className="flex items-center gap-1 text-primary text-sm font-medium mt-2"
          >
            {showFullDesc ? (
              <><ChevronUp size={16} /> Show less</>
            ) : (
              <><ChevronDown size={16} /> Read more</>
            )}
          </button>
        </div>

        {/* App Info */}
        <div className="px-4 mb-8">
          <h3 className="font-bold text-base mb-3">App info</h3>
          <div className="space-y-3">
            {[
              { label: 'Version', value: app.version },
              { label: 'Updated on', value: app.lastUpdated },
              { label: 'Downloads', value: app.downloads },
              { label: 'Size', value: app.size },
              { label: 'Content rating', value: app.contentRating },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
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

export default AppDetailModal;
