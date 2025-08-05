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
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { editingCanvasPlugin } from './EditingCanvasPlugin';

// [개선] Props 타입 정의 변경
type PDFViewerProps = {
  onEditElement: (element: PDFEditElement) => void;
  onPlaceElement: (type: 'text' | 'signature' | 'checkbox', page: number, x: number, y: number) => void;
  onCancelPlaceElement: () => void;
  onUploadClick: () => void;
};

export type PDFViewerHandle = {
    jumpToElement: (element: PDFEditElement) => void;
};

// [수정] forwardRef의 props 타입 변경
const PDFViewer = forwardRef<PDFViewerHandle, PDFViewerProps>(({ onEditElement, onPlaceElement, onCancelPlaceElement, onUploadClick }, ref) => {
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
    <div className="flex-1 h-full border-r border-border relative theme-transition">
      {!state.pdfUrl ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-panel-bg theme-transition relative overflow-hidden">
          {/* 배경 패턴 */}
          <div className="absolute inset-0 opacity-5">
            <div className="w-full h-full" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
          
          {/* 메인 콘텐츠 - 화면 꽉 차게 */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center w-full h-full px-8 py-12">
            {/* 상단 여백 */}
            <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto">
              {/* 아이콘과 애니메이션 - 클릭 가능 */}
              <div className="relative mb-12">
                <div className="absolute inset-0 bg-primary opacity-10 rounded-full animate-pulse w-32 h-32"></div>
                <button
                  onClick={onUploadClick}
                  className="group relative bg-card-bg rounded-full p-8 shadow-lg border border-border w-32 h-32 flex items-center justify-center hover:bg-primary hover:border-primary transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer"
                >
                  <UploadFileIcon
                    style={{ fontSize: 64 }}
                    className="text-primary group-hover:text-white animate-bounce group-hover:animate-pulse transition-colors duration-300"
                  />
                </button>
              </div>
              
              {/* 제목 */}
              <h1 className="text-4xl font-bold text-text mb-6 theme-transition">
                PDF 편집을 시작하세요
              </h1>
              
              {/* 설명 */}
              <p className="text-lg text-button-text mb-12 leading-relaxed theme-transition max-w-xl">
                <span className="text-primary font-semibold cursor-pointer" onClick={onUploadClick}>위의 아이콘을 클릭</span>하거나 상단 버튼을 눌러 PDF 파일을 업로드하세요. 텍스트, 서명, 체크박스를 추가하고 편집할 수 있습니다.
              </p>
              
              {/* 단계별 안내 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 w-full max-w-4xl">
                <div className="flex flex-col items-center text-center p-6 bg-card-bg rounded-lg border border-border shadow-sm theme-transition">
                  <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-lg font-bold mb-4">1</div>
                  <h3 className="text-lg font-semibold text-text mb-2 theme-transition">PDF 열기</h3>
                  <p className="text-sm text-button-text theme-transition">상단의 'PDF 열기' 버튼을 클릭하세요</p>
                </div>
                
                <div className="flex flex-col items-center text-center p-6 bg-card-bg rounded-lg border border-border shadow-sm theme-transition">
                  <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-lg font-bold mb-4">2</div>
                  <h3 className="text-lg font-semibold text-text mb-2 theme-transition">파일 선택</h3>
                  <p className="text-sm text-button-text theme-transition">편집할 PDF 파일을 선택하세요</p>
                </div>
                
                <div className="flex flex-col items-center text-center p-6 bg-card-bg rounded-lg border border-border shadow-sm theme-transition">
                  <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-lg font-bold mb-4">3</div>
                  <h3 className="text-lg font-semibold text-text mb-2 theme-transition">편집 시작</h3>
                  <p className="text-sm text-button-text theme-transition">도구를 선택하여 편집을 시작하세요</p>
                </div>
              </div>
            </div>
            
            {/* 하단 정보 */}
            <div className="text-sm text-button-text opacity-75 theme-transition">
              지원 형식: PDF | 안전한 로컬 처리 | 파일이 서버에 업로드되지 않습니다
            </div>
          </div>
        </div>
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
    </div>
  );
});

PDFViewer.displayName = 'PDFViewer';

export default PDFViewer;