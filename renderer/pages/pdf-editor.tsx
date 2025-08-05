// --- renderer/pages/pdf-editor.tsx ---

import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import * as pdfjs from 'pdfjs-dist';
import { v4 as uuidv4 } from "uuid";
import { Box, CircularProgress, Typography } from '@mui/material';
import { usePDFEdit, PDFEditProvider, PDFEditElement, PDFTextElement, PDFSignatureElement, PDFCheckboxElement } from '../contexts/PDFEditContext';
import { useTranslation } from "react-i18next";

import EditToolbar from '../components/EditToolbar';
import TextEditTool from '../components/TextEditTool';
import SignatureEditTool from '../components/SignatureEditTool';
import CheckboxEditTool from '../components/CheckboxEditTool';
import PDFViewer, { PDFViewerHandle } from '../components/PDFViewer';

pdfjs.GlobalWorkerOptions.workerSrc = `/static/pdf.worker.min.js`;

type EditingToolState = {
    type: "text" | "signature" | "checkbox";
    position: { x: number; y: number };
    element: PDFEditElement;
} | null;

const EditorPageContent = () => {
    const {
        state,
        setPdfFile,
        addElement,
        updateElement,
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
    const [editingTool, setEditingTool] = useState<EditingToolState>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const viewerRef = useRef<PDFViewerHandle>(null);
    const router = useRouter();
    const { t: tHome } = useTranslation("home");
    const { t: tEditor } = useTranslation("editor");

    const [isSaving, setIsSaving] = useState(false);

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

    // 뒤로가기 함수
    const handleGoBack = () => {
        router.push('/home');
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setPdfFile(file);
    };
    
    // [수정] handlePlaceElement에서 텍스트/서명 생성 시 배경 관련 기본값 추가
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
        const toolPosition = { x: newElement.x + 30, y: newElement.y };
        setEditingTool({ type, position: toolPosition, element: newElement });
    };

    const handleEditElement = (element: PDFEditElement) => {
        setPendingElementType(null);
        setSelectedElementId(element.id);
        const toolPosition = { x: element.x + 40, y: element.y };
        setEditingTool({ type: element.type, position: toolPosition, element });
    };

    const handleSubmitTool = (data: Partial<PDFEditElement>) => {
        if (!editingTool) return;
        if (editingTool.type === 'signature' && 'imageData' in data && !data.imageData) { 
            removeElement(editingTool.element.id); 
        } else { 
            const updatedElement = { ...editingTool.element, ...data } as PDFEditElement; 
            updateElement(updatedElement); 
        }
        setEditingTool(null);
    };

    const handleCloseTool = () => {
        if(editingTool && editingTool.element.type === 'signature' && !editingTool.element.imageData) { 
            removeElement(editingTool.element.id); 
        }
        setEditingTool(null);
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
            // Escape 키 처리
            if (e.key === 'Escape') {
                setPendingElementType(null);
                handleCloseTool();
                return;
            }

            // 입력 필드에서는 단축키 무시
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            // Ctrl/Cmd 키 조합 처리
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

            if (ctrlKey) {
                switch (e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) {
                            // Ctrl+Shift+Z 또는 Cmd+Shift+Z = 다시하기
                            if (canRedo()) {
                                redo();
                            }
                        } else {
                            // Ctrl+Z 또는 Cmd+Z = 되돌리기
                            if (canUndo()) {
                                undo();
                            }
                        }
                        break;
                    case 'y':
                        // Ctrl+Y = 다시하기 (Windows)
                        if (!isMac) {
                            e.preventDefault();
                            if (canRedo()) {
                                redo();
                            }
                        }
                        break;
                    case 'c':
                        // Ctrl+C 또는 Cmd+C = 복사
                        if (state.selectedElementId) {
                            e.preventDefault();
                            const selectedElement = state.elements.find(el => el.id === state.selectedElementId);
                            if (selectedElement) {
                                copyElement(selectedElement);
                            }
                        }
                        break;
                    case 'v':
                        // Ctrl+V 또는 Cmd+V = 붙여넣기
                        if (hasClipboard()) {
                            e.preventDefault();
                            // 현재 페이지의 중앙에 붙여넣기
                            pasteElement(200, 200, state.currentPage);
                        }
                        break;
                }
            } else {
                // 단일 키 처리
                switch (e.key) {
                    case 'Delete':
                    case 'Backspace':
                        // Delete 또는 Backspace = 삭제
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
    }, [editingTool, state.selectedElementId, state.currentPage, state.elements, undo, redo, copyElement, pasteElement, removeElement, canUndo, canRedo, hasClipboard]);

    // [수정] renderEditingTool에서 각 도구로 전달하는 onSubmit 콜백 수정
    const renderEditingTool = () => {
        if (!editingTool) return null;
        switch (editingTool.type) {
            case "text": 
                return <TextEditTool open={true} position={editingTool.position} editingElement={editingTool.element as PDFTextElement} onClose={handleCloseTool} 
                    onSubmit={(text, fontSize, color, hasBackground, backgroundColor) => handleSubmitTool({ text, fontSize, color, hasBackground, backgroundColor })} />;
            case "signature": 
                return <SignatureEditTool open={true} position={editingTool.position} editingElement={editingTool.element as PDFSignatureElement} onClose={handleCloseTool} 
                    onSubmit={(imageData, width, height, hasBackground, backgroundColor) => handleSubmitTool({ imageData, width, height, hasBackground, backgroundColor })} />;
            case "checkbox": 
                return <CheckboxEditTool open={true} position={editingTool.position} editingElement={editingTool.element as PDFCheckboxElement} onClose={handleCloseTool} 
                    onSubmit={(checked, size, color, borderColor, isTransparent, hasBorder) => handleSubmitTool({ checked, size, color, borderColor, isTransparent, hasBorder })} />;
            default: return null;
        }
    };

    return (
        <>
            <Head>
                <title>PDF 편집기 - PDF Studio</title>
            </Head>
            <div className="app-container min-h-screen flex flex-col">
                <input type="file" ref={fileInputRef} onChange={onFileChange} accept="application/pdf" style={{ display: 'none' }} />
                
                <EditToolbar
                    onSetPendingElement={type => { setEditingTool(null); setPendingElementType(type); }}
                    onSave={handleSave}
                    isSaving={isSaving}
                    onUploadClick={() => fileInputRef.current?.click()}
                    onGoBack={handleGoBack}
                />

                <div className="flex flex-1 overflow-hidden relative">
                    <PDFViewer
                      ref={viewerRef}
                      onEditElement={handleEditElement}
                      onPlaceElement={handlePlaceElement}
                      onCancelPlaceElement={() => setPendingElementType(null)}
                      onUploadClick={() => fileInputRef.current?.click()}
                    />
                    {renderEditingTool()}
                </div>
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