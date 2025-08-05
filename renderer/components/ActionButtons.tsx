import React from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from "react-i18next";

import type { ServerStatus } from '../types/ServerStatus';

interface ActionButtonsProps {
  selectedAction: 'split' | 'merge' | 'rotate' | 'convert-to-pdf' | 'convert-from-pdf' | 'watermark' | 'security' | null;
  onActionSelect: (action: 'split' | 'merge' | 'rotate' | 'convert-to-pdf' | 'convert-from-pdf' | 'watermark' | 'security') => void;
  serverStatus: ServerStatus;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  selectedAction,
  onActionSelect,
  serverStatus,
}) => {
  const { t } = useTranslation("actions");
  const router = useRouter();
  
  const buttons = [
    { action: 'split', label: t('split') },
    { action: 'merge', label: t('merge') },
    { action: 'rotate', label: t('rotate') },
    { action: 'watermark', label: t('watermark') },
    { action: 'convert-to-pdf', label: t('convertToPdf') },
    { action: 'convert-from-pdf', label: t('convertFromPdf') },
    { action: 'security', label: t('security') },
  ] as const;

  const goToPdfEditor = () => {
    router.push('/pdf-editor');
  };

  const disabled = serverStatus !== 'connected';
  const tooltip =
    serverStatus === 'connecting'
      ? t('home:serverConnecting', { defaultValue: '서버 연결 중입니다...' })
      : serverStatus === 'error'
      ? t('home:serverError', { defaultValue: '서버 연결 실패' })
      : undefined;

  return (
    <div className="flex flex-wrap gap-2" style={{ position: 'relative', marginTop: disabled && tooltip ? '2.5em' : undefined }}>
      {disabled && tooltip && (
        <div
          style={{
            position: 'static',
            width: '100%',
            textAlign: 'center',
            color: '#888',
            fontSize: 13,
            marginBottom: 12,
            pointerEvents: 'none',
            background: 'transparent'
          }}
        >
          {tooltip}
        </div>
      )}
      {buttons.map(({ action, label }) => (
        <div key={action} style={{ display: 'inline-block' }}>
          <button
            className={`hover-menu font-medium transition-all duration-150 ${
              selectedAction === action
                ? 'bg-primary text-button-text-selected'
                : 'bg-button-bg text-button-text'
            }`}
            style={{
              opacity: disabled ? 0.5 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
              pointerEvents: disabled ? 'auto' : 'auto',
              transition: 'opacity 0.2s, cursor 0.2s',
            }}
            onClick={e => {
              if (disabled) {
                e.preventDefault();
                return;
              }
              onActionSelect(action);
            }}
            disabled={disabled}
            aria-disabled={disabled}
          >
            {label}
          </button>
        </div>
      ))}
      
      {/* PDF 편집 버튼 - 특별한 스타일로 강조 */}
      <div style={{ display: 'inline-block' }}>
        <button
          className="hover-menu font-medium transition-all duration-150 text-white shadow-lg"
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, rgb(var(--primary-rgb)) 100%)',
            boxShadow: '0 2px 8px rgba(var(--primary-rgb), 0.3)',
            transform: 'translateY(0)',
            transition: 'all 0.15s ease',
            color: 'white',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(var(--primary-rgb), 0.4)';
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.9) 0%, rgba(var(--primary-rgb), 0.8) 100%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(var(--primary-rgb), 0.3)';
            e.currentTarget.style.background = 'linear-gradient(135deg, var(--primary) 0%, rgb(var(--primary-rgb)) 100%)';
          }}
          onClick={goToPdfEditor}
        >
          {t('edit', { defaultValue: 'PDF 편집' })}
        </button>
      </div>
    </div>
  );
};

export default ActionButtons;