export interface DBApp {
  id: string;
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
  downloads_count: number;
  status: 'pending' | 'approved' | 'rejected';
  tags: string[];
  screenshots: string[];
  featured: boolean;
  featured_order: number;
  thumbnail?: string;
  screenshots_urls?: string[];
  created_at: string;
  updated_at: string;
  apk_url?: string;
  avg_rating?: number;
  review_count?: number;
  install_count?: number;
  developer_verified?: boolean;
}

export interface DBReview {
  id: string;
  app_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  user_profiles?: {
    username: string;
    avatar_url: string | null;
    role: string;
  };
}

export interface DBWishlist {
  id: string;
  user_id: string;
  app_id: string;
  created_at: string;
  apps?: DBApp;
}

export interface DBInstall {
  id: string;
  user_id: string;
  app_id: string;
  installed_at: string;
}
