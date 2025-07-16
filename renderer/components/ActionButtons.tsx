import React from 'react';
import { useTranslation } from "react-i18next";

interface ActionButtonsProps {
  selectedAction: 'split' | 'merge' | 'rotate' | 'convert-to-pdf' | 'convert-from-pdf' | 'watermark' | 'security' | null;
  onActionSelect: (action: 'split' | 'merge' | 'rotate' | 'convert-to-pdf' | 'convert-from-pdf' | 'watermark' | 'security') => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  selectedAction,
  onActionSelect,
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