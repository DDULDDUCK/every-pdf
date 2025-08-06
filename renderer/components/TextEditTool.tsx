// --- components/TextEditTool.tsx ---

import React, { useState, useEffect, useCallback } from "react";
import { HexColorPicker } from "react-colorful";
import { PDFTextElement } from "../contexts/PDFEditContext";
import { useTranslation } from "react-i18next";
import debounce from 'lodash.debounce';

type TextEditToolProps = {
  editingElement: PDFTextElement;
  onUpdate: (data: Partial<PDFTextElement>) => void;
};

const TextEditTool = ({ editingElement, onUpdate }: TextEditToolProps) => {
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(20);
  const [color, setColor] = useState("#222222");
  const [hasBackground, setHasBackground] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const { t } = useTranslation("editor");

  const debouncedUpdate = useCallback(debounce((data: Partial<PDFTextElement>) => onUpdate(data), 300), [onUpdate]);

  useEffect(() => {
    if (editingElement) {
      setText(editingElement.text);
      setFontSize(editingElement.fontSize);
      setColor(editingElement.color);
      setHasBackground(editingElement.hasBackground);
      setBackgroundColor(editingElement.backgroundColor);
    }
  }, [editingElement]);

  useEffect(() => {
    if (editingElement.text === text && editingElement.fontSize === fontSize && editingElement.color === color && editingElement.hasBackground === hasBackground && editingElement.backgroundColor === backgroundColor) {
        return;
    }
    debouncedUpdate({ text, fontSize, color, hasBackground, backgroundColor });
    
    return () => {
        debouncedUpdate.cancel();
    }
  }, [text, fontSize, color, hasBackground, backgroundColor, debouncedUpdate, editingElement]);

  return (
    <div className="w-full flex flex-col h-full space-y-4">
      <div>
        <label className="panel-label">{t("text")}</label>
        <textarea
          placeholder={t("textPlaceholder")}
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full form-input resize-none"
          rows={3}
          autoFocus
        />
      </div>
      <div>
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
      <div>
        <label className="panel-label">{t("fontColor")}: <strong>{color}</strong></label>
        <HexColorPicker color={color} onChange={setColor} style={{width: '100%', height: 120}}/>
      </div>
      <hr className="border-border my-4" />
      <div>
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
        <div>
          <label className="panel-label">{t("backgroundColor")}: <strong>{backgroundColor}</strong></label>
          <HexColorPicker color={backgroundColor} onChange={setBackgroundColor} style={{width: '100%', height: 120}}/>
        </div>
      )}
    </div>
  );
};

export default TextEditTool;