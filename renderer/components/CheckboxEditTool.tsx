// --- components/CheckboxEditTool.tsx ---

import React, { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";
import { HexColorPicker } from "react-colorful";
import { PDFCheckboxElement } from "../contexts/PDFEditContext";
import { useTranslation } from "react-i18next";

type CheckboxEditToolProps = {
  open: boolean;
  position: { x: number; y: number } | null;
  editingElement: PDFCheckboxElement | null;
  onClose: () => void;
  onSubmit: (checked: boolean, size: number, color: string, borderColor:string, isTransparent: boolean, hasBorder: boolean) => void;
};

const DEFAULT_SIZE = 18;
const DEFAULT_COLOR = "#ffffff";
const DEFAULT_BORDER = "#000000";
const MIN_TOOL_WIDTH = 280;

const CheckboxEditTool = ({ open, position, editingElement, onClose, onSubmit }: CheckboxEditToolProps) => {
  const [checked, setChecked] = useState(false);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [borderColor, setBorderColor] = useState(DEFAULT_BORDER);
  const [isTransparent, setIsTransparent] = useState(false);
  const [hasBorder, setHasBorder] = useState(true);
  const { t } = useTranslation("editor");

  const [toolPosition, setToolPosition] = useState(position || { x: 0, y: 0 });
  const [toolSize, setToolSize] = useState({ width: 300, height: 'auto' });
  const [isResizing, setIsResizing] = useState(false);
  const nodeRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (nodeRef.current) {
        const toolEl = nodeRef.current as HTMLDivElement;
        const toolRect = toolEl.getBoundingClientRect();
        const newWidth = Math.max(MIN_TOOL_WIDTH, e.clientX - toolRect.left);
        // 리렌더링을 피하기 위해 DOM을 직접 조작
        toolEl.style.width = `${newWidth}px`;
      }
    };
    
    const handleMouseUp = () => {
      // 리사이즈 종료 시점에만 상태 업데이트
      if (nodeRef.current) {
          const toolEl = nodeRef.current as HTMLDivElement;
          setToolSize(prev => ({ ...prev, width: toolEl.offsetWidth }));
      }
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (open && position) {
      setToolPosition(position);
    }
  }, [open, position]);

  useEffect(() => {
    if (editingElement) {
      setChecked(editingElement.checked);
      setSize(editingElement.size);
      setColor(editingElement.color);
      setBorderColor(editingElement.borderColor);
      setIsTransparent(editingElement.isTransparent);
      setHasBorder(editingElement.hasBorder);
    } else {
      setChecked(false);
      setSize(DEFAULT_SIZE);
      setColor(DEFAULT_COLOR);
      setBorderColor(DEFAULT_BORDER);
      setIsTransparent(false);
      setHasBorder(true);
    }
  }, [editingElement, open]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  if (!open || !position) return null;

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".drag-handle"
      position={toolPosition}
      onStop={(_, data) => setToolPosition({ x: data.x, y: data.y })} // onDrag -> onStop
      disabled={isResizing}
    >
      <div
        ref={nodeRef}
        className="absolute bg-card-bg border border-border rounded-lg shadow-lg p-4 z-20 theme-transition flex flex-col"
        style={{
          width: toolSize.width,
          height: toolSize.height,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="text-lg font-medium text-text mb-2 theme-transition drag-handle"
          style={{ cursor: 'move' }}
        >
          {t("editCheckbox")}
        </h3>
        
        <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            <div className="flex justify-between items-center mb-4">
              <label className="flex items-center gap-2 text-text theme-transition">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => setChecked(e.target.checked)}
                  className="theme-transition"
                />
                {t("checked")}
              </label>
              
              <div className="border border-border p-2 rounded bg-panel-bg theme-transition">
                <svg width={size} height={size}>
                  <rect
                    x={1} y={1}
                    width={size-2} height={size-2}
                    fill={isTransparent ? 'transparent' : color}
                    stroke={hasBorder ? borderColor : 'transparent'}
                    strokeWidth={1.5} rx={2}
                  />
                  {checked && <polyline points={`${size*0.2},${size*0.5} ${size*0.45},${size*0.75} ${size*0.8},${size*0.25}`} fill="none" stroke="#000" strokeWidth={size/8} strokeLinecap="round" strokeLinejoin="round"/>}
                </svg>
              </div>
            </div>

            <div className="flex justify-around mb-4">
              <label className="flex items-center gap-2 text-text theme-transition">
                <input
                  type="checkbox"
                  checked={isTransparent}
                  onChange={e => setIsTransparent(e.target.checked)}
                  className="theme-transition"
                />
                {t("transparent")}
              </label>
              <label className="flex items-center gap-2 text-text theme-transition">
                <input
                  type="checkbox"
                  checked={hasBorder}
                  onChange={e => setHasBorder(e.target.checked)}
                  className="theme-transition"
                />
                {t("showBorder")}
              </label>
            </div>

            <div className="mb-4">
              <label className="panel-label">{t("size")}: <strong>{size}px</strong></label>
              <input
                type="range"
                min={10}
                max={50}
                value={size}
                onChange={e => setSize(Number(e.target.value))}
                className="w-full theme-transition"
              />
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="panel-label">{t("fill")}: <strong>{isTransparent ? t("transparent") : color}</strong></label>
                <HexColorPicker
                  color={color}
                  onChange={setColor}
                  style={{
                    width: '100%',
                    height: 100,
                    pointerEvents: isTransparent ? 'none' : 'auto',
                    opacity: isTransparent ? 0.5 : 1
                  }}
                />
              </div>
              <div className="flex-1">
                <label className="panel-label">{t("border")}: <strong>{hasBorder ? borderColor : t("transparent")}</strong></label>
                <HexColorPicker
                  color={borderColor}
                  onChange={setBorderColor}
                  style={{
                    width: '100%',
                    height: 100,
                    pointerEvents: !hasBorder ? 'none' : 'auto',
                    opacity: !hasBorder ? 0.5 : 1
                  }}
                />
              </div>
            </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-md border border-border bg-card-bg hover:bg-button-hover text-text theme-transition"
          >
            {t("cancel")}
          </button>
          <button
            onClick={() => onSubmit(checked, size, color, borderColor, isTransparent, hasBorder)}
            className="px-3 py-2 rounded-md bg-primary hover:bg-primary-hover text-white theme-transition"
          >
            {t("confirm")}
          </button>
        </div>
        
        <div
          className="resize-handle absolute bottom-1 right-1 w-3 h-3 bg-gray-400 rounded-full cursor-se-resize"
          onMouseDown={handleResizeStart}
        />
      </div>
    </Draggable>
  );
};

export default CheckboxEditTool;