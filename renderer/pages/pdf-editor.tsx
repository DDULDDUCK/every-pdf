// --- renderer/pages/pdf-editor.tsx ---

import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import * as pdfjs from 'pdfjs-dist';
import { v4 as uuidv4 } from "uuid";
import { Box, CircularProgress, Typography } from '@mui/material';
import { usePDFEdit, PDFEditProvider, PDFEditElement } from '../contexts/PDFEditContext';
import { useTranslation } from "react-i18next";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import EditToolbar from '../components/EditToolbar';
import PDFViewer, { PDFViewerHandle } from '../components/PDFViewer';
import InspectorSidebar from '../components/InspectorSidebar';

pdfjs.GlobalWorkerOptions.workerSrc = `/static/pdf.worker.min.js`;

const EditorPageContent = () => {
    const {
        state,
        setPdfFile,
        addElement,
        removeElement,
        setSelectedElementId,
        setPendingElementType,
        undo,
        redo,
        copyElement,
        pasteElement,
        canUndo,
        canRedo,
        hasClipboard
    } = usePDFEdit();
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const viewerRef = useRef<PDFViewerHandle>(null);
    const router = useRouter();
    const { t: tHome } = useTranslation("home");
    const { t: tEditor } = useTranslation("editor");

    const [isSaving, setIsSaving] = useState(false);

    // 테마 초기화 및 감지
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (prefersDarkMode ? 'dark' : 'light');
        setTheme(initialTheme);
        document.documentElement.setAttribute('data-theme', initialTheme);
    }, []);

    // 테마 변경 시 HTML 데이터 속성 업데이트 및 로컬 스토리지 저장
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // 뒤로가기 함수
    const handleGoBack = () => {
        router.push('/home');
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setPdfFile(file);
    };
    
    const handlePlaceElement = (type: "text" | "signature" | "checkbox", page: number, x: number, y: number) => {
        const baseElement = { id: uuidv4(), page, x, y };
        let newElement: PDFEditElement;
        switch (type) {
            case 'text': 
                newElement = { ...baseElement, type: 'text', text: tEditor("textPlaceholder"), fontSize: 20, color: "#222222", hasBackground: false, backgroundColor: "#ffffff" };
                break;
            case 'signature': 
                newElement = { ...baseElement, type: 'signature', imageData: "", width: 200, height: 80, hasBackground: false, backgroundColor: "#ffffff" }; 
                break;
            case 'checkbox': 
                newElement = { ...baseElement, type: 'checkbox', checked: false, size: 18, color: '#ffffff', borderColor: '#000000', isTransparent: false, hasBorder: true }; 
                break;
        }
        addElement(newElement);
        setSelectedElementId(newElement.id);
        setPendingElementType(null);
    };

    const handleEditElement = (element: PDFEditElement) => {
        setPendingElementType(null);
        setSelectedElementId(element.id);
    };

    const handleDeselect = () => {
        setSelectedElementId(null);
    };

    const handleSave = async () => {
        if (!state.pdfFile) return;
        setIsSaving(true);
        try {
            const editedPdfBlob = await window.electron.pdf.editPdf(state.pdfFile, state.elements);
            const pdfBytes = new Uint8Array(await editedPdfBlob.arrayBuffer());
            const defaultPath = `edited_${state.pdfFile.name}`;
            await window.electron.saveFile(
                { title: '편집된 PDF 저장', defaultPath, filters: [{ name: 'PDF Documents', extensions: ['pdf'] }] },
                pdfBytes
            );
        } catch (error) {
            console.error("An error occurred during the save process:", error);
        } finally {
            setIsSaving(false);
        }
    };
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setPendingElementType(null);
                setSelectedElementId(null);
                return;
            }

            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

            if (ctrlKey) {
                switch (e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) { if (canRedo()) redo(); } else { if (canUndo()) undo(); }
                        break;
                    case 'y':
                        if (!isMac) { e.preventDefault(); if (canRedo()) redo(); }
                        break;
                    case 'c':
                        if (state.selectedElementId) {
                            e.preventDefault();
                            const selectedElement = state.elements.find(el => el.id === state.selectedElementId);
                            if (selectedElement) copyElement(selectedElement);
                        }
                        break;
                    case 'v':
                        if (hasClipboard()) {
                            e.preventDefault();
                            pasteElement(200, 200, state.currentPage);
                        }
                        break;
                }
            } else {
                switch (e.key) {
                    case 'Delete':
                    case 'Backspace':
                        if (state.selectedElementId) {
                            e.preventDefault();
                            removeElement(state.selectedElementId);
                        }
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.selectedElementId, state.currentPage, state.elements, undo, redo, copyElement, pasteElement, removeElement, canUndo, canRedo, hasClipboard, setPendingElementType, setSelectedElementId]);

    return (
        <>
            <Head>
                <title>PDF 편집기 - Every PDF</title>
            </Head>
            <div className="app-container min-h-screen flex flex-col">
                <input type="file" ref={fileInputRef} onChange={onFileChange} accept="application/pdf" style={{ display: 'none' }} />
                
                <EditToolbar
                    onSetPendingElement={type => { setSelectedElementId(null); setPendingElementType(type); }}
                    onSave={handleSave}
                    isSaving={isSaving}
                    onUploadClick={() => fileInputRef.current?.click()}
                    onGoBack={handleGoBack}
                />

                <PanelGroup direction="horizontal" className="flex flex-1 overflow-hidden relative">
                    <Panel defaultSize={75} minSize={50}>
                        <div className="w-full h-full">
                            <PDFViewer
                              ref={viewerRef}
                              onEditElement={handleEditElement}
                              onPlaceElement={handlePlaceElement}
                              onCancelPlaceElement={() => setPendingElementType(null)}
                              onUploadClick={() => fileInputRef.current?.click()}
                              onDeselect={handleDeselect}
                            />
                        </div>
                    </Panel>
                    <PanelResizeHandle className="w-2 flex items-center justify-center bg-transparent hover:bg-primary/10 transition-colors duration-200 group">
                         <div className="w-px h-12 bg-border group-hover:bg-primary/50 transition-colors duration-200" />
                    </PanelResizeHandle>
                    <Panel defaultSize={25} minSize={20} maxSize={40}>
                        <InspectorSidebar />
                    </Panel>
                </PanelGroup>
            </div>
        </>
    );
};

const EditorPage = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  if (!isClient) {
    return (
        <div className="app-container min-h-screen flex flex-col items-center justify-center">
            <CircularProgress />
            <Typography sx={{ mt: 2 }} className="text-text">PDF 에디터를 불러오는 중입니다...</Typography>
        </div>
    );
  }

  return (
    <PDFEditProvider>
      <EditorPageContent />
    </PDFEditProvider>
  );
};

export default EditorPage;