import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AuthUser, UserRole } from '@/types/auth';

export function mapSupabaseUser(user: User, profileData?: Record<string, unknown>): AuthUser {
  return {
    id: user.id,
    email: user.email!,
    username:
      (profileData?.username as string) ||
      user.user_metadata?.username ||
      user.user_metadata?.full_name ||
      user.email!.split('@')[0],
    role: ((profileData?.role as UserRole) || user.user_metadata?.role || 'user') as UserRole,
    avatar: (profileData?.avatar_url as string) || user.user_metadata?.avatar_url,
    bio: profileData?.bio as string | undefined,
    company: profileData?.company as string | undefined,
    website: profileData?.website as string | undefined,
  };
}

export async function fetchUserProfile(userId: string): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}

class AuthService {
  async sendOtp(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  }

  async verifyOtpAndSetPassword(
    email: string,
    token: string,
    password: string,
    username: string,
    role: UserRole
  ) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw error;

    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      password,
      data: { username, role },
    });
    if (updateError) throw updateError;

    // Update profile role explicitly
    await supabase
      .from('user_profiles')
      .update({ username, role })
      .eq('id', updateData.user.id);

    return updateData.user;
  }

  async signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async updateProfile(userId: string, updates: Partial<{ username: string; bio: string; company: string; website: string; avatar_url: string }>) {
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);
    if (error) throw error;
  }
}

export const authService = new AuthService();
