import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Korean
import koWelcome from './public/locales/ko/welcome.json';
import koHome from './public/locales/ko/home.json';
import koActions from './public/locales/ko/actions.json';
import koTheme from './public/locales/ko/theme.json';
import koToll from './public/locales/ko/tools.json';
import koSecurity from './public/locales/ko/security.json';
import koWatermark from './public/locales/ko/watermark.json';

// English
import enWelcome from './public/locales/en/welcome.json';
import enHome from './public/locales/en/home.json';
import enActions from './public/locales/en/actions.json';
import enTheme from './public/locales/en/theme.json';
import enTool from './public/locales/en/tools.json';
import enSecurity from './public/locales/en/security.json';
import enWatermark from './public/locales/en/watermark.json';
// Japanese
import jaWelcome from './public/locales/ja/welcome.json';
import jaHome from './public/locales/ja/home.json';
import jaActions from './public/locales/ja/actions.json';
import jaTheme from './public/locales/ja/theme.json';
import jaTools from './public/locales/ja/tools.json';
import jaSecurity from './public/locales/ja/security.json';
import jaWatermark from './public/locales/ja/watermark.json';

// Chinese (Simplified)
import zhCNWelcome from './public/locales/zh-CN/welcome.json';
import zhCNHome from './public/locales/zh-CN/home.json';
import zhCNActions from './public/locales/zh-CN/actions.json';
import zhCNTheme from './public/locales/zh-CN/theme.json';
import zhCNTools from './public/locales/zh-CN/tools.json';
import zhCNSecurity from './public/locales/zh-CN/security.json';
import zhCNWatermark from './public/locales/zh-CN/watermark.json';



const resources = {
  ko: {
    welcome: koWelcome,
    home: koHome,
    actions: koActions,
    theme: koTheme,
    tools: koToll,
    security: koSecurity,
    watermark: koWatermark
  },
  ja: {
    welcome: jaWelcome,
    home: jaHome,
    actions: jaActions,
    theme: jaTheme,
    tools: jaTools,
    security: jaSecurity,
    watermark: jaWatermark
  },
  en: {
    welcome: enWelcome,
    actions: enActions,
    theme: enTheme,
    tools: enTool,
    home: enHome,
    security: enSecurity,
    watermark: enWatermark
  },
  'zh-CN': {
    welcome: zhCNWelcome,
    home: zhCNHome,
    actions: zhCNActions,
    theme: zhCNTheme,
    tools: zhCNTools,
    security: zhCNSecurity,
    watermark: zhCNWatermark
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: typeof window !== 'undefined' ? localStorage.getItem('preferred-language') || 'ko' : 'ko',
    fallbackLng: 'ko',
    ns: ['common', 'welcome', 'home', 'actions', 'status', 'theme'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false
    }
  });

if (typeof window !== 'undefined') {
  i18n.on('languageChanged', (lng) => {
    localStorage.setItem('preferred-language', lng);
  });
}

export default i18n;