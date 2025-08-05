// --- components/TextEditTool.tsx ---

import React, { useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { PDFTextElement } from "../contexts/PDFEditContext";

type TextEditToolProps = {
  open: boolean;
  position: { x: number; y: number } | null;
  editingElement: PDFTextElement | null;
  onClose: () => void;
  // [수정] onSubmit 콜백에 hasBackground, backgroundColor 파라미터 추가
  onSubmit: (text: string, fontSize: number, color: string, hasBackground: boolean, backgroundColor: string) => void;
};

const TextEditTool = ({ open, position, editingElement, onClose, onSubmit }: TextEditToolProps) => {
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(20);
  const [color, setColor] = useState("#222222");
  // [추가] 배경 관련 상태 추가
  const [hasBackground, setHasBackground] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");

  useEffect(() => {
    if (editingElement) {
      setText(editingElement.text);
      setFontSize(editingElement.fontSize);
      setColor(editingElement.color);
      // [추가] editingElement에서 배경 속성 로드
      setHasBackground(editingElement.hasBackground);
      setBackgroundColor(editingElement.backgroundColor);
    } else {
      // Reset
      setText("");
      setFontSize(20);
      setColor("#222222");
      setHasBackground(false);
      setBackgroundColor("#ffffff");
    }
  }, [editingElement, open]);

  if (!open || !position) return null;

  return (
    <div
      className="absolute bg-card-bg border border-border rounded-lg shadow-lg p-4 z-20 theme-transition"
      style={{
        top: position.y,
        left: position.x,
        width: 300,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-medium text-text mb-4 theme-transition">텍스트 편집</h3>
      
      <div className="mb-4">
        <textarea
          placeholder="텍스트 내용"
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full form-input resize-none"
          rows={2}
          autoFocus
        />
      </div>

      <div className="mb-4">
        <label className="panel-label">폰트 크기: <strong>{fontSize}px</strong></label>
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
        <label className="panel-label">글자 색상: <strong>{color}</strong></label>
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
          배경 사용
        </label>
      </div>

      {hasBackground && (
        <div className="mb-4">
          <label className="panel-label">배경 색상: <strong>{backgroundColor}</strong></label>
          <HexColorPicker color={backgroundColor} onChange={setBackgroundColor} style={{width: '100%', height: 120}}/>
        </div>
      )}
      
      <div className="flex gap-2 justify-end mt-6">
        <button
          onClick={onClose}
          className="px-3 py-2 rounded-md border border-border bg-card-bg hover:bg-button-hover text-text theme-transition"
        >
          취소
        </button>
        <button
          onClick={() => onSubmit(text, fontSize, color, hasBackground, backgroundColor)}
          disabled={!text.trim()}
          className="px-3 py-2 rounded-md bg-primary hover:bg-primary-hover text-white theme-transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          확인
        </button>
      </div>
    </div>
  );
};

export default TextEditTool;