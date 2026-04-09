import { useState, useEffect } from 'react';
import { DBApp } from '@/types/database';
import { fetchTrendingApps } from '@/lib/api';

export function useTrendingApps(limit = 10) {
  const [apps, setApps] = useState<DBApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingApps(limit)
      .then(setApps)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [limit]);

  return { apps, loading };
}
