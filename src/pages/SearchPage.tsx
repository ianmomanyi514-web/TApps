import { useState, useRef } from 'react';
import { Search, Mic, X } from 'lucide-react';
import AppCard from '@/components/features/AppCard';
import HorizontalAppList from '@/components/features/HorizontalAppList';
import SectionHeader from '@/components/features/SectionHeader';
import AppDetailModal from '@/components/features/AppDetailModal';
import { App } from '@/types/app';
import { ALL_APPS, SUGGESTED_APPS, GAME_CATEGORIES, APP_CATEGORIES, SEARCH_SUGGESTIONS } from '@/constants/mockData';
import { cn } from '@/lib/utils';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredApps = query.trim().length > 0
    ? ALL_APPS.filter(app =>
        app.name.toLowerCase().includes(query.toLowerCase()) ||
        app.developer.toLowerCase().includes(query.toLowerCase()) ||
        app.category.toLowerCase().includes(query.toLowerCase()) ||
        app.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
      )
    : [];

  const hasResults = filteredApps.length > 0;
  const isSearching = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Search Bar Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3 bg-secondary rounded-full px-4 py-2.5">
          <Search size={18} className={cn('transition-colors', isFocused ? 'text-primary' : 'text-muted-foreground')} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search apps & games"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query ? (
            <button onClick={() => setQuery('')} className="p-0.5">
              <X size={16} className="text-muted-foreground" />
            </button>
          ) : (
            <button className="p-0.5">
              <Mic size={18} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {isSearching ? (
        <div className="mt-2 px-2">
          {hasResults ? (
            <>
              <p className="text-xs text-muted-foreground px-3 py-2 font-medium">
                {filteredApps.length} result{filteredApps.length !== 1 ? 's' : ''} for "{query}"
              </p>
              <div className="divide-y divide-border/50">
                {filteredApps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    onClick={setSelectedApp}
                    variant="horizontal"
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Search size={28} className="text-muted-foreground" />
              </div>
              <p className="text-base font-semibold text-foreground mb-1">No results found</p>
              <p className="text-sm text-muted-foreground">
                Try searching for "{query}" with different keywords
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4">
          {/* Explore Games */}
          <div className="mb-6">
            <SectionHeader title="Explore games" />
            <div className="mx-4 rounded-2xl border border-border overflow-hidden">
              <div className="grid grid-cols-2">
                {GAME_CATEGORIES.map((cat, i) => (
                  <button
                    key={cat.id}
                    className={cn(
                      'flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors',
                      i % 2 === 0 && i < GAME_CATEGORIES.length - 1 && 'border-r border-border',
                      i < GAME_CATEGORIES.length - 2 && 'border-b border-border'
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">{cat.name}</span>
                    <span className="text-xl">{cat.icon}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Suggested for you */}
          <div className="mb-6">
            <SectionHeader title="Suggested for you" sponsored />
            <HorizontalAppList apps={SUGGESTED_APPS} onAppClick={setSelectedApp} />
          </div>

          {/* You might like */}
          <div className="mb-6">
            <SectionHeader title="You might like" />
            <div className="mx-4 rounded-2xl border border-border overflow-hidden">
              <div className="grid grid-cols-2">
                {SEARCH_SUGGESTIONS.map((sug, i) => (
                  <button
                    key={sug}
                    onClick={() => setQuery(sug)}
                    className={cn(
                      'flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors',
                      i % 2 === 0 && i < SEARCH_SUGGESTIONS.length - 1 && 'border-r border-border',
                      i < SEARCH_SUGGESTIONS.length - 2 && 'border-b border-border'
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">{sug}</span>
                    <Search size={16} className="text-primary flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* App Categories */}
          <div className="mb-6">
            <SectionHeader title="Browse categories" />
            <div className="overflow-x-auto scrollbar-hide px-4">
              <div className="flex gap-3 pb-2">
                {APP_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-white hover:bg-accent transition-colors"
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-sm font-medium whitespace-nowrap">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <AppDetailModal app={selectedApp} onClose={() => setSelectedApp(null)} />
    </div>
  );
};

export default SearchPage;
