import { useState } from 'react';
import BottomNav from '@/components/layout/BottomNav';
import GamesPage from './GamesPage';
import LiveAppsPage from './LiveAppsPage';
import LiveSearchPage from './LiveSearchPage';
import UserProfile from './UserProfile';
import DeveloperPortal from './DeveloperPortal';
import AuthPage from './AuthPage';
import AdminPanel from './AdminPanel';
import TopChartsPage from './TopChartsPage';
import CategoriesPage from './CategoriesPage';
import CommunityPage from './CommunityPage';
import LeaderboardPage from './LeaderboardPage';
import CollectionsPage from './CollectionsPage';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('apps');
  const [showAuth, setShowAuth] = useState(false);

  const handleTabChange = (tab: string) => setActiveTab(tab);
  const handleAuthRequired = () => setShowAuth(true);
  const handleProfileClick = () => setActiveTab('profile');

  const renderPage = () => {
    switch (activeTab) {
      case 'games':
        return <GamesPage />;
      case 'apps':
        return <LiveAppsPage onAuthRequired={handleAuthRequired} onTabChange={handleTabChange} />;
      case 'topcharts':
        return <TopChartsPage onAuthRequired={handleAuthRequired} />;
      case 'categories':
        return <CategoriesPage onAuthRequired={handleAuthRequired} />;
      case 'community':
        return <CommunityPage onAuthRequired={handleAuthRequired} />;
      case 'leaderboard':
        return <LeaderboardPage onBack={() => setActiveTab('apps')} />;
      case 'collections':
        return <CollectionsPage onBack={() => setActiveTab('apps')} />;
      case 'search':
        return <LiveSearchPage onAuthRequired={handleAuthRequired} />;
      case 'admin':
        return <AdminPanel onBack={() => setActiveTab('apps')} />;
      case 'profile':
        if (user?.role === 'admin') return <AdminPanel onBack={() => setActiveTab('apps')} />;
        if (user?.role === 'developer') return <DeveloperPortal />;
        return <UserProfile onAuthRequired={handleAuthRequired} />;
      default:
        return <LiveAppsPage onAuthRequired={handleAuthRequired} onTabChange={handleTabChange} />;
    }
  };

  return (
    <div className="max-w-lg mx-auto relative bg-background min-h-screen">
      {renderPage()}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      {showAuth && <AuthPage onClose={() => setShowAuth(false)} />}
    </div>
  );
};

export default Index;
