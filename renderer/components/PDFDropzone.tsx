import React, { useRef } from 'react';
 
interface PDFDropzoneProps {
  onDrop: (files: File[]) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
  className?: string;
  multiple?: boolean;
  accept?: string;
}
 
const PDFDropzone: React.FC<PDFDropzoneProps> = ({
  onDrop,
  onDragOver,
  children,
  className = '',
  multiple = false,
  accept = '.pdf',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
 
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (!multiple && files.length > 0) {
      onDrop([files[0]]);
    } else {
      onDrop(files);
    }
  };
 
  const handleClick = () => {
    fileInputRef.current?.click();
  };
 
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!multiple && files.length > 0) {
      onDrop([files[0]]);
    } else {
      onDrop(files);
    }
  };
 
  return (
    <div
      className={`flex-1 border-2 border-dashed border-dropzone-border rounded-lg p-4
                 flex flex-col justify-center items-center min-h-0 bg-dropzone-bg
                 hover:border-primary transition-colors duration-200 cursor-pointer theme-transition
                 ${className}`}
      onDrop={handleDrop}
      onDragOver={onDragOver}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleFileInput}
      />
      {children}
    </div>
  );
};
 
export default PDFDropzone;