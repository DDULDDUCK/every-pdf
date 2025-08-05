// --- components/PDFViewer.tsx ---

import React, { useMemo, forwardRef, useImperativeHandle } from "react";
import {
    Worker,
    Viewer,
    SpecialZoomLevel,
    PageChangeEvent,
    DocumentLoadEvent,
} from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import { usePDFEdit, PDFEditElement } from "../contexts/PDFEditContext";
import { Box, Typography } from "@mui/material";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { editingCanvasPlugin } from './EditingCanvasPlugin';

// [개선] Props 타입 정의 변경
type PDFViewerProps = {
  onEditElement: (element: PDFEditElement) => void;
  onPlaceElement: (type: 'text' | 'signature' | 'checkbox', page: number, x: number, y: number) => void;
  onCancelPlaceElement: () => void;
};

export type PDFViewerHandle = {
    jumpToElement: (element: PDFEditElement) => void;
};

// [수정] forwardRef의 props 타입 변경
const PDFViewer = forwardRef<PDFViewerHandle, PDFViewerProps>(({ onEditElement, onPlaceElement, onCancelPlaceElement }, ref) => {
  const { state, setCurrentPage, setNumPages } = usePDFEdit();
  
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  // [수정] memoizedEditingCanvasPlugin에 새로운 props 전달
  const memoizedEditingCanvasPlugin = useMemo(() => {
    return editingCanvasPlugin({
      onEditElement,
      onPlaceElement,
      onCancelPlaceElement
    });
  }, [onEditElement, onPlaceElement, onCancelPlaceElement]);
  
  // [개선] DOM API를 사용하여 스크롤하는 방식으로 변경 (더 안정적)
  useImperativeHandle(ref, () => ({
    jumpToElement: (element) => {
        const pageSelector = `.rpv-core__page-layer[data-page-index="${element.page - 1}"]`;
        const pageElement = document.querySelector(pageSelector);

        if (pageElement) {
            pageElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }
    }
  }));

  const handleDocumentLoad = (e: DocumentLoadEvent) => {
    setNumPages(e.doc.numPages);
    setCurrentPage(1);
  };

  return (
    <Box sx={{ flex: 1, height: "100%", borderRight: "1px solid #ddd", position: "relative" }}>
      {!state.pdfUrl ? (
        <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#888", background: '#f4f4f5' }}>
          <UploadFileIcon sx={{ fontSize: 60, mb: 2 }}/>
          <Typography variant="h6" sx={{ mb: 2 }}>PDF 파일을 열어주세요.</Typography>
          <Typography variant="body2">왼쪽 상단 'PDF 열기' 버튼을 클릭하세요.</Typography>
        </Box>
      ) : (
        <Worker workerUrl="/static/pdf.worker.min.js">
          <Viewer
            fileUrl={state.pdfUrl}
            plugins={[defaultLayoutPluginInstance, memoizedEditingCanvasPlugin]}
            defaultScale={SpecialZoomLevel.PageFit}
            onPageChange={(e: PageChangeEvent) => setCurrentPage(e.currentPage + 1)}
            onDocumentLoad={handleDocumentLoad}
          />
        </Worker>
      )}
    </Box>
  );
});

PDFViewer.displayName = 'PDFViewer';

export default PDFViewer;