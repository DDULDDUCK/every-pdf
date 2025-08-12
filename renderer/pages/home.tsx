import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTranslation } from "react-i18next";

// CSS Imports
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// Component Imports
import ActionButtons from '../components/ActionButtons';
import SecurityPanel from '../components/SecurityPanel';
import ToolPanel from '../components/ToolPanel';
import WatermarkPanel from '../components/WatermarkPanel';
import StatusMessage from '../components/StatusMessage';
import WatermarkViewer from '../components/WatermarkViewer';
import { WatermarkOptions } from '../components/WatermarkViewer';

// Type Definitions
interface ProcessingStatus {
    isProcessing: boolean;
    message: string | null;
    type: 'success' | 'error' | 'processing' | null;
}

type PdfAction = 'split' | 'merge' | 'rotate' | 'convert-to-pdf' | 'convert-from-pdf' | 'watermark' | 'security';

export default function HomePage() {
    const { t } = useTranslation(["common", "home", "watermark", "tools"]);
    const router = useRouter();

    // App-wide States
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [serverStatus, setServerStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [selectedAction, setSelectedAction] = useState<PdfAction | null>(null);
    const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: null, type: null });

    // File States
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // For merge and multi-image tools
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [selectedFormat, setSelectedFormat] = useState<'txt' | 'html' | 'image' | null>(null);

    // Security Tool State
    const [securityMode, setSecurityMode] = useState<'encrypt' | 'decrypt'>('encrypt');
    
    // Watermark Tool States
    const [watermarkOptions, setWatermarkOptions] = useState<WatermarkOptions>({
        watermarkType: 'text',
        watermarkText: t('watermark:securityDocument'),
        watermarkImage: null,
        opacity: 0.5,
        rotation: 45,
        position: 'center',
        fontSize: 40,
        fontColor: '#888888',
        fontBold: false,
    });
    const [pagesToApply, setPagesToApply] = useState('all');

    // --- Effects ---

    useEffect(() => {
        if (window.api?.invoke) {
            window.api.invoke('get-server-status').then((status: any) => setServerStatus(status));
            const handler = (_: any, status: any) => setServerStatus(status);
            window.api.on?.('server-status-changed', handler);
            return () => window.api.removeListener?.('server-status-changed', handler);
        }
    }, []);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (prefersDarkMode ? 'dark' : 'light');
        setTheme(initialTheme);
        document.documentElement.setAttribute('data-theme', initialTheme);
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        if (router.query.action) {
            setSelectedAction(router.query.action as PdfAction);
        }
    }, [router.query]);

    useEffect(() => {
        return () => {
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
    }, [pdfUrl]);


    // --- Handlers ---

    const clearStatus = () => setStatus({ isProcessing: false, message: null, type: null });

    const handleActionSelect = (action: PdfAction) => {
        setSelectedAction(action);
        setSelectedFile(null);
        setSelectedFiles([]);
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
        setSelectedFormat(null);
        clearStatus();
    };

    const handleFileDrop = (files: File[]) => {
        if (!files || files.length === 0) return;
        if (selectedAction === 'merge' || (selectedAction === 'convert-to-pdf' && selectedFormat === 'image')) {
            setSelectedFiles(prev => {
                const newFiles = files.filter(f => !prev.some(pf => pf.name === f.name));
                return [...prev, ...newFiles];
            });
            if (!pdfUrl && files[0]) {
                setPdfUrl(URL.createObjectURL(files[0]));
            }
        } else {
            const file = files[0];
            setSelectedFile(file);
            setSelectedFiles([file]);
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
            setPdfUrl(URL.createObjectURL(file));
        }
        clearStatus();
    };

    const handleRemoveFile = (index: number) => {
        const newFiles = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(newFiles);
        if (newFiles.length === 0) {
            setPdfUrl(null);
        } else {
            handleFilePreview(newFiles[0]); // Preview the next file
        }
    };
    
    const handleReorderFiles = (startIndex: number, endIndex: number) => {
        const result = Array.from(selectedFiles);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        setSelectedFiles(result);
    };

    const handleFilePreview = (file: File) => {
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        setPdfUrl(URL.createObjectURL(file));
    };
    
    const handleFormatSelect = (format: 'txt' | 'html' | 'image' | null) => {
        setSelectedFormat(format);
        if (format !== 'image') {
            setSelectedFile(null);
            setSelectedFiles([]);
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
        }
    };

    const handleSplit = async (pages: string) => {
        if (!selectedFile) return setStatus({ isProcessing: false, message: t('home:split.error'), type: 'error' });
        setStatus({ isProcessing: true, message: t('home:split.processing'), type: 'processing' });
        try {
            const blob = await window.electron.pdf.splitPdf(selectedFile, pages);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `split_${selectedFile.name}`;
            a.click();
            URL.revokeObjectURL(url);
            setStatus({ isProcessing: false, message: t('home:split.success'), type: 'success' });
        } catch (err) {
            setStatus({ isProcessing: false, message: err instanceof Error ? err.message : t('common:unknownError'), type: 'error' });
        }
    };

    const handleMerge = async (files: File[]) => {
        if (files.length < 2) return setStatus({ isProcessing: false, message: t('home:merge.error'), type: 'error' });
        setStatus({ isProcessing: true, message: t('home:merge.processing'), type: 'processing' });
        try {
            const blob = await window.electron.pdf.mergePdfs(files);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'merged.pdf';
            a.click();
            URL.revokeObjectURL(url);
            setStatus({ isProcessing: false, message: t('home:merge.success'), type: 'success' });
        } catch (err) {
            setStatus({ isProcessing: false, message: err instanceof Error ? err.message : t('common:unknownError'), type: 'error' });
        }
    };

    const handleRotate = async (pages: string, angle: number, includeUnspecified: boolean) => {
        if (!selectedFile) return setStatus({ isProcessing: false, message: t('home:split.error'), type: 'error' });
        setStatus({ isProcessing: true, message: t('home:rotate.processing'), type: 'processing' });
        try {
            const blob = await window.electron.pdf.rotatePdf(selectedFile, pages, angle, includeUnspecified);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rotated_${selectedFile.name}`;
            a.click();
            URL.revokeObjectURL(url);
            setStatus({ isProcessing: false, message: t('home:rotate.success'), type: 'success' });
        } catch (err) {
            setStatus({ isProcessing: false, message: err instanceof Error ? err.message : t('common:unknownError'), type: 'error' });
        }
    };

    const handleConvertToPDF = async (files: File[], sourceFormat: 'txt' | 'html' | 'image') => {
        if (files.length === 0) return setStatus({ isProcessing: false, message: t('home:convert.noFile'), type: 'error' });
        setStatus({ isProcessing: true, message: t('home:convert.toPdf'), type: 'processing' });
        try {
            const blob = await window.electron.pdf.convertToPdf(files, sourceFormat);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = files.length === 1 ? `${files[0].name.split('.')[0]}.pdf` : `combined_${Date.now()}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            setStatus({ isProcessing: false, message: t('home:convert.success'), type: 'success' });
        } catch (err) {
            setStatus({ isProcessing: false, message: err instanceof Error ? err.message : t('common:unknownError'), type: 'error' });
        }
    };

    const handleConvertFromPDF = async (file: File, targetFormat: 'docx' | 'image', imageFormat?: 'jpg' | 'png') => {
        setStatus({ isProcessing: true, message: t('home:convert.fromPdf'), type: 'processing' });
        try {
            let outputPath: string | undefined = undefined;
            if (targetFormat === 'docx') {
                const result = await window.electron.saveFile({
                    title: t('home:convert.saveDocxTitle'),
                    defaultPath: `${file.name.replace(/\.pdf$/i, '.docx')}`,
                    filters: [{ name: 'Word Document', extensions: ['docx'] }]
                }, new Uint8Array());
                if (!result) return setStatus({ isProcessing: false, message: t('home:convert.saveCancelled'), type: 'error' });
                outputPath = result;
            }

            const blob = await window.electron.pdf.convertFromPdf(file, targetFormat, imageFormat, outputPath);
            
            if (targetFormat !== 'docx') {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const extension = blob.type.includes('zip') ? 'zip' : imageFormat || 'jpg';
                a.download = `${file.name.replace(/\.pdf$/i, '')}.${extension}`;
                a.click();
                URL.revokeObjectURL(url);
            }
            setStatus({ isProcessing: false, message: t('home:convert.success'), type: 'success' });
        } catch (err) {
            setStatus({ isProcessing: false, message: err instanceof Error ? err.message : t('common:unknownError'), type: 'error' });
        }
    };

    const handleEncrypt = async (password: string) => {
        if (!selectedFile) return setStatus({ isProcessing: false, message: t('home:split.error'), type: 'error' });
        setStatus({ isProcessing: true, message: t('home:security.encrypt'), type: 'processing' });
        try {
            const blob = await window.electron.pdf.encryptPdf(selectedFile, password);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `encrypted_${selectedFile.name}`;
            a.click();
            URL.revokeObjectURL(url);
            setStatus({ isProcessing: false, message: t('home:security.success'), type: 'success' });
        } catch (err) {
            setStatus({ isProcessing: false, message: err instanceof Error ? err.message : t('common:unknownError'), type: 'error' });
        }
    };

    const handleDecrypt = async (password: string) => {
        if (!selectedFile) return setStatus({ isProcessing: false, message: t('home:split.error'), type: 'error' });
        setStatus({ isProcessing: true, message: t('home:security.decrypt'), type: 'processing' });
        try {
            const blob = await window.electron.pdf.decryptPdf(selectedFile, password);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `decrypted_${selectedFile.name}`;
            a.click();
            URL.revokeObjectURL(url);
            setStatus({ isProcessing: false, message: t('home:security.success'), type: 'success' });
        } catch (err) {
            setStatus({ isProcessing: false, message: err instanceof Error ? err.message : t('common:unknownError'), type: 'error' });
        }
    };
    
    const handleAddWatermark = async () => {
        if (!selectedFile) return;
        setStatus({ isProcessing: true, message: t('home:watermark.processing'), type: 'processing' });
        try {
            const backendOptions = {
                ...watermarkOptions,
                rotation: -watermarkOptions.rotation,
                pages: pagesToApply,
                fontName: 'NotoSansKR' as const,
            };
            const resultBlob = await window.electron.pdf.addWatermark(selectedFile, backendOptions);
            const url = URL.createObjectURL(resultBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `watermarked_${selectedFile.name}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setStatus({ isProcessing: false, message: t('home:watermark.success'), type: 'success' });
        } catch (err) {
            setStatus({ isProcessing: false, message: err instanceof Error ? err.message : t('common:unknownError'), type: 'error' });
        }
    };

    const renderToolPanel = () => {
        switch (selectedAction) {
            case 'watermark':
                return (
                    <WatermarkPanel
                        selectedFile={selectedFile}
                        onFileSelect={handleFileDrop} 
                        isProcessing={status.isProcessing}
                        onAddWatermark={handleAddWatermark}
                        options={watermarkOptions}
                        onOptionChange={(key, value) => setWatermarkOptions(prev => ({ ...prev, [key]: value }))}
                        pages={pagesToApply}
                        onPagesChange={setPagesToApply}
                    />
                );
            case 'security':
                return (
                    <SecurityPanel
                        selectedFile={selectedFile}
                        onFileSelect={handleFileDrop} 
                        onEncrypt={handleEncrypt} 
                        onDecrypt={handleDecrypt}
                        mode={securityMode}
                        setMode={setSecurityMode}
                    />
                );
            case 'split':
            case 'merge':
            case 'rotate':
            case 'convert-to-pdf':
            case 'convert-from-pdf':
                return (
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
                        onFileSelect={handleFileDrop}
                        onRemoveFile={handleRemoveFile}
                        onFilePreview={handleFilePreview} 
                        onReorderFiles={handleReorderFiles} 
                        selectedFormat={selectedFormat}
                        onFormatSelect={handleFormatSelect}
                    />
                );
            default:
                return (
                    <div className="bg-card-bg p-4 rounded-lg shadow-sm w-[400px] min-w-[400px] flex flex-col h-full theme-transition">
                        <h3 className="text-lg font-semibold text-text mb-4 theme-transition">{t('home:selectTool')}</h3>
                        <p className="text-text-secondary">{t('home:selectToolHint')}</p>
                    </div>
                );
        }
    };

    const renderViewer = () => {
        switch (selectedAction) {
            case 'watermark':
                return <WatermarkViewer file={selectedFile} options={watermarkOptions} pagesToApply={pagesToApply} />;
            default:
                if (!pdfUrl) {
                    return (
                        <div className="h-full flex items-center justify-center text-text">
                            {t('home:noFileSelected')}
                        </div>
                    );
                }
                if (selectedAction === 'convert-to-pdf' && selectedFormat === 'image') {
                    return (
                        <img
                          src={pdfUrl}
                          className="w-full h-full object-contain"
                          alt="Image preview"
                        />
                    );
                }
                return (
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full"
                      title="PDF viewer"
                    />
                );
        }
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
                            onClick={() => router.push('/welcome')}
                        >
                            Every PDF
                        </h1>
                        <div className="flex items-center gap-4">
                            <ActionButtons
                                selectedAction={selectedAction}
                                onActionSelect={handleActionSelect}
                                serverStatus={serverStatus}
                            />
                        </div>
                    </div>

                    <div className="flex gap-6 p-6 flex-grow">
                        {renderToolPanel()}
                        <div className="flex-1 border-2 border-border rounded-lg overflow-hidden theme-transition">
                            {renderViewer()}
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
};