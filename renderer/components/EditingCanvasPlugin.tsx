// --- components/EditingCanvasPlugin.tsx ---

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Plugin, PluginRenderPageLayer } from '@react-pdf-viewer/core';
import Draggable from 'react-draggable';
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
        setContextMenu(null); // 컨텍스트 메뉴 닫기
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
                        position={{ x: el.x * scale, y: el.y * scale }}
                        onStop={(e, data) => { updateElement({ ...el, x: data.x / scale, y: data.y / scale }); }}
                        bounds="parent" scale={1}
                    >
                        <Box
                            onDoubleClick={() => onEditElement(el)}
                            onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); }}
                            onContextMenu={(e) => handleElementContextMenu(e, el)}
                            sx={{
                                position: 'absolute', cursor: 'move',
                                border: isSelected ? '2px dashed #007BFF' : '1px dashed transparent',
                                '&:hover': { border: isSelected ? '2px dashed #007BFF' : '1px dashed grey' },
                                backgroundColor: el.type === 'text' && (el as PDFTextElement).hasBackground ? (el as PDFTextElement).backgroundColor :
                                                 el.type === 'signature' && (el as PDFSignatureElement).hasBackground ? (el as PDFSignatureElement).backgroundColor :
                                                 'transparent',
                                // 패딩을 Box 자체에 적용하여 자식 요소들이 올바르게 위치하도록 함
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
                            {/* [핵심 수정] 체크박스 렌더링을 SVG로 통일 */}
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
            
            {/* 컨텍스트 메뉴 */}
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