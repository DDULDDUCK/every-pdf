// --- components/SignatureEditTool.tsx ---

import React, { useRef, useState, useEffect } from "react";
import Draggable from "react-draggable";
import SignatureCanvas from "react-signature-canvas";
import { HexColorPicker } from "react-colorful";
import { PDFSignatureElement } from "../contexts/PDFEditContext";
import { useTranslation } from "react-i18next";

type SignatureEditToolProps = {
  open: boolean;
  position: { x: number; y: number } | null;
  editingElement: PDFSignatureElement | null;
  onClose: () => void;
  onSubmit: (imageData: string, width: number, height: number, hasBackground: boolean, backgroundColor: string) => void;
};

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 80;
const MIN_TOOL_WIDTH = 340;

const SignatureEditTool = ({ open, position, editingElement, onClose, onSubmit }: SignatureEditToolProps) => {
  const [tab, setTab] = useState(0);
  const [imageData, setImageData] = useState<string>("");
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const [hasBackground, setHasBackground] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const { t } = useTranslation("editor");

  const [toolPosition, setToolPosition] = useState(position || { x: 0, y: 0 });
  const [toolSize, setToolSize] = useState({ width: 360, height: 'auto' });
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
      setImageData(`data:image/png;base64,${editingElement.imageData}`);
      setSize({ width: editingElement.width, height: editingElement.height });
      setHasBackground(editingElement.hasBackground);
      setBackgroundColor(editingElement.backgroundColor);
    } else {
      setImageData("");
      setSize({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
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
  
  const handleClear = () => {
    sigCanvasRef.current?.clear();
    setImageData("");
  };

  const handleSaveDraw = () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      setImageData("");
      return;
    }
    const dataUrl = sigCanvasRef.current.toDataURL("image/png");
    setImageData(dataUrl);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        let newWidth = DEFAULT_WIDTH;
        let newHeight = newWidth / aspectRatio;
        if (newHeight > 150) { newHeight = 150; newWidth = newHeight * aspectRatio; }
        setSize({ width: newWidth, height: newHeight });
        setImageData(result);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

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
          {t("editSignature")}
        </h3>
      
        <div className="flex border-b border-border mb-4">
          <button
            onClick={() => setTab(0)}
            className={`flex-1 py-2 px-4 text-sm font-medium theme-transition ${
              tab === 0
                ? 'border-b-2 border-primary text-primary'
                : 'text-button-text hover:text-text'
            }`}
          >
            {t("draw")}
          </button>
          <button
            onClick={() => setTab(1)}
            className={`flex-1 py-2 px-4 text-sm font-medium theme-transition ${
              tab === 1
                ? 'border-b-2 border-primary text-primary'
                : 'text-button-text hover:text-text'
            }`}
          >
            {t("upload")}
          </button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            {tab === 0 && (
              <div className="mb-4 flex flex-col items-center">
                <div className="border-2 border-dashed border-border rounded overflow-hidden">
                  <SignatureCanvas
                    ref={sigCanvasRef}
                    penColor="black"
                    canvasProps={{ width: 320, height: 150 }}
                    onEnd={handleSaveDraw}
                  />
                </div>
                <button
                  onClick={handleClear}
                  className="mt-2 px-3 py-1 text-sm rounded-md border border-border bg-card-bg hover:bg-button-hover text-text theme-transition"
                >
                  {t("clear")}
                </button>
              </div>
            )}

            {tab === 1 && (
              <div className="mb-4 p-4 border-2 border-dashed border-border rounded text-center">
                <label className="px-4 py-2 rounded-md border border-border bg-card-bg hover:bg-button-hover text-text theme-transition cursor-pointer">
                  {t("upload")}
                  <input type="file" hidden accept="image/png,image/jpeg" onChange={handleUpload} />
                </label>
              </div>
            )}
            
            {imageData && (
              <>
                <div className="mb-4">
                  <label className="panel-label">{t("preview")}</label>
                  <div
                    className="p-2 border border-border flex justify-center items-center mb-2 min-h-[100px] rounded theme-transition"
                    style={{ backgroundColor: hasBackground ? backgroundColor : 'transparent' }}
                  >
                    <img
                      src={imageData}
                      alt="signature-preview"
                      style={{ width: size.width, height: size.height, objectFit: 'contain' }}
                    />
                  </div>
                  
                  <label className="panel-label">{t("width")}: {Math.round(size.width)}px</label>
                  <input
                    type="range"
                    min={50}
                    max={400}
                    value={size.width}
                    onChange={e => setSize({ ...size, width: Number(e.target.value)})}
                    className="w-full mb-2 theme-transition"
                  />
                  
                  <label className="panel-label">{t("height")}: {Math.round(size.height)}px</label>
                  <input
                    type="range"
                    min={20}
                    max={300}
                    value={size.height}
                    onChange={e => setSize({ ...size, height: Number(e.target.value)})}
                    className="w-full theme-transition"
                  />
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
              </>
            )}
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-md border border-border bg-card-bg hover:bg-button-hover text-text theme-transition"
          >
            {t("cancel")}
          </button>
          <button
            onClick={() => {
              const base64Data = imageData.split(',')[1] || "";
              onSubmit(base64Data, size.width, size.height, hasBackground, backgroundColor);
            }}
            disabled={!imageData}
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

export default SignatureEditTool;