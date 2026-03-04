// --- renderer/pages/pdf-editor.tsx ---

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from "uuid";
import { CircularProgress, Typography } from '@mui/material';
import { usePDFEdit, PDFEditProvider, PDFEditElement } from '../contexts/PDFEditContext';
import { useTranslation } from "react-i18next";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import EditToolbar from '../components/EditToolbar';
import PDFViewer, { PDFViewerHandle } from '../components/PDFViewer';
import InspectorSidebar from '../components/InspectorSidebar';

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
    const { t: tEditor } = useTranslation("editor");

    const [isSaving, setIsSaving] = useState(false);

    const editorStateRef = useRef({
        selectedElementId: state.selectedElementId,
        currentPage: state.currentPage,
        elements: state.elements,
    });

    const editorActionsRef = useRef({
        undo,
        redo,
        copyElement,
        pasteElement,
        removeElement,
        canUndo,
        canRedo,
        hasClipboard,
        setPendingElementType,
        setSelectedElementId,
    });

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
    const handleGoBack = useCallback(() => {
        router.push('/home');
    }, [router]);

    const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setPdfFile(file);
    }, [setPdfFile]);
    
    const handlePlaceElement = useCallback((type: "text" | "signature" | "checkbox", page: number, x: number, y: number) => {
        const baseElement = { id: uuidv4(), page, x, y };
        let newElement: PDFEditElement;
        switch (type) {
            case 'text': 
                newElement = {
                    ...baseElement,
                    type: 'text',
                    text: tEditor("textPlaceholder"),
                    fontSize: state.preferredTextFontSize,
                    color: "#222222",
                    hasBackground: false,
                    backgroundColor: "#ffffff",
                };
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
    }, [addElement, setPendingElementType, setSelectedElementId, state.preferredTextFontSize, tEditor]);

    const handleEditElement = useCallback((element: PDFEditElement) => {
        setPendingElementType(null);
        setSelectedElementId(element.id);
    }, [setPendingElementType, setSelectedElementId]);

    const handleDeselect = useCallback(() => {
        setSelectedElementId(null);
    }, [setSelectedElementId]);

    const handleCancelPlaceElement = useCallback(() => {
        setPendingElementType(null);
    }, [setPendingElementType]);

    const handleUploadClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

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
        editorStateRef.current = {
            selectedElementId: state.selectedElementId,
            currentPage: state.currentPage,
            elements: state.elements,
        };
    }, [state.selectedElementId, state.currentPage, state.elements]);

    useEffect(() => {
        editorActionsRef.current = {
            undo,
            redo,
            copyElement,
            pasteElement,
            removeElement,
            canUndo,
            canRedo,
            hasClipboard,
            setPendingElementType,
            setSelectedElementId,
        };
    }, [
        undo,
        redo,
        copyElement,
        pasteElement,
        removeElement,
        canUndo,
        canRedo,
        hasClipboard,
        setPendingElementType,
        setSelectedElementId,
    ]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const {
                selectedElementId,
                currentPage,
                elements,
            } = editorStateRef.current;

            const {
                undo: doUndo,
                redo: doRedo,
                copyElement: doCopyElement,
                pasteElement: doPasteElement,
                removeElement: doRemoveElement,
                canUndo: canUndoNow,
                canRedo: canRedoNow,
                hasClipboard: hasClipboardNow,
                setPendingElementType: setPendingElementTypeNow,
                setSelectedElementId: setSelectedElementIdNow,
            } = editorActionsRef.current;

            if (e.key === 'Escape') {
                setPendingElementTypeNow(null);
                setSelectedElementIdNow(null);
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
                        if (e.shiftKey) {
                            if (canRedoNow()) {
                                doRedo();
                            }
                        } else if (canUndoNow()) {
                            doUndo();
                        }
                        break;
                    case 'y':
                        if (!isMac) {
                            e.preventDefault();
                            if (canRedoNow()) {
                                doRedo();
                            }
                        }
                        break;
                    case 'c':
                        if (selectedElementId) {
                            e.preventDefault();
                            const selectedElement = elements.find((el) => el.id === selectedElementId);
                            if (selectedElement) {
                                doCopyElement(selectedElement);
                            }
                        }
                        break;
                    case 'v':
                        if (hasClipboardNow()) {
                            e.preventDefault();
                            doPasteElement(200, 200, currentPage);
                        }
                        break;
                }
            } else {
                switch (e.key) {
                    case 'Delete':
                    case 'Backspace':
                        if (selectedElementId) {
                            e.preventDefault();
                            doRemoveElement(selectedElementId);
                        }
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <>
            <Head>
                <title>PDF 편집기 - Every PDF</title>
            </Head>
            <div className="app-container h-screen overflow-hidden flex flex-col">
                <input type="file" ref={fileInputRef} onChange={onFileChange} accept="application/pdf" style={{ display: 'none' }} />
                
                <EditToolbar
                    onSetPendingElement={type => { setSelectedElementId(null); setPendingElementType(type); }}
                    onSave={handleSave}
                    isSaving={isSaving}
                    onUploadClick={handleUploadClick}
                    onGoBack={handleGoBack}
                />

                <PanelGroup direction="horizontal" className="flex flex-1 min-h-0 overflow-hidden relative">
                    <Panel defaultSize={75} minSize={50} className="min-h-0 overflow-hidden">
                        <div className="w-full h-full min-h-0 overflow-hidden">
                            <PDFViewer
                              ref={viewerRef}
                              onEditElement={handleEditElement}
                              onPlaceElement={handlePlaceElement}
                              onCancelPlaceElement={handleCancelPlaceElement}
                              onUploadClick={handleUploadClick}
                              onDeselect={handleDeselect}
                            />
                        </div>
                    </Panel>
                    <PanelResizeHandle className="w-2 flex items-center justify-center bg-transparent hover:bg-primary/10 transition-colors duration-200 group">
                         <div className="w-px h-12 bg-border group-hover:bg-primary/50 transition-colors duration-200" />
                    </PanelResizeHandle>
                    <Panel defaultSize={25} minSize={20} maxSize={40} className="min-h-0 overflow-hidden">
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
