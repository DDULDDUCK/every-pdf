import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import PDFDropzone from '../components/PDFDropzone';
import ActionButtons from '../components/ActionButtons';
import ToolPanel from '../components/ToolPanel';
import StatusMessage from '../components/StatusMessage';
import WatermarkPanel from '../components/WatermarkPanel';
import SecurityPanel from '../components/SecurityPanel';
import BuyMeCoffeeButton from '../components/BuyMeCoffeeButton';

interface ProcessingStatus {
  isProcessing: boolean;
  message: string | null;
  type: 'success' | 'error' | 'processing' | null;
}

export default function HomePage() {
  const [selectedAction, setSelectedAction] = useState<'split' | 'merge' | 'rotate' | 'convert-to-pdf' | 'convert-from-pdf' | 'watermark' | 'security' | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  // 선택된 파일 형식 상태 추가
  const [selectedFormat, setSelectedFormat] = useState<'txt' | 'html' | 'image' | null>(null);
  const [securityMode, setSecurityMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [status, setStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    message: null,
    type: null
  });

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleDrop = (files: File[]) => {
    if (files.length > 0) {
      if (selectedAction === 'merge') {
        setSelectedFiles(prev => {
          // 새로운 파일만 추가 (이름으로 중복 체크)
          const newFiles = files.filter(newFile =>
            !prev.some(existingFile => existingFile.name === newFile.name)
          );
          return [...prev, ...newFiles];
        });
        if (!pdfUrl && files[0]) {
          const fileUrl = URL.createObjectURL(files[0]);
          setPdfUrl(fileUrl);
        }
      } else if (selectedAction === 'convert-to-pdf' && selectedFormat === 'image') {
        // 이미지 변환의 경우 여러 파일 처리
        setSelectedFiles(prev => {
          // 새로운 파일만 추가 (이름으로 중복 체크)
          const newFiles = files.filter(newFile =>
            !prev.some(existingFile => existingFile.name === newFile.name)
          );
          return [...prev, ...newFiles];
        });
        // 첫 번째 이미지를 미리보기로 설정
        if (!pdfUrl && files[0]) {
          const fileUrl = URL.createObjectURL(files[0]);
          setPdfUrl(fileUrl);
        }
      } else {
        const file = files[0];
        const fileUrl = URL.createObjectURL(file);
        setPdfUrl(fileUrl);
        setSelectedFile(file);
        setSelectedFiles([file]); // 단일 파일 선택 시 selectedFiles도 업데이트
      }
      setStatus({
        isProcessing: false,
        message: null,
        type: null
      });
    }
  };

  const handleSplit = async (pages: string) => {
    if (!selectedFile) {
      setStatus({
        isProcessing: false,
        message: '파일을 선택해주세요',
        type: 'error'
      });
      return;
    }

    try {
      setStatus({
        isProcessing: true,
        message: 'PDF 분할 중...',
        type: 'processing'
      });

      const blob = await window.electron.pdf.splitPdf(selectedFile, pages);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `split_${selectedFile.name}`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus({
        isProcessing: false,
        message: 'PDF 분할 완료!',
        type: 'success'
      });
    } catch (err) {
      setStatus({
        isProcessing: false,
        message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다',
        type: 'error'
      });
    }
  };

  const handleMerge = async (files: File[]) => {
    if (files.length < 2) {
      setStatus({
        isProcessing: false,
        message: '병합할 PDF 파일을 2개 이상 선택해주세요',
        type: 'error'
      });
      return;
    }

    try {
      setStatus({
        isProcessing: true,
        message: 'PDF 병합 중...',
        type: 'processing'
      });

      const blob = await window.electron.pdf.mergePdfs(files);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'merged.pdf';
      a.click();
      URL.revokeObjectURL(url);

      setStatus({
        isProcessing: false,
        message: 'PDF 병합 완료!',
        type: 'success'
      });
    } catch (err) {
      setStatus({
        isProcessing: false,
        message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다',
        type: 'error'
      });
    }
  };

  const handleRotate = async (pages: string, angle: number, includeUnspecified: boolean) => {
    if (!selectedFile) {
      setStatus({
        isProcessing: false,
        message: '파일을 선택해주세요',
        type: 'error'
      });
      return;
    }

    try {
      setStatus({
        isProcessing: true,
        message: 'PDF 회전 중...',
        type: 'processing'
      });

      const blob = await window.electron.pdf.rotatePdf(selectedFile, pages, angle, includeUnspecified);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rotated_${selectedFile.name}`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus({
        isProcessing: false,
        message: 'PDF 회전 완료!',
        type: 'success'
      });
    } catch (err) {
      setStatus({
        isProcessing: false,
        message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다',
        type: 'error'
      });
    }
  };

  const handleConvertToPDF = async (files: File[], sourceFormat: 'txt' | 'html' | 'image') => {
    try {
      setStatus({
        isProcessing: true,
        message: '파일을 PDF로 변환 중...',
        type: 'processing'
      });

      const blob = await window.electron.pdf.convertToPdf(files, sourceFormat);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // 파일 이름 결정
      let filename: string;
      if (files.length === 1) {
        filename = `${files[0].name.split('.')[0]}.pdf`;
      } else {
        const timestamp = new Date().getTime();
        filename = `combined_${timestamp}.pdf`;
      }
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setStatus({
        isProcessing: false,
        message: 'PDF 변환 완료!',
        type: 'success'
      });
    } catch (err) {
      setStatus({
        isProcessing: false,
        message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다',
        type: 'error'
      });
    }
  };

  const handleConvertFromPDF = async (file: File, targetFormat: 'docx' | 'image', imageFormat?: 'jpg' | 'png') => {
    try {
      setStatus({
        isProcessing: true,
        message: 'PDF 변환 중...',
        type: 'processing'
      });

      const blob = await window.electron.pdf.convertFromPdf(file, targetFormat, imageFormat);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      let filename: string;
      if (targetFormat === 'docx') {
        filename = `${file.name.replace('.pdf', '.docx')}`;
      } else {
        const extension = imageFormat || 'jpg';
        if (blob.type.includes('zip')) {
          filename = `${file.name.replace('.pdf', '')}_images.zip`;
        } else {
          filename = `${file.name.replace('.pdf', '')}.${extension}`;
        }
      }
      
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setStatus({
        isProcessing: false,
        message: '변환 완료!',
        type: 'success'
      });
    } catch (err) {
      setStatus({
        isProcessing: false,
        message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다',
        type: 'error'
      });
    }
  };

  const handleEncrypt = async (password: string) => { // Removed allowPrinting and allowCommenting
    if (!selectedFile) {
      setStatus({
        isProcessing: false,
        message: '파일을 선택해주세요',
        type: 'error'
      });
      return;
    }

    try {
      setStatus({
        isProcessing: true,
        message: 'PDF 암호화 중...',
        type: 'processing'
      });

      const blob = await window.electron.pdf.encryptPdf(selectedFile, password); // Removed allowPrinting and allowCommenting
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `encrypted_${selectedFile.name}`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus({
        isProcessing: false,
        message: 'PDF 암호화 완료!',
        type: 'success'
      });
    } catch (err) {
      setStatus({
        isProcessing: false,
        message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다',
        type: 'error'
      });
    }
  };

  const handleDecrypt = async (password: string) => {
    if (!selectedFile) {
      setStatus({
        isProcessing: false,
        message: '파일을 선택해주세요',
        type: 'error'
      });
      return;
    }

    try {
      setStatus({
        isProcessing: true,
        message: 'PDF 복호화 중...',
        type: 'processing'
      });

      // TODO: window.electron.pdf.decryptPdf가 정의되어 있는지 확인 필요
      const blob = await window.electron.pdf.decryptPdf(selectedFile, password);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decrypted_${selectedFile.name}`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus({
        isProcessing: false,
        message: 'PDF 복호화 완료!',
        type: 'success'
      });
    } catch (err) {
      setStatus({
        isProcessing: false,
        message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다',
        type: 'error'
      });
    }
  };

  const handleAddWatermark = async (
    file: File,
    options: {
      watermarkType: 'text' | 'image';
      watermarkText?: string;
      watermarkImage?: File;
      opacity: number;
      rotation: number;
      position: 'center' | 'tile' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      fontSize?: number;
      fontColor?: string;
      fontBold?: boolean;
      pages: string;
    }
  ) => {
    try {
      setStatus({
        isProcessing: true,
        message: '워터마크 적용 중...',
        type: 'processing'
      });

      // NotoSansKR 폰트를 기본으로 지정
      const blob = await window.electron.pdf.addWatermark(file, {
        ...options,
        fontName: 'NotoSansKR' // 백엔드에서 사용할 기본 폰트 지정
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `watermarked_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus({
        isProcessing: false,
        message: '워터마크 적용 완료!',
        type: 'success'
      });
    } catch (err) {
      setStatus({
        isProcessing: false,
        message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다',
        type: 'error'
      });
    }
  };

  const handleReorderFiles = (startIndex: number, endIndex: number) => {
    setSelectedFiles(prevFiles => {
      const result = Array.from(prevFiles);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const handlePreview = (file: File) => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    const fileUrl = URL.createObjectURL(file);
    setPdfUrl(fileUrl);
  };

  const handleActionSelect = (action: 'split' | 'merge' | 'rotate' | 'convert-to-pdf' | 'convert-from-pdf' | 'watermark' | 'security') => {
    setSelectedAction(action);
    setSelectedFile(null);
    setPdfUrl(null);
    setSelectedFiles([]);  // 모든 액션 선택 시 파일 목록 초기화
    setSelectedFormat(null); // 형식도 초기화
  };

  // 파일 형식 선택 핸들러 추가
  const handleFormatSelect = (format: 'txt' | 'html' | 'image' | null) => {
    setSelectedFormat(format);
    // 형식 변경 시 파일 초기화 (이미지 형식은 유지)
    if (format !== 'image') {
      setSelectedFile(null);
      setSelectedFiles([]);
      setPdfUrl(null);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (newFiles.length === 0) {
        setPdfUrl(null);
      }
      return newFiles;
    });
  };

    const clearStatus = () => {
      setStatus({ isProcessing: false, message: null, type: null });
    };

    return (
      <React.Fragment>
        <Head>
          <title>PDF Studio - 문서 편집 도구</title>
        </Head>
        <div className="min-h-screen w-full bg-gray-100 p-4">
          <div className="w-full min-h-[calc(100vh-2rem)] bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-800">PDF Studio</h1>
              <BuyMeCoffeeButton />
              <ActionButtons
                selectedAction={selectedAction}
                onActionSelect={handleActionSelect}
              />
            </div>

            <div className="flex gap-6 p-6 h-[calc(100vh-7rem)]">
              {selectedAction === 'watermark' ? (
                <WatermarkPanel
                  selectedFile={selectedFile}
                  onFileSelect={handleDrop}
                  isProcessing={status.isProcessing}
                  onAddWatermark={handleAddWatermark}
                />
              ) : selectedAction === 'security' ? (
                <SecurityPanel
                  selectedFile={selectedFile}
                  onFileSelect={handleDrop}
                  onEncrypt={handleEncrypt}
                  onDecrypt={handleDecrypt}
                  mode={securityMode}
                  setMode={setSecurityMode}
                />
              ) : (
                <ToolPanel
                  selectedAction={selectedAction}
                  onSplit={handleSplit}
                  onMerge={handleMerge}
                  onRotate={handleRotate}
                  onConvertToPDF={handleConvertToPDF}
                  onConvertFromPDF={handleConvertFromPDF}
                  isProcessing={status.isProcessing}
                  selectedFiles={selectedFiles}
                  selectedFile={selectedFile}
                  onFileSelect={handleDrop}
                  onRemoveFile={handleRemoveFile}
                  onFilePreview={handlePreview}
                  onReorderFiles={handleReorderFiles}
                  selectedFormat={selectedFormat} // 선택된 형식 전달
                  onFormatSelect={handleFormatSelect} // 형식 선택 핸들러 전달
                />
              )}

              <div className="flex-1 border-2 border-gray-200 rounded-lg overflow-hidden">
                {!pdfUrl ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    선택된 PDF 파일이 없습니다
                  </div>
                ) : (
                  selectedFormat === 'image' ? (
                    <img
                      src={pdfUrl}
                      className="w-full h-full object-contain"
                      alt="Image preview"
                    />
                  ) : (
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full"
                      title="PDF viewer"
                    />
                  )
                )}
              </div>
            </div>

            <StatusMessage
              isProcessing={status.isProcessing}
              message={status.message}
              type={status.type}
              onClear={clearStatus}
            />
          </div>
        </div>
      </React.Fragment>
    );
  }
