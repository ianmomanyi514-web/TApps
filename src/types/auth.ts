export type UserRole = 'user' | 'developer' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  company?: string;
  website?: string;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  updateUser: (partial: Partial<AuthUser>) => void;
}
