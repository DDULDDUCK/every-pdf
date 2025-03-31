import React from 'react';

interface ActionButtonsProps {
  selectedAction: 'split' | 'merge' | 'rotate' | 'convert-to-pdf' | 'convert-from-pdf' | 'watermark' | 'security' | null;
  onActionSelect: (action: 'split' | 'merge' | 'rotate' | 'convert-to-pdf' | 'convert-from-pdf' | 'watermark' | 'security') => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  selectedAction,
  onActionSelect,
}) => {
  const buttons = [
    { action: 'split', label: '분할' },
    { action: 'merge', label: '병합' },
    { action: 'rotate', label: '회전' },
    { action: 'watermark', label: '워터마크' },
    { action: 'convert-to-pdf', label: 'PDF로 변환' },
    { action: 'convert-from-pdf', label: '다른 형식으로 변환' },
    { action: 'security', label: '보안' },
  ] as const;

  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map(({ action, label }) => (
        <button
          key={action}
          className={`hover-menu font-medium ${
            selectedAction === action
              ? 'bg-primary text-button-text-selected'
              : 'bg-button-bg text-button-text'
          }`}
          onClick={() => onActionSelect(action)}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default ActionButtons;