export interface App {
  id: string;
  name: string;
  developer: string;
  category: string;
  rating: number;
  reviews: number;
  downloads: string;
  size: string;
  price: number;
  icon: string;
  iconBg: string;
  description: string;
  screenshots: string[];
  tags: string[];
  featured?: boolean;
  featuredBanner?: string;
  featuredTitle?: string;
  isInstalled?: boolean;
  version: string;
  lastUpdated: string;
  contentRating: string;
  type: 'app' | 'game';
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'app' | 'game';
}

export interface AppSection {
  id: string;
  title: string;
  subtitle?: string;
  apps: App[];
  type: 'horizontal' | 'featured';
}
