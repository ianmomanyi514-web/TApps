import { useEffect, useRef, useState, useCallback } from 'react';

interface UseInfiniteScrollOptions<T> {
  fetchFn: (page: number) => Promise<T[]>;
  pageSize?: number;
}

export function useInfiniteScroll<T>({ fetchFn, pageSize = 20 }: UseInfiniteScrollOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const pageRef = useRef(0);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadPage = useCallback(async (pageNum: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const data = await fetchFn(pageNum);
      if (data.length < pageSize) {
        hasMoreRef.current = false;
        setHasMore(false);
      }
      setItems(prev => pageNum === 0 ? data : [...prev, ...data]);
      setInitialLoaded(true);
    } catch {
      hasMoreRef.current = false;
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [fetchFn, pageSize]);

  // Initial load — re-run only when fetchFn changes
  useEffect(() => {
    setItems([]);
    pageRef.current = 0;
    hasMoreRef.current = true;
    setHasMore(true);
    setInitialLoaded(false);
    loadingRef.current = false;
    loadPage(0);
  }, [fetchFn]); // intentionally NOT including loadPage to avoid loop

  // Stable intersection observer — set up once after initial load
  useEffect(() => {
    if (!initialLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
          const next = pageRef.current + 1;
          pageRef.current = next;
          loadPage(next);
        }
      },
      { rootMargin: '300px' }
    );

    observerRef.current = observer;

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [initialLoaded, loadPage]);

  const refresh = useCallback(() => {
    setItems([]);
    pageRef.current = 0;
    hasMoreRef.current = true;
    setHasMore(true);
    setInitialLoaded(false);
    loadingRef.current = false;
    loadPage(0);
  }, [loadPage]);

  return { items, loading, hasMore, initialLoaded, sentinelRef, refresh };
}
