// --- components/TextEditTool.tsx ---

import React, { useState, useEffect } from "react";
import { Box, Button, TextField, Slider, Typography, Switch, FormControlLabel, Divider } from "@mui/material";
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
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>텍스트 편집</Typography>
      <TextField
        label="텍스트 내용"
        value={text}
        onChange={e => setText(e.target.value)}
        fullWidth multiline rows={2} size="small" sx={{ mb: 2 }} autoFocus
      />
      <Box sx={{ mb: 2 }}>
        <Typography gutterBottom>폰트 크기: <strong>{fontSize}px</strong></Typography>
        <Slider min={10} max={72} value={fontSize} onChange={(_, v) => setFontSize(Number(v))} valueLabelDisplay="auto" />
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography gutterBottom>글자 색상: <strong>{color}</strong></Typography>
        <HexColorPicker color={color} onChange={setColor} style={{width: '100%', height: 120}}/>
      </Box>

      {/* [추가] 배경 옵션 UI */}
      <Divider sx={{ my: 2 }} />
      <FormControlLabel 
        control={<Switch checked={hasBackground} onChange={e => setHasBackground(e.target.checked)} />} 
        label="배경 사용" 
        sx={{ mb: 1 }}
      />
      {hasBackground && (
        <Box>
            <Typography gutterBottom>배경 색상: <strong>{backgroundColor}</strong></Typography>
            <HexColorPicker color={backgroundColor} onChange={setBackgroundColor} style={{width: '100%', height: 120}}/>
        </Box>
      )}
      
      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", mt: 3 }}>
        <Button variant="outlined" size="small" onClick={onClose}>취소</Button>
        <Button variant="contained" size="small" onClick={() => onSubmit(text, fontSize, color, hasBackground, backgroundColor)} disabled={!text.trim()}>확인</Button>
      </Box>
    </Box>
  );
};

export default TextEditTool;