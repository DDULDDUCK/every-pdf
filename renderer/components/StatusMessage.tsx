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

    let bgColor, textColor = 'text-button-text-selected';
    switch (type) {
      case 'success':
        bgColor = 'bg-success';
        break;
      case 'error':
        bgColor = 'bg-error';
        break;
      case 'processing':
        bgColor = 'bg-primary';
        break;
      default:
        bgColor = 'bg-primary';
    }

    return (
      <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg ${bgColor} ${textColor} text-sm text-center z-50 flex items-center gap-2 min-w-[200px] justify-center animate-fade-in theme-transition`}>
        {type === 'processing' && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {message}
      </div>
    );
};

export default StatusMessage;