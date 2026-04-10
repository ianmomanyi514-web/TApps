import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Lang = 'en' | 'sw';

const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Nav
    'nav.games': 'Games',
    'nav.apps': 'Apps',
    'nav.charts': 'Charts',
    'nav.categories': 'Categories',
    'nav.search': 'Search',
    'nav.profile': 'Profile',
    'nav.devportal': 'Dev Portal',
    'nav.admin': 'Admin',
    'nav.community': 'Community',
    // Common
    'common.free': 'Free',
    'common.install': 'Install',
    'common.open': 'Open',
    'common.update': 'Update',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.loading': 'Loading...',
    'common.seeAll': 'See all',
    'common.signIn': 'Sign In',
    'common.signOut': 'Sign Out',
    'common.submit': 'Submit',
    // Home
    'home.trending': 'Trending This Week',
    'home.trendingDesc': 'Most installs in 7 days',
    'home.topRated': 'Top Rated This Week',
    'home.topRatedDesc': 'Highest community ratings',
    'home.newUpdated': 'New & Updated',
    'home.newUpdatedDesc': 'Recently published apps',
    'home.allApps': 'All Apps on T Apps',
    // Community
    'community.title': 'Community',
    'community.ideas': 'Ideas & Showcase',
    'community.newPost': 'New Post',
    'community.postTitle': 'Post Title',
    'community.postContent': 'Content',
    'community.linkedApp': 'Linked App (optional)',
    'community.type.idea': 'Idea',
    'community.type.showcase': 'Showcase',
    'community.type.question': 'Question',
    'community.type.feedback': 'Feedback',
    'community.like': 'Like',
    'community.comment': 'Comment',
    // Profile
    'profile.library': 'Library',
    'profile.wishlist': 'Wishlist',
    'profile.alerts': 'Alerts',
    'profile.installed': 'Installed',
    'profile.saved': 'Saved',
  },
  sw: {
    // Nav
    'nav.games': 'Michezo',
    'nav.apps': 'Programu',
    'nav.charts': 'Chati',
    'nav.categories': 'Aina',
    'nav.search': 'Tafuta',
    'nav.profile': 'Wasifu',
    'nav.devportal': 'Dev Portal',
    'nav.admin': 'Msimamizi',
    'nav.community': 'Jamii',
    // Common
    'common.free': 'Bure',
    'common.install': 'Sakinisha',
    'common.open': 'Fungua',
    'common.update': 'Sasisha',
    'common.save': 'Hifadhi',
    'common.cancel': 'Ghairi',
    'common.loading': 'Inapakia...',
    'common.seeAll': 'Ona yote',
    'common.signIn': 'Ingia',
    'common.signOut': 'Toka',
    'common.submit': 'Wasilisha',
    // Home
    'home.trending': 'Maarufu Wiki Hii',
    'home.trendingDesc': 'Usanikishaji zaidi katika siku 7',
    'home.topRated': 'Zilizo na Kiwango Bora',
    'home.topRatedDesc': 'Viwango vya juu vya jamii',
    'home.newUpdated': 'Mpya na Zilizosasishwa',
    'home.newUpdatedDesc': 'Programu zilizochapishwa hivi karibuni',
    'home.allApps': 'Programu Zote za T Apps',
    // Community
    'community.title': 'Jamii',
    'community.ideas': 'Mawazo & Maonyesho',
    'community.newPost': 'Chapisho Jipya',
    'community.postTitle': 'Kichwa cha Chapisho',
    'community.postContent': 'Maudhui',
    'community.linkedApp': 'Programu Iliyounganishwa (hiari)',
    'community.type.idea': 'Wazo',
    'community.type.showcase': 'Onyesho',
    'community.type.question': 'Swali',
    'community.type.feedback': 'Maoni',
    'community.like': 'Penda',
    'community.comment': 'Toa Maoni',
    // Profile
    'profile.library': 'Maktaba',
    'profile.wishlist': 'Orodha ya Matarajio',
    'profile.alerts': 'Arifa',
    'profile.installed': 'Zilizosakinishwa',
    'profile.saved': 'Zilizohifadhiwa',
  },
};

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
});

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('t_apps_lang') as Lang) || 'en';
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('t_apps_lang', l);
  };

  const t = (key: string): string => {
    return translations[lang][key] || translations['en'][key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
