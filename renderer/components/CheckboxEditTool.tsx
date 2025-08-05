// --- components/CheckboxEditTool.tsx ---

import React, { useState, useEffect } from "react";
import { Box, Button, Slider, Switch, Typography, FormControlLabel } from "@mui/material";
import { HexColorPicker } from "react-colorful";
import { PDFCheckboxElement } from "../contexts/PDFEditContext";

type CheckboxEditToolProps = {
  open: boolean;
  position: { x: number; y: number } | null;
  editingElement: PDFCheckboxElement | null;
  onClose: () => void;
  // [수정] onSubmit 콜백에 isTransparent, hasBorder 파라미터 추가
  onSubmit: (checked: boolean, size: number, color: string, borderColor: string, isTransparent: boolean, hasBorder: boolean) => void;
};

const DEFAULT_SIZE = 18;
const DEFAULT_COLOR = "#ffffff";
const DEFAULT_BORDER = "#000000";

const CheckboxEditTool = ({ open, position, editingElement, onClose, onSubmit }: CheckboxEditToolProps) => {
  const [checked, setChecked] = useState(false);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [borderColor, setBorderColor] = useState(DEFAULT_BORDER);
  // [추가] isTransparent, hasBorder 상태 추가
  const [isTransparent, setIsTransparent] = useState(false);
  const [hasBorder, setHasBorder] = useState(true);

  useEffect(() => {
    if (editingElement) {
      setChecked(editingElement.checked);
      setSize(editingElement.size);
      setColor(editingElement.color);
      setBorderColor(editingElement.borderColor);
      // [추가] editingElement에서 새로운 속성 로드
      setIsTransparent(editingElement.isTransparent);
      setHasBorder(editingElement.hasBorder);
    } else {
      setChecked(false);
      setSize(DEFAULT_SIZE);
      setColor(DEFAULT_COLOR);
      setBorderColor(DEFAULT_BORDER);
      // [추가] 기본값 설정
      setIsTransparent(false);
      setHasBorder(true);
    }
  }, [editingElement, open]);

  if (!open || !position) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        top: position.y,
        left: position.x,
        width: 300,
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 2,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        p: 2,
        zIndex: 20,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>체크박스 편집</Typography>
      
      <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
        <FormControlLabel control={<Switch checked={checked} onChange={e => setChecked(e.target.checked)} />} label="체크 상태" />
        {/* [수정] 미리보기에 isTransparent, hasBorder 속성 반영 */}
        <Box sx={{border: '1px solid #ccc', p: 1, borderRadius: 1}}>
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
        </Box>
      </Box>

      {/* [추가] 투명도 및 테두리 제어 UI */}
      <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2 }}>
        <FormControlLabel control={<Switch checked={isTransparent} onChange={e => setIsTransparent(e.target.checked)} />} label="배경 투명" />
        <FormControlLabel control={<Switch checked={hasBorder} onChange={e => setHasBorder(e.target.checked)} />} label="테두리 표시" />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography gutterBottom>크기: <strong>{size}px</strong></Typography>
        <Slider min={10} max={50} value={size} onChange={(_, v) => setSize(Number(v))} />
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
            <Typography gutterBottom>채우기: <strong>{isTransparent ? '투명' : color}</strong></Typography>
            <HexColorPicker color={color} onChange={setColor} style={{width: '100%', height: 100, pointerEvents: isTransparent ? 'none' : 'auto', opacity: isTransparent ? 0.5 : 1}} />
        </Box>
        <Box sx={{ flex: 1 }}>
            <Typography gutterBottom>테두리: <strong>{hasBorder ? borderColor : '없음'}</strong></Typography>
            <HexColorPicker color={borderColor} onChange={setBorderColor} style={{width: '100%', height: 100, pointerEvents: !hasBorder ? 'none' : 'auto', opacity: !hasBorder ? 0.5 : 1}} />
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", mt: 3 }}>
        <Button variant="outlined" size="small" onClick={onClose}>취소</Button>
        {/* [수정] onSubmit 콜백에 isTransparent, hasBorder 값 전달 */}
        <Button variant="contained" size="small" onClick={() => onSubmit(checked, size, color, borderColor, isTransparent, hasBorder)}>확인</Button>
      </Box>
    </Box>
  );
};

export default CheckboxEditTool;