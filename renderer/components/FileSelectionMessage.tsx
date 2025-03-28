import React from 'react';

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
  if (!file && (!files || files.length === 0)) return null;

  return (
    <div className={`panel-selected-file ${className}`}>
      {file ? (
        <p className="panel-selected-file-text" title={file.name}>
          선택된 파일: {file.name}
        </p>
      ) : format === 'image' && files && files.length > 0 ? (
        <p className="panel-selected-file-text">
          선택된 이미지: {files.length}장
        </p>
      ) : null}
    </div>
  );
};

export default FileSelectionMessage;
