import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthUser, AuthState } from '@/types/auth';
import { mapSupabaseUser, fetchUserProfile } from '@/lib/auth';
import { User } from '@supabase/supabase-js';

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const login = (u: AuthUser) => setUser(u);
  const logout = () => setUser(null);
  const updateUser = (partial: Partial<AuthUser>) =>
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));

  // Fast path: map from JWT metadata without a DB round-trip
  const resolveUserFast = (supabaseUser: User) => mapSupabaseUser(supabaseUser);

  // Slow path: enrich with DB profile (role, bio, avatar, etc.)
  const resolveUserFull = async (supabaseUser: User) => {
    const profile = await fetchUserProfile(supabaseUser.id);
    return mapSupabaseUser(supabaseUser, profile || undefined);
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (mounted && session?.user) {
        // Show the user immediately from JWT metadata (instant)
        login(resolveUserFast(session.user));
        // Then silently enrich with DB profile in background
        resolveUserFull(session.user).then(authUser => {
          if (mounted) login(authUser);
        }).catch(() => {});
      }
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
        // Instantly log in from metadata, then enrich from DB
        login(resolveUserFast(session.user));
        setLoading(false);
        resolveUserFull(session.user).then(authUser => {
          if (mounted) login(authUser);
        }).catch(() => {});
      } else if (event === 'SIGNED_OUT') {
        logout();
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // No re-fetch needed on token refresh — metadata is still valid
        login(resolveUserFast(session.user));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
