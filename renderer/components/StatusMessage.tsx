import React, { useEffect } from 'react';

interface StatusMessageProps {
    isProcessing: boolean;
    message: string | null;
    type: 'success' | 'error' | 'processing' | null;
    onClear: () => void;
}

const StatusMessage: React.FC<StatusMessageProps> = ({
    isProcessing,
    message,
    type,
    onClear,
  }) => {
    useEffect(() => {
      if (message && !isProcessing) {
        const timer = setTimeout(() => {
          onClear();
        }, 3000);
        return () => clearTimeout(timer);
      }
    }, [message, isProcessing, onClear]);

    if (!message) return null;

  if (!message) return null;

  const baseStyle = "fixed top-4 left-1/2 transform -translate-x-1/2 p-3 rounded-lg bg-blue-500 text-white text-sm text-center shadow-lg z-50";

  return (
    <div className={baseStyle}>
      {message}
    </div>
  );
};

export default StatusMessage;