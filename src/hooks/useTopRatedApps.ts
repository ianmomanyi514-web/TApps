import { useState, useEffect } from 'react';
import { DBApp } from '@/types/database';
import { fetchApprovedApps } from '@/lib/api';

export function useTopRatedApps(limit = 8) {
  const [apps, setApps] = useState<DBApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovedApps({ orderBy: 'avg_rating', page: 0 })
      .then(data => {
        // Only include apps that have at least 1 review
        const withReviews = data.filter(a => (a.review_count ?? 0) > 0 || Number(a.avg_rating ?? 0) > 0);
        setApps((withReviews.length > 0 ? withReviews : data).slice(0, limit));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [limit]);

  return { apps, loading };
}
