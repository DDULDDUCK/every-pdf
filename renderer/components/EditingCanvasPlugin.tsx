// --- components/EditingCanvasPlugin.tsx ---

import * as React from 'react';
import { Plugin, PluginRenderPageLayer } from '@react-pdf-viewer/core'; 
import Draggable from 'react-draggable';
import { Box, Typography } from '@mui/material';
import { usePDFEdit, PDFEditElement, PDFTextElement, PDFSignatureElement, PDFCheckboxElement } from '../contexts/PDFEditContext';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import GestureIcon from '@mui/icons-material/Gesture';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';

interface EditingCanvasPluginProps {
  onEditElement: (element: PDFEditElement) => void;
  onPlaceElement: (type: 'text' | 'signature' | 'checkbox', page: number, x: number, y: number) => void;
  onCancelPlaceElement: () => void;
}

const EditingOverlay: React.FC<PluginRenderPageLayer & EditingCanvasPluginProps> = ({
    pageIndex, scale, onEditElement, onPlaceElement, onCancelPlaceElement,
}) => {
    const { state, updateElement, setSelectedElementId } = usePDFEdit();
    const [pendingPosition, setPendingPosition] = React.useState<{ x: number; y: number } | null>(null);
    const elementsOnPage = state.elements.filter((el) => el.page === pageIndex + 1);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (state.pendingElementType) {
            const x = e.nativeEvent.offsetX / scale;
            const y = e.nativeEvent.offsetY / scale;
            onPlaceElement(state.pendingElementType, pageIndex + 1, x, y);
        } else {
            setSelectedElementId(null);
        }
        e.preventDefault(); e.stopPropagation();
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (state.pendingElementType) setPendingPosition({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
    };
    
    // [수정] renderPendingElement 함수
    const renderPendingElement = () => {
        if (!state.pendingElementType || !pendingPosition) return null;

        const ghostStyle: React.CSSProperties = {
            position: 'absolute',
            top: pendingPosition.y,
            left: pendingPosition.x,
            transform: 'translate(-50%, -50%)',
            zIndex: 25,
            opacity: 0.7,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(0, 123, 255, 0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '14px',
            whiteSpace: 'nowrap',
        };

        switch (state.pendingElementType) {
            case 'text': return <Box sx={ghostStyle}><TextFieldsIcon fontSize="small" /> 텍스트 추가</Box>;
            case 'signature': return <Box sx={ghostStyle}><GestureIcon fontSize="small" /> 서명 추가</Box>;
            case 'checkbox': return <Box sx={ghostStyle}><CheckBoxOutlineBlankIcon fontSize="small" /> 체크박스 추가</Box>;
            default: 
                // *** 여기가 수정된 부분입니다 ***
                // default case에서 명시적으로 null을 반환하여 TypeScript 오류를 해결합니다.
                return null;
        }
    };

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}>
            <div
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: state.pendingElementType ? 'crosshair' : 'default' }}
                onClick={handleOverlayClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setPendingPosition(null)}
                onContextMenu={(e) => { e.preventDefault(); onCancelPlaceElement(); }}
            />
            {renderPendingElement()}
            {elementsOnPage.map((el) => {
                const isSelected = state.selectedElementId === el.id;
                return (
                    <Draggable
                        key={el.id}
                        position={{ x: el.x * scale, y: el.y * scale }}
                        onStop={(e, data) => { updateElement({ ...el, x: data.x / scale, y: data.y / scale }); }}
                        bounds="parent" scale={1}
                    >
                        <Box
                            onDoubleClick={() => onEditElement(el)}
                            onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); }}
                            sx={{
                                position: 'absolute', cursor: 'move',
                                border: isSelected ? '2px dashed #007BFF' : '1px dashed transparent',
                                p: '2px',
                                '&:hover': { border: isSelected ? '2px dashed #007BFF' : '1px dashed grey' },
                                backgroundColor: el.type === 'text' && (el as PDFTextElement).hasBackground ? (el as PDFTextElement).backgroundColor :
                                                 el.type === 'signature' && (el as PDFSignatureElement).hasBackground ? (el as PDFSignatureElement).backgroundColor :
                                                 'transparent'
                            }}
                        >
                            {el.type === 'text' && (
                                <Typography sx={{ color: (el as PDFTextElement).color, fontSize: `${(el as PDFTextElement).fontSize * scale}px`, whiteSpace: 'pre-wrap', userSelect: 'none' }}>
                                    {(el as PDFTextElement).text}
                                </Typography>
                            )}
                            {el.type === 'signature' && (el as PDFSignatureElement).imageData && (
                                <img src={`data:image/png;base64,${(el as PDFSignatureElement).imageData}`} alt="signature" style={{ width: (el as PDFSignatureElement).width * scale, height: (el as PDFSignatureElement).height * scale, userSelect: 'none', display: 'block' }} />
                            )}
                            {el.type === 'checkbox' && (() => {
                                const checkboxEl = el as PDFCheckboxElement;
                                return (
                                    <Box sx={{ width: checkboxEl.size * scale, height: checkboxEl.size * scale, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: checkboxEl.isTransparent ? 'transparent' : checkboxEl.color, border: checkboxEl.hasBorder ? `1.5px solid ${checkboxEl.borderColor}` : '1.5px solid transparent', borderRadius: '2px' }}>
                                        {checkboxEl.checked && <Typography sx={{color: '#000', fontSize: `${checkboxEl.size * scale * 0.8}px`, lineHeight: 1, userSelect: 'none'}}>✓</Typography>}
                                    </Box>
                                );
                            })()}
                        </Box>
                    </Draggable>
                );
            })}
        </div>
    );
};

export const editingCanvasPlugin = (props: EditingCanvasPluginProps): Plugin => ({
    renderPageLayer: (renderPageLayerProps: PluginRenderPageLayer) => <EditingOverlay {...renderPageLayerProps} {...props} />,
});