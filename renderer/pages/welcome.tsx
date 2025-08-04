import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ThemePanel from '../components/ThemePanel';
import ActionButtons from '../components/ActionButtons';
import BuyMeCoffeeButton from '../components/BuyMeCoffeeButton';
import { useTranslation } from "react-i18next";
import { ServerStatusIndicator } from '../components/ServerStatus';

import type { ServerStatus } from '../types/ServerStatus';

export default function WelcomePage() {
  const [isLangOpen, setIsLangOpen] = useState(false);
  // i18n 초기화
  const { t, i18n } = useTranslation("welcome");
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [serverStatus, setServerStatus] = useState<ServerStatus>('connecting');

  // 서버 상태 관리
  useEffect(() => {
    let mounted = true;
    window.api.invoke('get-server-status').then((result: ServerStatus) => {
      if (mounted) setServerStatus(result);
    });
    const handler = (_event: any, newStatus: ServerStatus) => {
      setServerStatus(newStatus);
    };
    window.api.on('server-status-changed', handler);
    return () => {
      mounted = false;
      window.api.removeListener('server-status-changed', handler);
    };
  }, []);

  // 테마 초기화 및 감지
  useEffect(() => {
    // 로컬 스토리지에서 테마 가져오기
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    // 사용자가 다크 모드를 선호하는지 확인
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // 저장된 테마가 있으면 그것을 사용, 없으면 사용자 선호에 따라 설정
    const initialTheme = savedTheme || (prefersDarkMode ? 'dark' : 'light');
    setTheme(initialTheme);
    
    // HTML 데이터 속성 설정
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);
  
  // 테마 변경 시 HTML 데이터 속성 업데이트 및 로컬 스토리지 저장
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
  };

  const handleActionSelect = (action: 'split' | 'merge' | 'rotate' | 'convert-to-pdf' | 'convert-from-pdf' | 'watermark' | 'security') => {
    router.push({
      pathname: '/home',
      query: { action: action }
    });
  };

  return (
    <>
      <Head>
        <title>{t("pageTitle")}</title>
      </Head>
      <div className="app-container min-h-screen flex flex-col">
        <header className="py-6 px-8 border-b border-border theme-transition">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-text theme-transition">{t("mainHeading")}</h1>
            <div className="flex gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <button
                    onClick={() => setIsLangOpen(!isLangOpen)}
                    className="flex items-center gap-1 px-3 py-1 rounded-md bg-card-bg hover:bg-card-hover text-text theme-transition"
                  >
                    {i18n.language === 'ko' && '🇰🇷'}
                    {i18n.language === 'ja' && '🇯🇵'}
                    {i18n.language === 'en' && '🇺🇸'}
                    {i18n.language === 'zh-CN' && '🇨🇳'}
                    <span className="text-sm font-medium">
                      {i18n.language === 'ko' && '한국어'}
                      {i18n.language === 'ja' && '日本語'}
                      {i18n.language === 'en' && 'English'}
                      {i18n.language === 'zh-CN' && '中文'}
                    </span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isLangOpen && (
                    <div className="absolute right-0 w-40 rounded-md shadow-lg bg-card-bg border border-border z-10"
                         onMouseLeave={() => setIsLangOpen(false)}>
                    <div className="py-1">
                      <button
                        onClick={() => i18n.changeLanguage('ko')}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-card-hover text-text flex items-center gap-2"
                      >
                        🇰🇷 한국어
                      </button>
                      <button
                        onClick={() => i18n.changeLanguage('ja')}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-card-hover text-text flex items-center gap-2"
                      >
                        🇯🇵 日本語
                      </button>
                      <button
                        onClick={() => i18n.changeLanguage('en')}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-card-hover text-text flex items-center gap-2"
                      >
                        🇺🇸 English
                      </button>
                      <button
                        onClick={() => i18n.changeLanguage('zh-CN')}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-card-hover text-text flex items-center gap-2"
                      >
                        🇨🇳 中文
                      </button>
                    </div>
                  </div>
                  )}
                </div>
                <BuyMeCoffeeButton />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-8 gap-12">
          <div className="text-center mb-4">
            <h2 className="text-4xl font-bold text-text mb-4 theme-transition">{t("mainHeading")}</h2>
            <p className="text-xl text-button-text theme-transition">
              {t("description")}
            </p>
          </div>

          <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
            <ThemePanel currentTheme={theme} onThemeChange={handleThemeChange} />
            
            <div className="bg-card-bg p-6 rounded-lg shadow-md theme-transition">
              <h3 className="text-xl font-bold mb-4 text-text theme-transition">{t("sectionTitle")}</h3>
              <p className="text-button-text mb-4 theme-transition">
                {t("sectionDescription")}
              </p>
              <div className="flex flex-col gap-3">
                <ActionButtons
                  selectedAction={null}
                  onActionSelect={handleActionSelect}
                  serverStatus={serverStatus}
                />
              </div>
            </div>
          </div>
        </main>
        
        <footer className="py-4 px-8 relative flex items-center text-button-text text-sm theme-transition min-h-[40px]">
          <span className="absolute left-1/2 -translate-x-1/2 w-max text-center">
            {t("footerText", { year: new Date().getFullYear() })}
          </span>
          <span className="ml-auto">
            <ServerStatusIndicator />
          </span>
        </footer>
        
      </div>
    </>
  );
}
