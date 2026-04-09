import { supabase } from '@/lib/supabase';
import { DBApp } from '@/types/database';
import { FunctionsHttpError } from '@supabase/supabase-js';

// Add to existing api.ts - featured management
export async function fetchFeaturedApps(): Promise<DBApp[]> {
  const { data, error } = await supabase
    .from('apps_with_stats')
    .select('*')
    .eq('status', 'approved')
    .eq('featured', true)
    .order('featured_order', { ascending: true });
  if (error) throw error;
  return (data || []) as DBApp[];
}

export async function reorderFeaturedApps(orderedIds: string[]): Promise<void> {
  // Update each app's featured_order based on position
  const updates = orderedIds.map((id, idx) =>
    supabase.from('apps').update({ featured_order: idx }).eq('id', id)
  );
  await Promise.all(updates);
}

export async function generateAppDescription(params: {
  appName: string;
  category: string;
  type: string;
  tags: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-description', {
    body: params,
  });

  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const text = await error.context?.text();
        msg = text || msg;
      } catch { /* ignore */ }
    }
    throw new Error(msg);
  }

  return data?.description || '';
}

export async function sendNotificationEmail(payload: {
  type: 'app_approved' | 'app_rejected' | 'new_review';
  recipientEmail: string;
  recipientName: string;
  appName?: string;
  appId?: string;
  reviewerName?: string;
  rating?: number;
}): Promise<void> {
  const { error } = await supabase.functions.invoke('send-email', {
    body: payload,
  });

  if (error) {
    console.error('Email notification failed:', error.message);
    // Non-fatal — don't throw, just log
  }
}
