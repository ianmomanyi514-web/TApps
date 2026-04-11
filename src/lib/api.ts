import { supabase } from '@/lib/supabase';
import { DBApp, DBReview, DBWishlist } from '@/types/database';
import { sendNotificationEmail } from '@/lib/featuredApi';

const PAGE_SIZE = 20;

// ========== APPS ==========
export async function fetchTrendingApps(limit = 10): Promise<DBApp[]> {
  const { data, error } = await supabase
    .from('trending_apps')
    .select('*')
    .limit(limit);
  if (error) throw error;
  return (data || []) as DBApp[];
}

export async function fetchApprovedApps(filters?: {
  category?: string;
  type?: string;
  search?: string;
  page?: number;
  orderBy?: 'downloads_count' | 'avg_rating' | 'created_at';
  tag?: string;
  minRating?: number;
}) {
  const page = filters?.page ?? 0;
  const orderBy = filters?.orderBy ?? 'downloads_count';

  let query = supabase
    .from('apps_with_stats')
    .select('*')
    .eq('status', 'approved')
    .order(orderBy, { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.type) query = query.eq('type', filters.type);
  if (filters?.search) query = query.ilike('name', `%${filters.search}%`);
  if (filters?.tag) query = query.contains('tags', [filters.tag]);
  if (filters?.minRating && filters.minRating > 0) query = query.gte('avg_rating', filters.minRating);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as DBApp[];
}

export async function fetchAllAppsAdmin(filters?: { status?: string; page?: number }) {
  const page = filters?.page ?? 0;
  let query = supabase
    .from('apps_with_stats')
    .select('*')
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as DBApp[];
}

export async function fetchDeveloperApps(developerId: string) {
  const { data, error } = await supabase
    .from('apps_with_stats')
    .select('*')
    .eq('developer_id', developerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as DBApp[];
}

export async function submitApp(appData: {
  developer_id: string;
  name: string;
  developer_name: string;
  category: string;
  type: 'app' | 'game';
  description: string;
  icon: string;
  icon_bg: string;
  version: string;
  size: string;
  content_rating: string;
  price: number;
  tags: string[];
  thumbnail?: string;
  screenshots_urls?: string[];
}) {
  const { data, error } = await supabase.from('apps').insert({ ...appData, status: 'approved' }).select().single();
  if (error) throw error;
  return data as DBApp;
}

export async function updateApp(appId: string, updates: Partial<DBApp>) {
  const { data, error } = await supabase
    .from('apps')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', appId)
    .select()
    .single();
  if (error) throw error;
  return data as DBApp;
}

export async function updateAppStatus(appId: string, status: 'approved' | 'rejected') {
  const { data, error } = await supabase
    .from('apps')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', appId)
    .select()
    .single();
  if (error) throw error;
  return data as DBApp;
}

export async function deleteApp(appId: string) {
  const { error } = await supabase.from('apps').delete().eq('id', appId);
  if (error) throw error;
}

// ========== MEDIA UPLOAD (XHR-based for large files) ==========
export async function uploadAppMedia(file: File, userId: string, appId: string, slot: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${appId}/${slot}.${ext}`;
  return uploadFileViaXHR(file, path, file.type || 'application/octet-stream');
}

/**
 * Upload a file directly to Supabase Storage via XHR.
 * XHR has no fetch timeout, supports progress, and handles large files reliably.
 */
export function uploadFileViaXHR(
  file: File,
  storagePath: string,
  contentType: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const url = `${supabaseUrl}/storage/v1/object/app-media/${storagePath}`;

    // Try to get user session token for auth
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token || anonKey;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.setRequestHeader('x-upsert', 'true');
      xhr.timeout = 0; // No timeout — critical for large files

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/app-media/${storagePath}`;
          onProgress?.(100);
          resolve(publicUrl);
        } else {
          reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload. Check your connection.'));
      xhr.ontimeout = () => reject(new Error('Upload timed out.'));

      xhr.send(file);
    }).catch(reject);
  });
}

