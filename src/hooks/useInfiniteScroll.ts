
import { useEffect, useRef, useState, useCallback } from 'react';

interface UseInfiniteScrollOptions<T> {
  fetchFn: (page: number) => Promise<T[]>;
  pageSize?: number;
}

export function useInfiniteScroll<T>({ fetchFn, pageSize = 20 }: UseInfiniteScrollOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(async (pageNum: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await fetchFn(pageNum);
      if (data.length < pageSize) setHasMore(false);
      setItems(prev => pageNum === 0 ? data : [...prev, ...data]);
      setInitialLoaded(true);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, pageSize, loading]);

  // Initial load
  useEffect(() => {
    setItems([]);
    setPage(0);
    setHasMore(true);
    setInitialLoaded(false);
    loadPage(0);
  }, [fetchFn, loadPage]);

  // Intersection observer for sentinel
  useEffect(() => {
    if (!hasMore || !initialLoaded) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => {
            const next = prev + 1;
            loadPage(next);
            return next;
          });
        }
      },
      { rootMargin: '200px' }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, initialLoaded, loading, loadPage]);

  const refresh = useCallback(() => {
    setItems([]);
    setPage(0);
    setHasMore(true);
    setInitialLoaded(false);
    loadPage(0);
  }, [loadPage]);

  return { items, loading, hasMore, initialLoaded, sentinelRef, refresh };
}
