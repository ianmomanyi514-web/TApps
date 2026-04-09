import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import SectionHeader from '@/components/features/SectionHeader';
import HorizontalAppList from '@/components/features/HorizontalAppList';
import FeaturedBanner from '@/components/features/FeaturedBanner';
import AppDetailModal from '@/components/features/AppDetailModal';
import { App } from '@/types/app';
import { FEATURED_APPS, SUGGESTED_APPS, RECOMMENDED_APPS, APP_CATEGORIES } from '@/constants/mockData';
import { cn } from '@/lib/utils';

const APPS_TABS = ['For you', 'Top charts', 'Editors', 'Categories'];
const appFeatured = FEATURED_APPS.filter(a => a.type === 'app').concat([FEATURED_APPS[0]]);

const AppsPage = () => {
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [activeTab, setActiveTab] = useState('For you');

  const appsOnly = SUGGESTED_APPS.filter(a => a.type === 'app');
  const moreApps = RECOMMENDED_APPS.filter(a => a.type === 'app');

  return (
    <div className="min-h-screen bg-background pb-24">
      <TopBar />

      {/* Sub tabs */}
      <div className="sticky top-[57px] z-30 bg-white border-b border-border/50">
        <div className="flex overflow-x-auto scrollbar-hide px-2">
          {APPS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2',
                activeTab === tab
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {/* Featured App Banner */}
        <FeaturedBanner
          apps={[FEATURED_APPS[1], FEATURED_APPS[2], FEATURED_APPS[0]]}
          onAppClick={setSelectedApp}
        />

        {/* Suggested for you */}
        <div className="mb-6">
          <SectionHeader title="Suggested for you" sponsored />
          <HorizontalAppList apps={SUGGESTED_APPS} onAppClick={setSelectedApp} />
        </div>

        {/* Essential Apps */}
        <div className="mb-6">
          <SectionHeader title="Essential apps" onMore={() => {}} />
          <HorizontalAppList apps={moreApps} onAppClick={setSelectedApp} />
        </div>

        {/* Browse app categories */}
        <div className="mb-6">
          <SectionHeader title="Browse categories" />
          <div className="mx-4 rounded-2xl border border-border overflow-hidden">
            <div className="grid grid-cols-2">
              {APP_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.id}
                  className={cn(
                    'flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors',
                    i % 2 === 0 && i < APP_CATEGORIES.length - 1 && 'border-r border-border',
                    i < APP_CATEGORIES.length - 2 && 'border-b border-border'
                  )}
                >
                  <span className="text-sm font-medium text-foreground">{cat.name}</span>
                  <span className="text-xl">{cat.icon}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Top productivity */}
        <div className="mb-6">
          <SectionHeader title="Top productivity apps" onMore={() => {}} />
          <HorizontalAppList apps={[...SUGGESTED_APPS].reverse()} onAppClick={setSelectedApp} />
        </div>
      </div>

      <AppDetailModal app={selectedApp} onClose={() => setSelectedApp(null)} />
    </div>
  );
};

export default AppsPage;
