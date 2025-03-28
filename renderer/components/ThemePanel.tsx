import React from 'react';

interface ThemePanelProps {
  currentTheme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export default function ThemePanel({ currentTheme, onThemeChange }: ThemePanelProps) {
  return (
    <div className="p-6 bg-card-bg text-text rounded-lg shadow-md theme-transition">
      <h2 className="text-xl font-bold mb-4 text-text">테마 설정</h2>
      <div className="space-y-4">
        <div 
          className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors
            ${currentTheme === 'light' 
              ? 'bg-primary-10 border border-primary'
              : 'hover:bg-button-hover border border-transparent'}
          `}
          onClick={() => onThemeChange('light')}
        >
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white border-2 border-gray-200 dark:border-gray-600 rounded-full mr-3 flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-text">라이트 모드</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">밝은 테마로 설정합니다</p>
            </div>
          </div>
          <div className="flex items-center">
            {currentTheme === 'light' && (
              <span className="mr-2 text-sm font-medium text-primary">사용 중</span>
            )}
            <div className={`w-4 h-4 rounded-full ${currentTheme === 'light' ? 'bg-primary' : 'bg-button-bg'}`} />
          </div>
        </div>
        
        <div 
          className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors
            ${currentTheme === 'dark' 
              ? 'bg-primary-10 border border-primary'
              : 'hover:bg-button-hover border border-transparent'}
          `}
          onClick={() => onThemeChange('dark')}
        >
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-900 rounded-full mr-3 flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-gray-100" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-text">다크 모드</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">어두운 테마로 설정합니다</p>
            </div>
          </div>
          <div className="flex items-center">
            {currentTheme === 'dark' && (
              <span className="mr-2 text-sm font-medium text-primary">사용 중</span>
            )}
            <div className={`w-4 h-4 rounded-full ${currentTheme === 'dark' ? 'bg-primary' : 'bg-button-bg'}`} />
          </div>
        </div>
      </div>
    </div>
  );
}