import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import PDFDropzone from '../components/PDFDropzone';
import ThemePanel from '../components/ThemePanel';
import ActionButtons from '../components/ActionButtons';
import ToolPanel from '../components/ToolPanel';
import StatusMessage from '../components/StatusMessage';
import WatermarkPanel from '../components/WatermarkPanel';
import SecurityPanel from '../components/SecurityPanel';
import BuyMeCoffeeButton from '../components/BuyMeCoffeeButton';
import { useTranslation } from "react-i18next";

interface ProcessingStatus {
  isProcessing: boolean;
  message: string | null;
  type: 'success' | 'error' | 'processing' | null;
}

export default function HomePage() {
  const { t } = useTranslation(["common", "home"]);
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [selectedAction, setSelectedAction] = useState<'split' | 'merge' | 'rotate' | 'convert-to-pdf' | 'convert-from-pdf' | 'watermark' | 'security' | null>(null);

  // 서버 상태 관리
  const [serverStatus, setServerStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  useEffect(() => {
    // 최초 상태 조회
    if (window.api?.invoke) {
      window.api.invoke('get-server-status').then((status: any) => {
        setServerStatus(status);
      });
    }
    // 상태 변경 이벤트 리스너 등록
    const handler = (_: any, status: any) => setServerStatus(status);
    window.api?.on?.('server-status-changed', handler);
    return () => {
      window.api?.removeListener?.('server-status-changed', handler);
    };
  }, []);

  // 테마 초기화 및 감지
  useEffect(() => {
    // 로컬 스토리지에서 테마 가져오기
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    // 사용자가 다크 모드를 선호하는지 확인
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // 저장된 테마가 있으면 그것을 사용, 없으면 사용자 선호에 따라 설정
    const initialTheme = savedTheme || (prefersDarkMode ? 'dark' : 'light');
    setTheme(initialTheme);
    
    // HTML 데이터 속성 설정
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  // 테마 변경 시 HTML 데이터 속성 업데이트 및 로컬 스토리지 저장
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // URL 쿼리에서 선택된 액션을 가져와 설정
  useEffect(() => {
    if (router.query.action) {
      setSelectedAction(router.query.action as any);
    }
  }, [router.query]);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
  };

  // Welcome 페이지로 이동
  const goToWelcome = () => {
    router.push('/welcome');
  };

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
        message: t('home:split.error'),
        type: 'error'
      });
      return;
    }

    try {
      setStatus({
        isProcessing: true,
        message: t('home:split.processing'),
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
        message: t('home:split.success'),
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
        message: t('home:merge.error'),
        type: 'error'
      });
      return;
    }

    try {
      setStatus({
        isProcessing: true,
        message: t('home:merge.processing'),
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
        message: t('home:merge.success'),
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
        message: t('home:split.error'),
        type: 'error'
      });
      return;
    }

    try {
      setStatus({
        isProcessing: true,
        message: t('home:rotate.processing'),
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
        message: t('home:rotate.success'),
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
        message: t('home:convert.toPdf'),
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
        message: t('home:convert.success'),
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
        message: t('home:convert.fromPdf'),
        type: 'processing'
      });

      let outputPath: string | undefined = undefined;

      // DOCX로 변환 시 저장 경로 묻기
      if (targetFormat === 'docx') {
        const defaultPath = `${file.name.replace('.pdf', '.docx')}`;
        const result = await window.electron.saveFile({
          title: 'Word 파일 저장',
          defaultPath: defaultPath,
          filters: [{ name: 'Word 문서', extensions: ['docx'] }]
        }, new Uint8Array()); // 임시로 빈 데이터 전달

        if (!result) {
          setStatus({ isProcessing: false, message: '저장이 취소되었습니다.', type: 'error' });
          return; // 저장 취소 시 중단
        }
        outputPath = result;
      }

      // 백엔드 API 호출 (outputPath 추가)
      const blob = await window.electron.pdf.convertFromPdf(file, targetFormat, imageFormat, outputPath);

      // DOCX 변환 시에는 백엔드에서 직접 저장하므로 다운로드 로직 제거
      if (targetFormat !== 'docx') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        let filename: string;
        const extension = imageFormat || 'jpg';
        if (blob.type.includes('zip')) {
          filename = `${file.name.replace('.pdf', '')}_images.zip`;
        } else {
          filename = `${file.name.replace('.pdf', '')}.${extension}`;
        }
        
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }

      setStatus({
        isProcessing: false,
        message: t('home:convert.success'),
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
        message: t('home:split.error'),
        type: 'error'
      });
      return;
    }

    try {
      setStatus({
        isProcessing: true,
        message: t('home:security.encrypt'),
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
        message: t('home:security.success'),
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
        message: t('home:split.error'),
        type: 'error'
      });
      return;
    }

    try {
      setStatus({
        isProcessing: true,
        message: t('home:security.decrypt'),
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
        message: t('home:security.success'),
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
        message: t('home:watermark.processing'),
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
        message: t('home:watermark.success'),
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
          <title>{t('home:pageTitle')}</title>
        </Head>
        <div className="app-container flex flex-col min-h-screen">
          <div className="content-card w-full flex flex-col flex-grow">
            <div className="content-header flex justify-between items-center border-b">
              <h1 
                className="content-title cursor-pointer hover:text-primary transition-colors" 
                onClick={goToWelcome}
              >
                Every PDF
              </h1>
              <div className="flex items-center gap-4">
                {/* <BuyMeCoffeeButton /> */}
                <ActionButtons
                  selectedAction={selectedAction}
                  onActionSelect={handleActionSelect}
                  serverStatus={serverStatus}
                />
              </div>
            </div>

            <div className="flex gap-6 p-6 flex-grow">
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
                  selectedFormat={selectedFormat}
                  onFormatSelect={handleFormatSelect}
                />
              )}

              <div className="flex-1 border-2 border-border rounded-lg overflow-hidden theme-transition">
                {!pdfUrl ? (
                  <div className="h-full flex items-center justify-center text-text">
                    {t('home:noFileSelected')}
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
