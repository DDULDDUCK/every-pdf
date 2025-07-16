import React from 'react';
import { useTranslation } from 'react-i18next';

interface FileSelectionMessageProps {
  file: File | null;
  files?: File[];
  format?: string;
  className?: string;
}

const FileSelectionMessage: React.FC<FileSelectionMessageProps> = ({ 
  file, 
  files, 
  format,
  className = ''
}) => {
  const { t } = useTranslation();

  if (!file && (!files || files.length === 0)) return null;

  return (
    <div className={`panel-selected-file ${className}`}>
      {file ? (
        <p className="panel-selected-file-text" title={file.name}>
          {t('selectedFile', { fileName: file.name })}
        </p>
      ) : format === 'image' && files && files.length > 0 ? (
        <p className="panel-selected-file-text">
          {t('selectedImages', { count: files.length })}
        </p>
      ) : null}
    </div>
  );
};

export default FileSelectionMessage;
