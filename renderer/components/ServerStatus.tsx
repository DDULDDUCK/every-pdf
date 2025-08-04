// 서버 상태 표시 컴포넌트

import React, { useEffect, useState } from 'react';
import type { ServerStatus } from '../types/ServerStatus';

declare global {
  interface Window {
    api: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
      removeListener: (channel: string, listener: (...args: any[]) => void) => void;
    };
  }
}

import { useTranslation } from "react-i18next";

const statusMap: Record<ServerStatus, { color: string; key: string }> = {
  connecting: { color: '#b0b0b0', key: 'serverConnecting' },
  connected: { color: '#2ecc40', key: 'serverConnected' },
  error: { color: '#ff4d4f', key: 'serverError' },
};

export const ServerStatusIndicator: React.FC = () => {
  const { t } = useTranslation("home");
  const [status, setStatus] = useState<ServerStatus>('connecting');

  useEffect(() => {
    let mounted = true;

    // 현재 상태 조회
    window.api.invoke('get-server-status').then((result: ServerStatus) => {
      if (mounted) setStatus(result);
    });

    // 상태 변경 이벤트 리스너
    const handler = (_event: any, newStatus: ServerStatus) => {
      setStatus(newStatus);
    };
    window.api.on('server-status-changed', handler);

    return () => {
      mounted = false;
      window.api.removeListener('server-status-changed', handler);
    };
  }, []);

  const { color, key } = statusMap[status];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '4px 12px',
        background: 'rgba(255,255,255,0.85)',
        borderRadius: 16,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        fontFamily: 'inherit',
        fontWeight: 500,
        fontSize: 14,
        minWidth: 120,
        justifyContent: 'flex-end',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: color,
          marginRight: 8,
          boxShadow: `0 0 4px ${color}55`,
          border: '1.5px solid #fff',
          transition: 'background 0.2s',
        }}
        aria-label={status}
      />
      <span style={{ color: '#222', letterSpacing: '-0.5px' }}>
        {t(`home:${key}`, {
          defaultValue:
            key === 'serverConnecting'
              ? '서버 연결 중...'
              : key === 'serverConnected'
              ? '서버 연결됨'
              : key === 'serverError'
              ? '서버 연결 실패'
              : '',
        })}
      </span>
    </div>
  );
};

export default ServerStatusIndicator;