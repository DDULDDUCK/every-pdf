// --- components/EditToolbar.tsx ---

import React from "react";
import { Button, Stack, CircularProgress, Box } from "@mui/material";
import SaveIcon from '@mui/icons-material/Save';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import GestureIcon from '@mui/icons-material/Gesture';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { usePDFEdit } from "../contexts/PDFEditContext";

type EditToolbarProps = {
  // [수정] onAddElement -> onSetPendingElement
  onSetPendingElement: (type: 'text' | 'signature' | 'checkbox') => void;
  onSave: () => void;
  isSaving: boolean;
  onUploadClick: () => void;
};

const EditToolbar = ({ onSetPendingElement, onSave, isSaving, onUploadClick }: EditToolbarProps) => {
  const { state } = usePDFEdit();

  return (
    <Box sx={{ p: 1.5, borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', zIndex: 30 }}>
      <Button variant="contained" onClick={onUploadClick} startIcon={<UploadFileIcon />}>
        PDF 열기
      </Button>
      
      <Stack direction="row" spacing={1}>
        {/* [수정] onClick 핸들러에서 onSetPendingElement 호출 */}
        <Button variant="outlined" onClick={() => onSetPendingElement('text')} startIcon={<TextFieldsIcon />} disabled={!state.pdfFile}>텍스트</Button>
        <Button variant="outlined" onClick={() => onSetPendingElement('signature')} startIcon={<GestureIcon />} disabled={!state.pdfFile}>서명</Button>
        <Button variant="outlined" onClick={() => onSetPendingElement('checkbox')} startIcon={<CheckBoxOutlineBlankIcon />} disabled={!state.pdfFile}>체크박스</Button>
      </Stack>

      <Button 
        variant="contained" 
        color="primary" 
        onClick={onSave} 
        disabled={isSaving || !state.pdfFile} 
        startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
      >
        {isSaving ? "PDF 생성 중..." : "저장"}
      </Button>
    </Box>
  );
};

export default EditToolbar;