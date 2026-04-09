import { useState, useEffect, useRef } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { fetchApprovedApps } from '@/lib/api';
import { DBApp } from '@/types/database';
import AppIcon from '@/components/features/AppIcon';
import StarRating from '@/components/features/StarRating';
import SectionHeader from '@/components/features/SectionHeader';
import { cn } from '@/lib/utils';
import { GAME_CATEGORIES, APP_CATEGORIES, SEARCH_SUGGESTIONS } from '@/constants/mockData';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const ALL_CATEGORIES = ['All', 'Action', 'Adventure', 'Business', 'Casual', 'Education', 'Entertainment', 'Finance', 'Health', 'Music & Audio', 'Photography', 'Productivity', 'Puzzle', 'Racing', 'Role Playing', 'Shopping', 'Simulation', 'Social', 'Sports', 'Strategy', 'Travel', 'Video'];

const SORT_OPTIONS = [
  { label: 'Relevance', value: 'downloads_count' },
  { label: 'Top Rated', value: 'avg_rating' },
  { label: 'Newest', value: 'created_at' },
] as const;

const RATING_FILTERS = [
  { label: 'Any Rating', value: 0 },
  { label: '4★ & up', value: 4 },
  { label: '3★ & up', value: 3 },
  { label: '2★ & up', value: 2 },
] as const;

type SortValue = typeof SORT_OPTIONS[number]['value'];

interface AutocompleteSuggestion {
  id: string;
  name: string;
  icon: string;
  icon_bg: string;
  category: string;
  developer_name: string;
}

