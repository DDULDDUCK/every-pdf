// --- components/SignatureEditTool.tsx ---

import React, { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { HexColorPicker } from "react-colorful";
import { PDFSignatureElement } from "../contexts/PDFEditContext";

type SignatureEditToolProps = {
  open: boolean;
  position: { x: number; y: number } | null;
  editingElement: PDFSignatureElement | null;
  onClose: () => void;
  // [수정] onSubmit 콜백에 hasBackground, backgroundColor 파라미터 추가
  onSubmit: (imageData: string, width: number, height: number, hasBackground: boolean, backgroundColor: string) => void;
};

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 80;

const SignatureEditTool = ({ open, position, editingElement, onClose, onSubmit }: SignatureEditToolProps) => {
  const [tab, setTab] = useState(0);
  const [imageData, setImageData] = useState<string>("");
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  // [추가] 배경 관련 상태 추가
  const [hasBackground, setHasBackground] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");

  useEffect(() => {
    if (editingElement) {
      setImageData(editingElement.imageData);
      setSize({ width: editingElement.width, height: editingElement.height });
      // [추가] editingElement에서 배경 속성 로드
      setHasBackground(editingElement.hasBackground);
      setBackgroundColor(editingElement.backgroundColor);
    } else {
      setImageData("");
      setSize({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
      setHasBackground(false);
      setBackgroundColor("#ffffff");
    }
  }, [editingElement, open]);

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
    const dataUrl = sigCanvasRef.current.getCanvas().toDataURL("image/png");
    setImageData(dataUrl.replace(/^data:image\/png;base64,/, ""));
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      const base64Data = result.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
      
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        let newWidth = DEFAULT_WIDTH;
        let newHeight = newWidth / aspectRatio;
        if (newHeight > 150) { newHeight = 150; newWidth = newHeight * aspectRatio; }
        setSize({ width: newWidth, height: newHeight });
        setImageData(base64Data);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="absolute bg-card-bg border border-border rounded-lg shadow-lg p-4 z-20 theme-transition"
      style={{
        top: position.y,
        left: position.x,
        width: 360,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-medium text-text mb-2 theme-transition">서명 편집</h3>
      
      <div className="flex border-b border-border mb-4">
        <button
          onClick={() => setTab(0)}
          className={`flex-1 py-2 px-4 text-sm font-medium theme-transition ${
            tab === 0
              ? 'border-b-2 border-primary text-primary'
              : 'text-button-text hover:text-text'
          }`}
        >
          그리기
        </button>
        <button
          onClick={() => setTab(1)}
          className={`flex-1 py-2 px-4 text-sm font-medium theme-transition ${
            tab === 1
              ? 'border-b-2 border-primary text-primary'
              : 'text-button-text hover:text-text'
          }`}
        >
          업로드
        </button>
      </div>

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
            지우기
          </button>
        </div>
      )}

      {tab === 1 && (
        <div className="mb-4 p-4 border-2 border-dashed border-border rounded text-center">
          <label className="px-4 py-2 rounded-md border border-border bg-card-bg hover:bg-button-hover text-text theme-transition cursor-pointer">
            파일 선택
            <input type="file" hidden accept="image/png,image/jpeg" onChange={handleUpload} />
          </label>
        </div>
      )}
      
      {imageData && (
        <>
          <div className="mb-4">
            <label className="panel-label">미리보기 및 크기 조절</label>
            <div
              className="p-2 border border-border flex justify-center items-center mb-2 min-h-[100px] rounded theme-transition"
              style={{ backgroundColor: hasBackground ? backgroundColor : 'transparent' }}
            >
              <img
                src={`data:image/png;base64,${imageData}`}
                alt="signature-preview"
                style={{ width: size.width, height: size.height, objectFit: 'contain' }}
              />
            </div>
            
            <label className="panel-label">너비: {Math.round(size.width)}px</label>
            <input
              type="range"
              min={50}
              max={400}
              value={size.width}
              onChange={e => setSize({ ...size, width: Number(e.target.value)})}
              className="w-full mb-2 theme-transition"
            />
            
            <label className="panel-label">높이: {Math.round(size.height)}px</label>
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
              배경 사용
            </label>
          </div>

          {hasBackground && (
            <div className="mb-4">
              <label className="panel-label">배경 색상: <strong>{backgroundColor}</strong></label>
              <HexColorPicker color={backgroundColor} onChange={setBackgroundColor} style={{width: '100%', height: 120}}/>
            </div>
          )}
        </>
      )}

      <div className="flex gap-2 justify-end mt-4">
        <button
          onClick={onClose}
          className="px-3 py-2 rounded-md border border-border bg-card-bg hover:bg-button-hover text-text theme-transition"
        >
          취소
        </button>
        <button
          onClick={() => onSubmit(imageData, size.width, size.height, hasBackground, backgroundColor)}
          disabled={!imageData}
          className="px-3 py-2 rounded-md bg-primary hover:bg-primary-hover text-white theme-transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          확인
        </button>
      </div>
    </div>
  );
};

export default SignatureEditTool;