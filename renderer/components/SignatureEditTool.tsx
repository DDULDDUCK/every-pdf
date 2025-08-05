// --- components/SignatureEditTool.tsx ---

import React, { useRef, useState, useEffect } from "react";
import { Box, Button, Slider, Tabs, Tab, Typography, Switch, FormControlLabel, Divider } from "@mui/material";
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
    <Box sx={{ position: "absolute", top: position.y, left: position.x, width: 360, background: "#fff", border: "1px solid #ddd", borderRadius: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", p: 2, zIndex: 20 }} onClick={(e) => e.stopPropagation()} >
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>서명 편집</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="fullWidth">
        <Tab label="그리기" />
        <Tab label="업로드" />
      </Tabs>
      {tab === 0 && (
        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ border: "1px dashed #bbb", borderRadius: 1, overflow: 'hidden' }}>
            <SignatureCanvas ref={sigCanvasRef} penColor="black" canvasProps={{ width: 320, height: 150 }} onEnd={handleSaveDraw} />
          </Box>
          <Button size="small" onClick={handleClear} sx={{mt: 1}}>지우기</Button>
        </Box>
      )}
      {tab === 1 && (
        <Box sx={{ mb: 2, p: 2, border: '1px dashed #bbb', borderRadius: 1, textAlign: 'center' }}>
          <Button variant="outlined" component="label">파일 선택<input type="file" hidden accept="image/png,image/jpeg" onChange={handleUpload} /></Button>
        </Box>
      )}
      
      {imageData && (
        <>
        <Box sx={{ mb: 2 }}>
          <Typography gutterBottom>미리보기 및 크기 조절</Typography>
          {/* [수정] 미리보기 Box에 배경색 적용 */}
          <Box sx={{ p:1, border: '1px solid #eee', display:'flex', justifyContent:'center', alignItems: 'center', mb: 1, minHeight: 100, backgroundColor: hasBackground ? backgroundColor : 'transparent' }}>
            <img src={`data:image/png;base64,${imageData}`} alt="signature-preview" style={{ width: size.width, height: size.height, objectFit: 'contain' }} />
          </Box>
          <Typography gutterBottom sx={{fontSize: '0.9rem'}}>너비: {Math.round(size.width)}px</Typography>
          <Slider min={50} max={400} value={size.width} onChange={(_, v) => setSize({ ...size, width: Number(v)})} />
          <Typography gutterBottom sx={{fontSize: '0.9rem'}}>높이: {Math.round(size.height)}px</Typography>
          <Slider min={20} max={300} value={size.height} onChange={(_, v) => setSize({ ...size, height: Number(v)})} />
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
        </>
      )}

      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", mt: 2 }}>
        <Button variant="outlined" size="small" onClick={onClose}>취소</Button>
        <Button variant="contained" size="small" onClick={() => onSubmit(imageData, size.width, size.height, hasBackground, backgroundColor)} disabled={!imageData}>확인</Button>
      </Box>
    </Box>
  );
};

export default SignatureEditTool;