const LiveSearchPage = ({ onAuthRequired }: { onAuthRequired: () => void }) => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('tag') ? '#' + searchParams.get('tag') : '');
  const [results, setResults] = useState<DBApp[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'app' | 'game'>('all');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterTag, setFilterTag] = useState(searchParams.get('tag') || '');
  const [sortBy, setSortBy] = useState<SortValue>('downloads_count');
  const [minRating, setMinRating] = useState(0);

  // Autocomplete
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch autocomplete suggestions (fast, lightweight)
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('apps')
          .select('id, name, icon, icon_bg, category, developer_name')
          .eq('status', 'approved')
          .ilike('name', `%${query.trim()}%`)
          .limit(6);

        if (!controller.signal.aborted) {
          setSuggestions((data || []) as AutocompleteSuggestion[]);
          setShowSuggestions(true);
          setHighlightedIdx(-1);
        }
      } catch { /* ignore */ }
    }, 150);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  // Handle tag param from URL
  useEffect(() => {
    const tag = searchParams.get('tag');
    if (tag) {
      setFilterTag(tag);
      setQuery('#' + tag);
    }
  }, [searchParams]);

  // Full search results
  useEffect(() => {
    if (!query.trim() && filterCategory === 'All' && filterType === 'all' && !filterTag) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        // Tag search: query the apps table directly for tag containment
        if (filterTag) {
          const { data } = await supabase
            .from('apps_with_stats')
            .select('*')
            .eq('status', 'approved')
            .contains('tags', [filterTag])
            .order(sortBy, { ascending: false });
          setResults((data || []) as import('@/types/database').DBApp[]);
          setLoading(false);
          return;
        }
        const params: Parameters<typeof fetchApprovedApps>[0] = {
          search: query.trim().startsWith('#') ? undefined : (query.trim() || undefined),
          orderBy: sortBy,
          minRating: minRating > 0 ? minRating : undefined,
        };
        if (filterType !== 'all') params.type = filterType;
        if (filterCategory !== 'All') params.category = filterCategory;

        const data = await fetchApprovedApps(params);
        setResults(data);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(timeout);
  }, [query, filterType, filterCategory, sortBy, filterTag, minRating]);

  const hasActiveFilters = filterType !== 'all' || filterCategory !== 'All' || sortBy !== 'downloads_count' || !!filterTag || minRating > 0;
  const isSearchActive = query.trim() || hasActiveFilters;

  const clearFilters = () => {
    setFilterType('all');
    setFilterCategory('All');
    setSortBy('downloads_count');
    setFilterTag('');
    setMinRating(0);
    setQuery('');
  };

  const handleSelectSuggestion = (suggestion: AutocompleteSuggestion) => {
    setShowSuggestions(false);
    setSuggestions([]);
    navigate(`/app/${suggestion.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && highlightedIdx >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[highlightedIdx]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const highlightMatch = (text: string, q: string) => {
    if (!q) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-black text-foreground">{text.slice(idx, idx + q.length)}</span>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Search bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-border/50">
        <div className="px-4 py-3">
          <div className="relative">
            <div className={cn('flex items-center gap-3 bg-secondary rounded-full px-4 py-2.5 transition-all',
              isFocused && 'ring-2 ring-primary/20')}>
              <Search size={18} className={cn('transition-colors flex-shrink-0', isFocused ? 'text-primary' : 'text-muted-foreground')} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => { setIsFocused(true); if (suggestions.length > 0) setShowSuggestions(true); }}
                onBlur={() => {
                  setIsFocused(false);
                  // Delay to allow click on suggestion
                  setTimeout(() => setShowSuggestions(false), 150);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search apps & games"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {query ? (
                <button onClick={() => { setQuery(''); setSuggestions([]); setShowSuggestions(false); }}>
                  <X size={16} className="text-muted-foreground" />
                </button>
              ) : (
                <button onClick={() => setShowFilters(!showFilters)}>
                  <SlidersHorizontal size={17} className={cn('transition-colors', showFilters || hasActiveFilters ? 'text-primary' : 'text-muted-foreground')} />
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-border/60 overflow-hidden z-50"
              >
                {suggestions.map((sug, i) => (
                  <button
                    key={sug.id}
                    onMouseDown={() => handleSelectSuggestion(sug)}
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-3 text-left transition-colors',
                      i < suggestions.length - 1 && 'border-b border-border/30',
                      highlightedIdx === i ? 'bg-primary/5' : 'hover:bg-accent/50'
                    )}
                  >
                    <AppIcon icon={sug.icon} iconBg={sug.icon_bg} name={sug.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground font-medium line-clamp-1">
                        {highlightMatch(sug.name, query)}
                      </p>
                      <p className="text-xs text-muted-foreground/60 line-clamp-1">
                        {sug.category} · {sug.developer_name}
                      </p>
                    </div>
                    <Search size={13} className="text-muted-foreground/40 flex-shrink-0" />
                  </button>
                ))}

                {/* Search all option */}
                <button
                  onMouseDown={() => { setShowSuggestions(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Search size={14} className="text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-primary">
                    Search all results for "{query}"
                  </p>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="px-4 pb-3 space-y-3 border-t border-border/50 pt-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Type</p>
              <div className="flex gap-2">
                {(['all', 'app', 'game'] as const).map(t => (
                  <button key={t} onClick={() => setFilterType(t)}
                    className={cn('px-4 py-1.5 rounded-full text-xs font-semibold border capitalize transition-colors',
                      filterType === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent')}>
                    {t === 'all' ? 'All Types' : t === 'app' ? 'Apps' : 'Games'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Min Rating</p>
              <div className="flex gap-2 flex-wrap">
                {RATING_FILTERS.map(opt => (
                  <button key={opt.value} onClick={() => setMinRating(opt.value)}
                    className={cn('px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                      minRating === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent')}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Sort by</p>
              <div className="flex gap-2">
                {SORT_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setSortBy(opt.value)}
                    className={cn('px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                      sortBy === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent')}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Category</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {ALL_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setFilterCategory(cat)}
                    className={cn('flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                      filterCategory === cat ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent')}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-primary font-semibold hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Active filter chips */}
        {!showFilters && hasActiveFilters && (
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
            {filterType !== 'all' && (
              <span className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                {filterType === 'app' ? 'Apps' : 'Games'}
                <button onClick={() => setFilterType('all')}><X size={11} /></button>
              </span>
            )}
            {filterCategory !== 'All' && (
              <span className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                {filterCategory}
                <button onClick={() => setFilterCategory('All')}><X size={11} /></button>
              </span>
            )}
            {sortBy !== 'downloads_count' && (
              <span className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
                <button onClick={() => setSortBy('downloads_count')}><X size={11} /></button>
              </span>
            )}
            {minRating > 0 && (
              <span className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                {minRating}★ & up
                <button onClick={() => setMinRating(0)}><X size={11} /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {isSearchActive ? (
        <div className="mt-2 px-2">
          {loading ? (
            <div className="space-y-2 px-2 mt-2">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-secondary rounded-2xl animate-pulse" />)}
            </div>
          ) : results.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground px-3 py-2 font-medium">
                {results.length} result{results.length !== 1 ? 's' : ''}{query ? ` for "${query}"` : ''}
              </p>
              <div className="space-y-1">
                {results.map(app => (
                  <button key={app.id} onClick={() => navigate(`/app/${app.id}`)}
                    className="flex items-center gap-3 w-full p-3 hover:bg-accent/50 rounded-xl transition-colors text-left">
                    <AppIcon icon={app.icon} iconBg={app.icon_bg} name={app.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground line-clamp-1">{app.name}</p>
                      <p className="text-xs text-muted-foreground">{app.developer_name} · {app.category}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarRating rating={Number(app.avg_rating ?? 0)} size={11} />
                        <span className="text-xs text-muted-foreground">{app.downloads_count}+ installs</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                      {app.price === 0 ? 'Free' : `$${app.price}`}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Search size={28} className="text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground mb-1">No results found</p>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters ? 'Try adjusting your filters' : 'Try different keywords'}
              </p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-3 text-sm text-primary font-semibold hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <div className="mb-6">
            <SectionHeader title="Explore games" />
            <div className="mx-4 rounded-2xl border border-border overflow-hidden">
              <div className="grid grid-cols-2">
                {GAME_CATEGORIES.map((cat, i) => (
                  <button key={cat.id} onClick={() => { setQuery(cat.name); setFilterType('game'); }}
                    className={cn('flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors',
                      i % 2 === 0 && 'border-r border-border', i < GAME_CATEGORIES.length - 2 && 'border-b border-border')}>
                    <span className="text-sm font-medium text-foreground">{cat.name}</span>
                    <span className="text-xl">{cat.icon}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mb-6">
            <SectionHeader title="You might like" />
            <div className="mx-4 rounded-2xl border border-border overflow-hidden">
              <div className="grid grid-cols-2">
                {SEARCH_SUGGESTIONS.map((sug, i) => (
                  <button key={sug} onClick={() => setQuery(sug)}
                    className={cn('flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors',
                      i % 2 === 0 && 'border-r border-border', i < SEARCH_SUGGESTIONS.length - 2 && 'border-b border-border')}>
                    <span className="text-sm font-medium text-foreground">{sug}</span>
                    <Search size={16} className="text-primary flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mb-6">
            <SectionHeader title="Browse categories" />
            <div className="overflow-x-auto scrollbar-hide px-4">
              <div className="flex gap-3 pb-2">
                {APP_CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => { setFilterCategory(cat.name); setShowFilters(false); }}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-white hover:bg-accent transition-colors">
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-sm font-medium whitespace-nowrap">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveSearchPage;
