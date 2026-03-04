// --- components/EditingCanvasPlugin.tsx ---

import React, { useEffect, useRef, useState } from 'react';
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
  onDeselect: () => void;
}

const EditingOverlay: React.FC<PluginRenderPageLayer & EditingCanvasPluginProps> = ({
    pageIndex, scale, onEditElement, onPlaceElement, onCancelPlaceElement, onDeselect
}) => {
    const { state, updateElement, setSelectedElementId, saveHistory } = usePDFEdit();
    const { t } = useTranslation('editor');

    // [오류 수정] 누락된 useState 선언부 추가
    const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        position: { left: number; top: number };
        selectedElement?: PDFEditElement | null;
        pastePosition?: { x: number; y: number; page: number } | null;
    } | null>(null);

    const nodeRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});

    const elementsOnPage = state.elementsByPage[pageIndex + 1] || [];

    const getNodeRef = (elementId: string) => {
        if (!nodeRefs.current[elementId]) {
            nodeRefs.current[elementId] = React.createRef<HTMLDivElement>();
        }

        return nodeRefs.current[elementId];
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLElement>) => {
        setContextMenu(null);
        if (state.pendingElementType) {
            const x = e.nativeEvent.offsetX / scale;
            const y = e.nativeEvent.offsetY / scale;
            onPlaceElement(state.pendingElementType, pageIndex + 1, x, y);
        } else {
            onDeselect();
        }
        e.preventDefault(); e.stopPropagation();
    };

    const handleOverlayContextMenu = (e: React.MouseEvent<HTMLElement>) => {
        e.preventDefault(); e.stopPropagation();
        if (state.pendingElementType) {
            onCancelPlaceElement();
            return;
        }
        const x = e.nativeEvent.offsetX / scale;
        const y = e.nativeEvent.offsetY / scale;
        setContextMenu({
            position: { left: e.clientX, top: e.clientY },
            selectedElement: null,
            pastePosition: { x, y, page: pageIndex + 1 }
        });
    };

    const handleElementContextMenu = (e: React.MouseEvent, element: PDFEditElement) => {
        e.preventDefault(); e.stopPropagation();
        setSelectedElementId(element.id);
        setContextMenu({
            position: { left: e.clientX, top: e.clientY },
            selectedElement: element,
            pastePosition: null
        });
    };

    const handleContextMenuClose = () => setContextMenu(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
        if (!state.pendingElementType) {
            return;
        }

        const nextPosition = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
        setPendingPosition((prev) => {
            if (prev && prev.x === nextPosition.x && prev.y === nextPosition.y) {
                return prev;
            }

            return nextPosition;
        });
    };

    const handleDragStart = (el: PDFEditElement) => {
        setSelectedElementId(el.id);
    };

    const handleDragStop = (el: PDFEditElement, _e: DraggableEvent, data: DraggableData) => {
        const nextX = data.x / scale;
        const nextY = data.y / scale;

        if (el.x === nextX && el.y === nextY) {
            return;
        }

        updateElement({ ...el, x: nextX, y: nextY }, false);
        saveHistory();
    };

    useEffect(() => {
        return () => {
            nodeRefs.current = {};
        };
    }, []);

    useEffect(() => {
        const activeIds = new Set(elementsOnPage.map((element) => element.id));
        Object.keys(nodeRefs.current).forEach((id) => {
            if (!activeIds.has(id)) {
                delete nodeRefs.current[id];
            }
        });
    }, [elementsOnPage]);

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
            <button
                type="button"
                aria-label={t('editorOverlay', 'PDF editing overlay')}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: state.pendingElementType ? 'crosshair' : 'default', background: 'transparent', border: 'none', padding: 0 }}
                onClick={handleOverlayClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setPendingPosition(null)}
                onContextMenu={handleOverlayContextMenu}
            />
            {renderPendingElement()}
            {elementsOnPage.map((el) => {
                const isSelected = state.selectedElementId === el.id;
                const nodeRef = getNodeRef(el.id);
                const draggableKey = `${el.id}:${el.x}:${el.y}:${scale}`;
                return (
                    <Draggable
                        key={draggableKey}
                        nodeRef={nodeRef}
                        defaultPosition={{ x: el.x * scale, y: el.y * scale }}
                        onStart={() => handleDragStart(el)}
                        onStop={(_e, data) => handleDragStop(el, _e, data)}
                        bounds="parent" 
                        scale={1} 
                    >
                        <Box
                            ref={nodeRef}
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
                            {el.type === 'signature' && (
                                <>
                                    {(el as PDFSignatureElement).imageData ? (
                                        <img src={`data:image/png;base64,${(el as PDFSignatureElement).imageData}`} alt="signature" style={{ width: (el as PDFSignatureElement).width * scale, height: (el as PDFSignatureElement).height * scale, userSelect: 'none', display: 'block' }} />
                                    ) : (
                                        <Box sx={{
                                            width: (el as PDFSignatureElement).width * scale,
                                            height: (el as PDFSignatureElement).height * scale,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px dashed #999',
                                            borderRadius: '4px',
                                            backgroundColor: 'rgba(0,0,0,0.05)',
                                            userSelect: 'none',
                                            p: 1,
                                        }}>
                                            <Typography sx={{ color: '#666', fontSize: 12 * scale, textAlign: 'center' }}>
                                                {t("addSignaturePlaceholder", "Click to add signature")}
                                            </Typography>
                                        </Box>
                                    )}
                                </>
                            )}
                            {el.type === 'checkbox' && (() => {
                                const checkboxEl = el as PDFCheckboxElement;
                                const size = checkboxEl.size * scale;
                                return (
                                    <svg width={size} height={size}>
                                        <title>{t('checkboxPreview', 'Checkbox preview')}</title>
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
