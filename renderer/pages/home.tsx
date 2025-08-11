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

// <<< 여기가 수정된 부분입니다 (1/2) >>>
// Action의 종류를 구체적인 타입으로 정의합니다.
type PdfAction = 'split' | 'merge' | 'rotate' | 'convert-to-pdf' | 'convert-from-pdf' | 'watermark' | 'security';

export default function HomePage() {
    const { t } = useTranslation(["common", "home"]);
    const router = useRouter();

    // App-wide States
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [serverStatus, setServerStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    // <<< 여기가 수정된 부분입니다 (2/2) >>>
    // useState의 타입을 구체적인 PdfAction 타입으로 변경합니다.
    const [selectedAction, setSelectedAction] = useState<PdfAction | null>(null);
    const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: null, type: null });

    // File States
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // For merge tool
    const [pdfUrl, setPdfUrl] = useState<string | null>(null); // For non-viewer tools
    const [selectedFormat, setSelectedFormat] = useState<'txt' | 'html' | 'image' | null>(null); // For convert tool

    // Security Tool State
    const [securityMode, setSecurityMode] = useState<'encrypt' | 'decrypt'>('encrypt');
    
    // Watermark Tool States
    const [watermarkOptions, setWatermarkOptions] = useState<WatermarkOptions>({
        watermarkType: 'text',
        watermarkText: '기밀 문서',
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

    // Server Status Effect
    useEffect(() => {
        if (window.api?.invoke) {
            window.api.invoke('get-server-status').then((status: any) => setServerStatus(status));
            const handler = (_: any, status: any) => setServerStatus(status);
            window.api.on?.('server-status-changed', handler);
            return () => {
                window.api.removeListener?.('server-status-changed', handler);
            };
        }
    }, []);

    // Theme Effect
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

    // Router Query Effect
    useEffect(() => {
        if (router.query.action) {
            // as를 사용하여 타입을 단언해줍니다.
            setSelectedAction(router.query.action as PdfAction);
        }
    }, [router.query]);

    // Cleanup PDF URL Effect
    useEffect(() => {
        return () => {
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
    }, [pdfUrl]);


    // --- Handlers ---

    // Resets states when a new action is selected
    // 함수의 파라미터 타입도 PdfAction으로 변경합니다.
    const handleActionSelect = (action: PdfAction) => {
        setSelectedAction(action);
        setSelectedFile(null);
        setSelectedFiles([]);
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
    };

    // Generic file drop handler
    const handleFileDrop = (files: File[]) => {
        if (!files || files.length === 0) return;

        // For single-file tools
        if (selectedAction === 'watermark' || selectedAction === 'security' || selectedAction === 'split' || selectedAction === 'rotate' || selectedAction === 'convert-from-pdf') {
            setSelectedFile(files[0]);
        } 
        // For multi-file tools
        else if (selectedAction === 'merge') {
            setSelectedFiles(prev => {
                const newFiles = files.filter(f => !prev.some(pf => pf.name === f.name));
                return [...prev, ...newFiles];
            });
            if (!pdfUrl) setPdfUrl(URL.createObjectURL(files[0]));
        } else {
            // Fallback for other tools if needed
            setSelectedFile(files[0]);
            setPdfUrl(URL.createObjectURL(files[0]));
        }
    };
    
    // Watermark Handler
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
            setStatus({ isProcessing: false, message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다', type: 'error' });
        }
    };

    // (Other tool handlers like handleSplit, handleMerge would be here)
    // ...

    const clearStatus = () => {
        setStatus({ isProcessing: false, message: null, type: null });
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
                        onEncrypt={() => {}} // Placeholder
                        onDecrypt={() => {}} // Placeholder
                        mode={securityMode}
                        setMode={setSecurityMode}
                    />
                );
            // case 'split':
            // case 'merge':
            // case 'rotate':
            // etc.
            //     return <ToolPanel ... />
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
                return (
                    <WatermarkViewer 
                        file={selectedFile} 
                        options={watermarkOptions}
                        pagesToApply={pagesToApply}
                    />
                );
            default:
                if (pdfUrl) {
                    return (
                        <iframe
                          src={pdfUrl}
                          className="w-full h-full"
                          title="PDF viewer"
                        />
                    );
                }
                return (
                    <div className="h-full flex items-center justify-center text-text">
                        {t('home:noFileSelected')}
                    </div>
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