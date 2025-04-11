import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ThemePanel from '../components/ThemePanel';
import ActionButtons from '../components/ActionButtons';
import BuyMeCoffeeButton from '../components/BuyMeCoffeeButton';

export default function WelcomePage() {
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
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
        <title>PDF Studio - 시작 화면</title>
      </Head>
      <div className="app-container min-h-screen flex flex-col">
        <header className="py-6 px-8 border-b border-border theme-transition">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-text theme-transition">PDF Studio</h1>
            <div className="flex gap-4">
              <BuyMeCoffeeButton />
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-8 gap-12">
          <div className="text-center mb-4">
            <h2 className="text-4xl font-bold text-text mb-4 theme-transition">PDF 작업 도구</h2>
            <p className="text-xl text-button-text theme-transition">
              PDF 파일에 대한 다양한 작업을 쉽고 빠르게 처리할 수 있습니다.
            </p>
          </div>

          <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
            <ThemePanel currentTheme={theme} onThemeChange={handleThemeChange} />
            
            <div className="bg-card-bg p-6 rounded-lg shadow-md theme-transition">
              <h3 className="text-xl font-bold mb-4 text-text theme-transition">작업 시작하기</h3>
              <p className="text-button-text mb-4 theme-transition">
                원하는 작업을 선택하여 시작하세요.
              </p>
              <div className="flex flex-col gap-3">
                <ActionButtons
                  selectedAction={null}
                  onActionSelect={handleActionSelect}
                />
              </div>
            </div>
          </div>
        </main>
        
        <footer className="py-4 px-8 text-center text-button-text text-sm theme-transition">
          &copy; {new Date().getFullYear()} DDULDDUCK. All rights reserved.
        </footer>
      </div>
    </>
  );
}
