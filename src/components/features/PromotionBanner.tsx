import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Megaphone, X } from 'lucide-react';

interface BannerSettings {
  enabled: boolean;
  text: string;
  color: string;
}

const PromotionBanner = () => {
  const [banner, setBanner] = useState<BannerSettings | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'promotion_banner').single()
      .then(({ data }) => {
        if (data?.value) {
          const settings = data.value as BannerSettings;
          if (settings.enabled && settings.text) {
            // Check if dismissed this session
            const key = `promo_dismissed_${btoa(settings.text).slice(0, 8)}`;
            if (!sessionStorage.getItem(key)) {
              setBanner(settings);
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    if (!banner) return;
    const key = `promo_dismissed_${btoa(banner.text).slice(0, 8)}`;
    sessionStorage.setItem(key, '1');
    setDismissed(true);
  };

  if (!banner || dismissed) return null;

  return (
    <div
      className="mx-4 mb-4 rounded-2xl px-4 py-3 flex items-center justify-between gap-2 text-white shadow-sm"
      style={{ backgroundColor: banner.color }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Megaphone size={15} className="flex-shrink-0" />
        <p className="text-sm font-semibold truncate">{banner.text}</p>
      </div>
      <button
        onClick={handleDismiss}
        className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
      >
        <X size={13} />
      </button>
    </div>
  );
};

export default PromotionBanner;
