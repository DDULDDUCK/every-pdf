// --- components/CheckboxEditTool.tsx ---

import React, { useState, useEffect, useCallback } from "react";
import { HexColorPicker } from "react-colorful";
import { PDFCheckboxElement } from "../contexts/PDFEditContext";
import { useTranslation } from "react-i18next";
import debounce from 'lodash.debounce';

type CheckboxEditToolProps = {
  editingElement: PDFCheckboxElement;
  onUpdate: (data: Partial<PDFCheckboxElement>) => void;
};

const CheckboxEditTool = ({ editingElement, onUpdate }: CheckboxEditToolProps) => {
  const [checked, setChecked] = useState(false);
  const [size, setSize] = useState(18);
  const [color, setColor] = useState("#ffffff");
  const [borderColor, setBorderColor] = useState("#000000");
  const [isTransparent, setIsTransparent] = useState(false);
  const [hasBorder, setHasBorder] = useState(true);
  const { t } = useTranslation("editor");
  
  const debouncedUpdate = useCallback(debounce((data: Partial<PDFCheckboxElement>) => onUpdate(data), 300), [onUpdate]);

  useEffect(() => {
    if (editingElement) {
      setChecked(editingElement.checked);
      setSize(editingElement.size);
      setColor(editingElement.color);
      setBorderColor(editingElement.borderColor);
      setIsTransparent(editingElement.isTransparent);
      setHasBorder(editingElement.hasBorder);
    }
  }, [editingElement]);

  useEffect(() => {
    debouncedUpdate({ checked, size, color, borderColor, isTransparent, hasBorder });
    return () => {
      debouncedUpdate.cancel();
    }
  }, [checked, size, color, borderColor, isTransparent, hasBorder, debouncedUpdate]);

  return (
    <div className="w-full flex flex-col h-full space-y-4">
        <div className="flex justify-between items-center">
          <label className="flex items-center gap-2 text-text theme-transition">
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="theme-transition" />
            {t("checked")}
          </label>
          <div className="border border-border p-2 rounded bg-app-bg theme-transition">
            <svg width={size} height={size}>
              <rect x={1} y={1} width={size-2} height={size-2} fill={isTransparent ? 'transparent' : color} stroke={hasBorder ? borderColor : 'transparent'} strokeWidth={1.5} rx={2} />
              {checked && <polyline points={`${size*0.2},${size*0.5} ${size*0.45},${size*0.75} ${size*0.8},${size*0.25}`} fill="none" stroke="#000" strokeWidth={size/8} strokeLinecap="round" strokeLinejoin="round"/>}
            </svg>
          </div>
        </div>
        <div className="flex justify-around">
          <label className="flex items-center gap-2 text-text theme-transition">
            <input type="checkbox" checked={isTransparent} onChange={e => setIsTransparent(e.target.checked)} className="theme-transition" />
            {t("transparent")}
          </label>
          <label className="flex items-center gap-2 text-text theme-transition">
            <input type="checkbox" checked={hasBorder} onChange={e => setHasBorder(e.target.checked)} className="theme-transition" />
            {t("showBorder")}
          </label>
        </div>
        <div>
          <label className="panel-label">{t("size")}: <strong>{size}px</strong></label>
          <input type="range" min={10} max={50} value={size} onChange={e => setSize(Number(e.target.value))} className="w-full theme-transition" />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="panel-label">{t("fill")}: <strong>{isTransparent ? t("transparent") : color}</strong></label>
            <HexColorPicker color={color} onChange={setColor} style={{ width: '100%', height: 100, pointerEvents: isTransparent ? 'none' : 'auto', opacity: isTransparent ? 0.5 : 1 }} />
          </div>
          <div className="flex-1">
            <label className="panel-label">{t("border")}: <strong>{hasBorder ? borderColor : t("transparent")}</strong></label>
            <HexColorPicker color={borderColor} onChange={setBorderColor} style={{ width: '100%', height: 100, pointerEvents: !hasBorder ? 'none' : 'auto', opacity: !hasBorder ? 0.5 : 1 }} />
          </div>
        </div>
    </div>
  );
};

export default CheckboxEditTool;