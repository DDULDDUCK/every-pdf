// --- components/TextEditTool.tsx ---

import React, { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";
import { HexColorPicker } from "react-colorful";
import { PDFTextElement } from "../contexts/PDFEditContext";
import { useTranslation } from "react-i18next";

type TextEditToolProps = {
  open: boolean;
  position: { x: number; y: number } | null;
  editingElement: PDFTextElement | null;
  onClose: () => void;
  onSubmit: (text: string, fontSize: number, color: string, hasBackground: boolean, backgroundColor: string) => void;
};

const MIN_TOOL_WIDTH = 280;

const TextEditTool = ({ open, position, editingElement, onClose, onSubmit }: TextEditToolProps) => {
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(20);
  const [color, setColor] = useState("#222222");
  const [hasBackground, setHasBackground] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
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
      setText(editingElement.text);
      setFontSize(editingElement.fontSize);
      setColor(editingElement.color);
      setHasBackground(editingElement.hasBackground);
      setBackgroundColor(editingElement.backgroundColor);
    } else {
      setText("");
      setFontSize(20);
      setColor("#222222");
      setHasBackground(false);
      setBackgroundColor("#ffffff");
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
          className="text-lg font-medium text-text mb-4 theme-transition drag-handle"
          style={{ cursor: 'move' }}
        >
          {t("editText")}
        </h3>
        
        <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            <div className="mb-4">
              <textarea
                placeholder={t("textPlaceholder")}
                value={text}
                onChange={e => setText(e.target.value)}
                className="w-full form-input resize-none"
                rows={2}
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="panel-label">{t("fontSize")}: <strong>{fontSize}px</strong></label>
              <input
                type="range"
                min={10}
                max={72}
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                className="w-full theme-transition"
              />
            </div>

            <div className="mb-4">
              <label className="panel-label">{t("fontColor")}: <strong>{color}</strong></label>
              <HexColorPicker color={color} onChange={setColor} style={{width: '100%', height: 120}}/>
            </div>

            <hr className="border-border my-4" />
            
            <div className="mb-2">
              <label className="flex items-center gap-2 text-text theme-transition">
                <input
                  type="checkbox"
                  checked={hasBackground}
                  onChange={e => setHasBackground(e.target.checked)}
                  className="theme-transition"
                />
                {t("background")}
              </label>
            </div>

            {hasBackground && (
              <div className="mb-4">
                <label className="panel-label">{t("backgroundColor")}: <strong>{backgroundColor}</strong></label>
                <HexColorPicker color={backgroundColor} onChange={setBackgroundColor} style={{width: '100%', height: 120}}/>
              </div>
            )}
        </div>
      
        <div className="flex gap-2 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-md border border-border bg-card-bg hover:bg-button-hover text-text theme-transition"
          >
            {t("cancel")}
          </button>
          <button
            onClick={() => onSubmit(text, fontSize, color, hasBackground, backgroundColor)}
            disabled={!text.trim()}
            className="px-3 py-2 rounded-md bg-primary hover:bg-primary-hover text-white theme-transition disabled:opacity-50 disabled:cursor-not-allowed"
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

export default TextEditTool;