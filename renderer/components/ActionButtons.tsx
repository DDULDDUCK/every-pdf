import React from 'react';

interface ActionButtonsProps {
  selectedAction: 'split' | 'merge' | 'rotate' | 'convert-to-pdf' | 'convert-from-pdf' | 'watermark' | 'security' | null;
  onActionSelect: (action: 'split' | 'merge' | 'rotate' | 'convert-to-pdf' | 'convert-from-pdf' | 'watermark' | 'security') => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  selectedAction,
  onActionSelect,
}) => {
  return (
    <div className="flex gap-2">
      <button
        className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200
                   ${
                     selectedAction === 'split'
                       ? 'bg-blue-500 text-white'
                       : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                   }`}
        onClick={() => onActionSelect('split')}
      >
        분할
      </button>
      <button
        className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200
                   ${
                     selectedAction === 'merge'
                       ? 'bg-blue-500 text-white'
                       : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                   }`}
        onClick={() => onActionSelect('merge')}
      >
        병합
      </button>
      <button
        className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200
                    ${
                      selectedAction === 'rotate'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
        onClick={() => onActionSelect('rotate')}
      >
        회전
      </button>
      <button
        className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200
                    ${
                      selectedAction === 'watermark'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
        onClick={() => onActionSelect('watermark')}
      >
        워터마크
      </button>
      <button
        className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200
                    ${
                      selectedAction === 'convert-to-pdf'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
        onClick={() => onActionSelect('convert-to-pdf')}
      >
        PDF로 변환
      </button>
      <button
        className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200
                    ${
                      selectedAction === 'convert-from-pdf'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
        onClick={() => onActionSelect('convert-from-pdf')}
      >
        다른 형식으로 변환
      </button>
      <button
        className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200
                   ${
                     selectedAction === 'security'
                       ? 'bg-blue-500 text-white'
                       : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                   }`}
        onClick={() => onActionSelect('security')}
      >
        보안
      </button>
    </div>
  );
};

export default ActionButtons;