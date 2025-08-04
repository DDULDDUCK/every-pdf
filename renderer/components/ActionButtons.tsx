import React from 'react';
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
  const buttons = [
    { action: 'split', label: t('split') },
    { action: 'merge', label: t('merge') },
    { action: 'rotate', label: t('rotate') },
    { action: 'watermark', label: t('watermark') },
    { action: 'convert-to-pdf', label: t('convertToPdf') },
    { action: 'convert-from-pdf', label: t('convertFromPdf') },
    { action: 'security', label: t('security') },
  ] as const;

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
    </div>
  );
};

export default ActionButtons;