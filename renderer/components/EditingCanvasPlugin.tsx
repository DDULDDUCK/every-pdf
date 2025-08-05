// --- components/EditingCanvasPlugin.tsx ---

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Plugin, PluginRenderPageLayer } from '@react-pdf-viewer/core';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { Box, Typography } from '@mui/material';
import { usePDFEdit, PDFEditElement, PDFTextElement, PDFSignatureElement, PDFCheckboxElement } from '../contexts/PDFEditContext';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import GestureIcon from '@mui/icons-material/Gesture';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import ContextMenu from './ContextMenu';

interface EditingCanvasPluginProps {
  onEditElement: (element: PDFEditElement) => void;
  onPlaceElement: (type: 'text' | 'signature' | 'checkbox', page: number, x: number, y: number) => void;
  onCancelPlaceElement: () => void;
}

const EditingOverlay: React.FC<PluginRenderPageLayer & EditingCanvasPluginProps> = ({
    pageIndex, scale, onEditElement, onPlaceElement, onCancelPlaceElement,
}) => {
    const { state, updateElement, setSelectedElementId } = usePDFEdit();
    const { t } = useTranslation('editor');
    const [pendingPosition, setPendingPosition] = React.useState<{ x: number; y: number } | null>(null);
    const [contextMenu, setContextMenu] = React.useState<{
        position: { left: number; top: number };
        selectedElement?: PDFEditElement | null;
        pastePosition?: { x: number; y: number; page: number } | null;
    } | null>(null);
    const elementsOnPage = state.elements.filter((el) => el.page === pageIndex + 1);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        setContextMenu(null);
        if (state.pendingElementType) {
            const x = e.nativeEvent.offsetX / scale;
            const y = e.nativeEvent.offsetY / scale;
            onPlaceElement(state.pendingElementType, pageIndex + 1, x, y);
        } else {
            setSelectedElementId(null);
        }
        e.preventDefault(); e.stopPropagation();
    };

    const handleOverlayContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (state.pendingElementType) {
            onCancelPlaceElement();
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.nativeEvent.offsetX / scale;
        const y = e.nativeEvent.offsetY / scale;
        
        setContextMenu({
            position: { left: e.clientX, top: e.clientY },
            selectedElement: null,
            pastePosition: { x, y, page: pageIndex + 1 }
        });
    };

    const handleElementContextMenu = (e: React.MouseEvent, element: PDFEditElement) => {
        e.preventDefault();
        e.stopPropagation();
        
        setSelectedElementId(element.id);
        setContextMenu({
            position: { left: e.clientX, top: e.clientY },
            selectedElement: element,
            pastePosition: null
        });
    };

    const handleContextMenuClose = () => {
        setContextMenu(null);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (state.pendingElementType) setPendingPosition({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
    };
    
     // [수정] 드래그 시작 시 요소를 선택하는 로직 추가
    const handleDrag = (el: PDFEditElement, e: DraggableEvent, data: DraggableData) => {
        // 드래그가 시작될 때 해당 요소가 선택되지 않았다면 선택해준다.
        if (state.selectedElementId !== el.id) {
            setSelectedElementId(el.id);
        }
        updateElement({ ...el, x: data.x / scale, y: data.y / scale });
    };

    // [수정] 클릭 대신 마우스 다운 시점에 선택
    const handleElementMouseDown = (e: React.MouseEvent, el: PDFEditElement) => {
        e.stopPropagation();
        setSelectedElementId(el.id);
    };

    const renderPendingElement = () => {
        if (!state.pendingElementType || !pendingPosition) return null;
        const ghostStyle: React.CSSProperties = { position: 'absolute', top: pendingPosition.y, left: pendingPosition.x, transform: 'translate(-50%, -50%)', zIndex: 25, opacity: 0.7, pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 123, 255, 0.8)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '14px', whiteSpace: 'nowrap' };
        switch (state.pendingElementType) {
            case 'text': return <Box sx={ghostStyle}><TextFieldsIcon fontSize="small" />{t('addText')}</Box>;
            case 'signature': return <Box sx={ghostStyle}><GestureIcon fontSize="small" />{t('addSignature')}</Box>;
            case 'checkbox': return <Box sx={ghostStyle}><CheckBoxOutlineBlankIcon fontSize="small" />{t('addCheckbox')}</Box>;
            default: return null;
        }
    };


    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}>
            <div
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: state.pendingElementType ? 'crosshair' : 'default' }}
                onClick={handleOverlayClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setPendingPosition(null)}
                onContextMenu={handleOverlayContextMenu}
            />
            {renderPendingElement()}
            {elementsOnPage.map((el) => {
                const isSelected = state.selectedElementId === el.id;
                return (
                    <Draggable
                        key={el.id}
                        // [핵심 수정] 제어 컴포넌트로 만들기 위해 position을 명시적으로 전달
                        position={{ x: el.x * scale, y: el.y * scale }}
                        // [핵심 수정] onStop -> onDrag 로 변경하여 실시간 위치 업데이트
                        // 이렇게 하면 드래그가 훨씬 부드러워지고, 서명 요소 등의 초기 위치 오류가 사라집니다.
                        onDrag={(e, data) => handleDrag(el, e, data)}
                        bounds="parent" 
                        // react-draggable의 scale은 1로 두고, 우리 앱의 scale은 직접 계산에 사용합니다.
                        scale={1} 
                    >
                        <Box
                            onDoubleClick={() => onEditElement(el)}
                            onMouseDown={(e) => handleElementMouseDown(e, el)}
                            onContextMenu={(e) => handleElementContextMenu(e, el)}
                            sx={{
                                position: 'absolute', cursor: 'move',
                                border: isSelected ? '2px dashed #007BFF' : '1px solid transparent',
                                '&:hover': { border: isSelected ? '2px dashed #007BFF' : '1px dashed grey' },
                                backgroundColor: el.type === 'text' && (el as PDFTextElement).hasBackground ? (el as PDFTextElement).backgroundColor :
                                                 el.type === 'signature' && (el as PDFSignatureElement).hasBackground ? (el as PDFSignatureElement).backgroundColor :
                                                 'transparent',
                                p: '2px', 
                            }}
                        >
                            {el.type === 'text' && (
                                <Typography sx={{ color: (el as PDFTextElement).color, fontSize: `${(el as PDFTextElement).fontSize * scale}px`, whiteSpace: 'pre-wrap', userSelect: 'none', lineHeight: 1.2 }}>
                                    {(el as PDFTextElement).text}
                                </Typography>
                            )}
                            {el.type === 'signature' && (el as PDFSignatureElement).imageData && (
                                <img src={`data:image/png;base64,${(el as PDFSignatureElement).imageData}`} alt="signature" style={{ width: (el as PDFSignatureElement).width * scale, height: (el as PDFSignatureElement).height * scale, userSelect: 'none', display: 'block' }} />
                            )}
                            {el.type === 'checkbox' && (() => {
                                const checkboxEl = el as PDFCheckboxElement;
                                const size = checkboxEl.size * scale;
                                return (
                                    <svg width={size} height={size}>
                                        <rect 
                                            x={1} y={1}
                                            width={size - 2} height={size - 2}
                                            fill={checkboxEl.isTransparent ? 'transparent' : checkboxEl.color} 
                                            stroke={checkboxEl.hasBorder ? checkboxEl.borderColor : 'transparent'} 
                                            strokeWidth={1.5} 
                                            rx={2}
                                        />
                                        {checkboxEl.checked && (
                                            <polyline 
                                                points={`${size*0.2},${size*0.5} ${size*0.45},${size*0.75} ${size*0.8},${size*0.25}`} 
                                                fill="none" 
                                                stroke="#000" 
                                                strokeWidth={size/8} 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round"
                                            />
                                        )}
                                    </svg>
                                );
                            })()}
                        </Box>
                    </Draggable>
                );
            })}
            
            <ContextMenu
                anchorPosition={contextMenu?.position || null}
                onClose={handleContextMenuClose}
                selectedElement={contextMenu?.selectedElement}
                onEditElement={onEditElement}
                pastePosition={contextMenu?.pastePosition}
            />
        </div>
    );
};

export const editingCanvasPlugin = (props: EditingCanvasPluginProps): Plugin => ({
    renderPageLayer: (renderPageLayerProps: PluginRenderPageLayer) => <EditingOverlay {...renderPageLayerProps} {...props} />,
});