// ========== REVIEWS ==========
export async function fetchAppReviews(appId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, user_profiles(username, avatar_url, role)')
    .eq('app_id', appId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as DBReview[];
}

export async function submitReview(review: { app_id: string; user_id: string; rating: number; comment: string }) {
  const { data, error } = await supabase
    .from('reviews')
    .upsert(review, { onConflict: 'app_id,user_id' })
    .select()
    .single();
  if (error) throw error;

  try {
    const { data: appData } = await supabase
      .from('apps')
      .select('name, developer_id, developer_name')
      .eq('id', review.app_id)
      .single();
    if (appData && appData.developer_id !== review.user_id) {
      const { data: devProfile } = await supabase
        .from('user_profiles')
        .select('email, username')
        .eq('id', appData.developer_id)
        .single();
      if (devProfile) {
        const { data: reviewerProfile } = await supabase
          .from('user_profiles')
          .select('username')
          .eq('id', review.user_id)
          .single();
        sendNotificationEmail({
          type: 'new_review',
          recipientEmail: devProfile.email,
          recipientName: devProfile.username || appData.developer_name,
          appName: appData.name,
          appId: review.app_id,
          reviewerName: reviewerProfile?.username || 'A user',
          rating: review.rating,
        });
      }
    }
  } catch { /* non-fatal */ }

  return data as DBReview;
}

export async function deleteReview(reviewId: string) {
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
  if (error) throw error;
}

// ========== WISHLIST ==========
export async function fetchUserWishlist(userId: string) {
  const { data, error } = await supabase
    .from('wishlists')
    .select('*, apps(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as DBWishlist[];
}

export async function addToWishlist(userId: string, appId: string) {
  const { data, error } = await supabase
    .from('wishlists')
    .insert({ user_id: userId, app_id: appId })
    .select()
    .single();
  if (error) throw error;
  return data as DBWishlist;
}

export async function removeFromWishlist(userId: string, appId: string) {
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('user_id', userId)
    .eq('app_id', appId);
  if (error) throw error;
}

export async function isInWishlist(userId: string, appId: string): Promise<boolean> {
  const { data } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .eq('app_id', appId)
    .single();
  return !!data;
}

// ========== INSTALLS ==========
export async function installApp(userId: string, appId: string) {
  const { error } = await supabase
    .from('installs')
    .insert({ user_id: userId, app_id: appId });
  if (error && !error.message.includes('duplicate')) throw error;
}

export async function fetchUserInstalls(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('installs')
    .select('app_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []).map((i) => i.app_id);
}

// ========== NOTIFICATIONS ==========
export interface DBNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  app_id: string | null;
  created_at: string;
}

export async function fetchNotifications(userId: string): Promise<DBNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []) as DBNotification[];
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}

export async function deleteNotification(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);
  if (error) throw error;
}

// ========== ADMIN ==========
export async function fetchAllUsers(page = 0) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .range(page * 30, (page + 1) * 30 - 1);
  if (error) throw error;
  return data || [];
}

export async function updateUserRole(userId: string, role: 'user' | 'developer' | 'admin') {
  const { error } = await supabase
    .from('user_profiles')
    .update({ role })
    .eq('id', userId);
  if (error) throw error;
}

export async function getStoreStats() {
  const [appsRes, usersRes, reviewsRes, installsRes] = await Promise.all([
    supabase.from('apps').select('id, status', { count: 'exact' }),
    supabase.from('user_profiles').select('id', { count: 'exact' }),
    supabase.from('reviews').select('id', { count: 'exact' }),
    supabase.from('installs').select('id', { count: 'exact' }),
  ]);
  const apps = appsRes.data || [];
  return {
    totalApps: apps.length,
    approvedApps: apps.filter((a) => a.status === 'approved').length,
    pendingApps: apps.filter((a) => a.status === 'pending').length,
    totalUsers: usersRes.count ?? 0,
    totalReviews: reviewsRes.count ?? 0,
    totalInstalls: installsRes.count ?? 0,
  };
}

// ========== LEADERBOARD ==========
export async function fetchDeveloperLeaderboard(limit = 20) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, username, avatar_url, verified, bio, company')
    .eq('role', 'developer')
    .limit(100);
  if (error) throw error;

  // For each developer, get their app stats
  const developers = data || [];
  const withStats = await Promise.all(
    developers.map(async (dev) => {
      const { data: apps } = await supabase
        .from('apps_with_stats')
        .select('downloads_count, avg_rating, review_count')
        .eq('developer_id', dev.id)
        .eq('status', 'approved');
      const appList = apps || [];
      const totalDownloads = appList.reduce((s, a) => s + (a.downloads_count || 0), 0);
      const avgRating = appList.length
        ? appList.reduce((s, a) => s + Number(a.avg_rating || 0), 0) / appList.length
        : 0;
      const totalReviews = appList.reduce((s, a) => s + (a.review_count || 0), 0);
      return {
        ...dev,
        app_count: appList.length,
        total_downloads: totalDownloads,
        avg_rating: avgRating,
        total_reviews: totalReviews,
        score: totalDownloads * 1 + avgRating * 100 + totalReviews * 5,
      };
    })
  );

  return withStats
    .filter((d) => d.app_count > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ========== COLLECTIONS ==========
export async function fetchCollections() {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('position', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchCollectionApps(collectionId: string): Promise<DBApp[]> {
  const { data, error } = await supabase
    .from('collection_apps')
    .select('position, apps:app_id(*)')
    .eq('collection_id', collectionId)
    .order('position', { ascending: true });
  if (error) throw error;
  return ((data || []).map((r: Record<string, unknown>) => r.apps) as DBApp[]).filter(Boolean);
}
