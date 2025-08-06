// --- components/SignatureEditTool.tsx ---

import React, { useRef, useState, useEffect, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { HexColorPicker } from "react-colorful";
import { PDFSignatureElement } from "../contexts/PDFEditContext";
import { useTranslation } from "react-i18next";
import debounce from 'lodash.debounce';
import Typography from "@mui/material/Typography";

type SignatureEditToolProps = {
  editingElement: PDFSignatureElement;
  onUpdate: (data: Partial<PDFSignatureElement>) => void;
};

const DEFAULT_WIDTH = 200;

const SignatureEditTool = ({ editingElement, onUpdate }: SignatureEditToolProps) => {
  const [tab, setTab] = useState(0);
  const [imageData, setImageData] = useState<string>("");
  const [size, setSize] = useState({ width: editingElement.width, height: editingElement.height });
  const [hasBackground, setHasBackground] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const { t } = useTranslation("editor");

  const debouncedUpdate = useCallback(debounce((data: Partial<PDFSignatureElement>) => onUpdate(data), 300), [onUpdate]);

  useEffect(() => {
    if (editingElement) {
      if (editingElement.imageData) {
        setImageData(`data:image/png;base64,${editingElement.imageData}`);
      } else {
        setImageData("");
      }
      setSize({ width: editingElement.width, height: editingElement.height });
      setHasBackground(editingElement.hasBackground);
      setBackgroundColor(editingElement.backgroundColor);
    }
  }, [editingElement]);

  useEffect(() => {
    // [핵심 수정] 초기 상태와 현재 상태가 동일하면 업데이트를 방지합니다.
    const base64Data = imageData.split(',')[1] || "";
    if (
        editingElement.imageData === base64Data &&
        editingElement.width === size.width &&
        editingElement.height === size.height &&
        editingElement.hasBackground === hasBackground &&
        editingElement.backgroundColor === backgroundColor
    ) {
        return;
    }
    
    debouncedUpdate({ imageData: base64Data, width: size.width, height: size.height, hasBackground, backgroundColor });
    
    return () => {
      debouncedUpdate.cancel();
    }
  }, [imageData, size, hasBackground, backgroundColor, debouncedUpdate, editingElement]);
  
  const handleClear = () => {
    if (sigCanvasRef.current) {
        sigCanvasRef.current.clear();
    }
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
    // ... (JSX는 기존과 동일)
    <div className="w-full flex flex-col h-full">
      <div className="flex border-b border-border mb-4">
        <button onClick={() => setTab(0)} className={`flex-1 py-2 px-4 text-sm font-medium theme-transition ${tab === 0 ? 'border-b-2 border-primary text-primary' : 'text-button-text hover:text-text'}`}>{t("draw")}</button>
        <button onClick={() => setTab(1)} className={`flex-1 py-2 px-4 text-sm font-medium theme-transition ${tab === 1 ? 'border-b-2 border-primary text-primary' : 'text-button-text hover:text-text'}`}>{t("upload")}</button>
      </div>

      <div className="flex-grow space-y-4">
          {tab === 0 && (
            <div className="flex flex-col items-center">
              <div className="border-2 border-dashed border-border rounded overflow-hidden w-full">
                <SignatureCanvas ref={sigCanvasRef} penColor="black" canvasProps={{ className: "w-full h-[150px]"}} onEnd={handleSaveDraw} />
              </div>
              <button onClick={handleClear} className="mt-2 px-3 py-1 text-sm rounded-md border border-border bg-card-bg hover:bg-button-hover text-text theme-transition">{t("clear")}</button>
            </div>
          )}

          {tab === 1 && (
            <div className="p-4 border-2 border-dashed border-border rounded text-center">
              <label className="px-4 py-2 rounded-md border border-border bg-card-bg hover:bg-button-hover text-text theme-transition cursor-pointer">
                {t("uploadImage")}
                <input type="file" hidden accept="image/png,image/jpeg" onChange={handleUpload} />
              </label>
            </div>
          )}
          
          <div className="mt-4">
            <label className="panel-label">{t("preview")}</label>
            <div className="p-2 border border-border flex justify-center items-center mb-2 min-h-[100px] rounded theme-transition" style={{ backgroundColor: hasBackground ? backgroundColor : 'transparent' }}>
              {imageData ? (
                <img src={imageData} alt="signature-preview" style={{ width: size.width, height: size.height, objectFit: 'contain' }} />
              ) : (
                <Typography sx={{ color: '#999', fontSize: '12px' }}>{t("previewArea")}</Typography>
              )}
            </div>
            <label className="panel-label">{t("width")}: {Math.round(size.width)}px</label>
            <input type="range" min={50} max={400} value={size.width} onChange={e => setSize(s => ({ ...s, width: Number(e.target.value) }))} className="w-full mb-2 theme-transition" />
            <label className="panel-label">{t("height")}: {Math.round(size.height)}px</label>
            <input type="range" min={20} max={300} value={size.height} onChange={e => setSize(s => ({ ...s, height: Number(e.target.value) }))} className="w-full theme-transition" />
          </div>

          <hr className="border-border my-4" />
          <div>
            <label className="flex items-center gap-2 text-text theme-transition">
              <input type="checkbox" checked={hasBackground} onChange={e => setHasBackground(e.target.checked)} className="theme-transition" />
              {t("background")}
            </label>
          </div>

          {hasBackground && (
            <div>
              <label className="panel-label">{t("backgroundColor")}: <strong>{backgroundColor}</strong></label>
              <HexColorPicker color={backgroundColor} onChange={setBackgroundColor} style={{width: '100%', height: 120}}/>
            </div>
          )}
      </div>
    </div>
  );
};

export default SignatureEditTool;