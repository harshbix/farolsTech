import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Navigation
      home: 'Home',
      search: 'Search',
      login: 'Login',
      register: 'Register',
      dashboard: 'Dashboard',
      logout: 'Logout',
      profile: 'Profile',
      bookmarks: 'Bookmarks',
      notifications: 'Notifications',
      // Content
      trending: 'Trending',
      latest: 'Latest',
      featured: 'Featured',
      categories: 'Categories',
      readMore: 'Read more',
      by: 'By',
      minutesRead: '{{n}} min read',
      // Actions
      like: 'Like',
      comment: 'Comment',
      share: 'Share',
      shareWhatsApp: 'Share on WhatsApp',
      save: 'Save',
      publish: 'Publish',
      saveDraft: 'Save Draft',
      // Auth
      emailAddress: 'Email address',
      password: 'Password',
      username: 'Username',
      forgotPassword: 'Forgot password?',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      // Editor
      newPost: 'New Post',
      editPost: 'Edit Post',
      titlePlaceholder: 'Post title…',
      contentPlaceholder: 'Start writing your story…',
      // Errors
      notFound: 'Page not found',
      serverError: 'Something went wrong',
      // PWA
      offlineReady: 'App ready to work offline',
      updateAvailable: 'Update available – click to reload',
    },
  },
  sw: {
    translation: {
      // Navigation
      home: 'Nyumbani',
      search: 'Tafuta',
      login: 'Ingia',
      register: 'Jisajili',
      dashboard: 'Dashibodi',
      logout: 'Toka',
      profile: 'Wasifu',
      bookmarks: 'Alamisho',
      notifications: 'Arifa',
      // Content
      trending: 'Yanayoendelea',
      latest: 'Mapya',
      featured: 'Zilizoangaziwa',
      categories: 'Makundi',
      readMore: 'Soma zaidi',
      by: 'Na',
      minutesRead: 'Dakika {{n}} za kusoma',
      // Actions
      like: 'Penda',
      comment: 'Maoni',
      share: 'Shiriki',
      shareWhatsApp: 'Shiriki WhatsApp',
      save: 'Hifadhi',
      publish: 'Chapisha',
      saveDraft: 'Hifadhi Rasimu',
      // Auth
      emailAddress: 'Barua pepe',
      password: 'Nenosiri',
      username: 'Jina la mtumiaji',
      forgotPassword: 'Umesahau nenosiri?',
      noAccount: 'Huna akaunti?',
      hasAccount: 'Una akaunti tayari?',
      // Editor
      newPost: 'Makala Mpya',
      editPost: 'Hariri Makala',
      titlePlaceholder: 'Kichwa cha makala…',
      contentPlaceholder: 'Anza kuandika hadithi yako…',
      // Errors
      notFound: 'Ukurasa haupatikani',
      serverError: 'Kuna hitilafu',
      // PWA
      offlineReady: 'Programu iko tayari bila intaneti',
      updateAvailable: 'Sasisho linapatikana – bonyeza kupakia upya',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('farols-ui')
      ? JSON.parse(localStorage.getItem('farols-ui')).state?.language || 'en'
      : 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
