// --- renderer/pages/pdf-editor.tsx ---

import React, { useState, useRef, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { v4 as uuidv4 } from "uuid";
import { Box, CircularProgress, Typography } from '@mui/material';
import { usePDFEdit, PDFEditProvider, PDFEditElement, PDFTextElement, PDFSignatureElement, PDFCheckboxElement } from '../contexts/PDFEditContext';

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
    const { state, setPdfFile, addElement, updateElement, removeElement, setSelectedElementId, setPendingElementType } = usePDFEdit();
    const [editingTool, setEditingTool] = useState<EditingToolState>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const viewerRef = useRef<PDFViewerHandle>(null);

    const [isSaving, setIsSaving] = useState(false);

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
                newElement = { ...baseElement, type: 'text', text: "텍스트 입력", fontSize: 20, color: "#222222", hasBackground: false, backgroundColor: "#ffffff" }; 
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
            if (e.key === 'Escape') {
                setPendingElementType(null);
                handleCloseTool();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editingTool]);

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
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#e8e8e8' }}>
            <input type="file" ref={fileInputRef} onChange={onFileChange} accept="application/pdf" style={{ display: 'none' }} />
            
            <EditToolbar
                onSetPendingElement={type => { setEditingTool(null); setPendingElementType(type); }}
                onSave={handleSave}
                isSaving={isSaving}
                onUploadClick={() => fileInputRef.current?.click()}
            />

            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
                <PDFViewer
                  ref={viewerRef}
                  onEditElement={handleEditElement}
                  onPlaceElement={handlePlaceElement}
                  onCancelPlaceElement={() => setPendingElementType(null)}
                />
                {renderEditingTool()}
            </Box>
        </Box>
    );
};

const EditorPage = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  if (!isClient) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#e8e8e8' }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>PDF 에디터를 불러오는 중입니다...</Typography>
        </Box>
    );
  }

  return (
    <PDFEditProvider>
      <EditorPageContent />
    </PDFEditProvider>
  );
};

export default EditorPage;