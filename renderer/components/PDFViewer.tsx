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
import { useTranslation } from "react-i18next";

// [수정] onDeselect prop 추가
type PDFViewerProps = {
  onEditElement: (element: PDFEditElement) => void;
  onPlaceElement: (type: 'text' | 'signature' | 'checkbox', page: number, x: number, y: number) => void;
  onCancelPlaceElement: () => void;
  onUploadClick: () => void;
  onDeselect: () => void;
};

export type PDFViewerHandle = {
    jumpToElement: (element: PDFEditElement) => void;
};

// [수정] forwardRef의 props 타입 변경
const PDFViewer = forwardRef<PDFViewerHandle, PDFViewerProps>(({ onEditElement, onPlaceElement, onCancelPlaceElement, onUploadClick, onDeselect }, ref) => {
  const { state, setCurrentPage, setNumPages, setSelectedElementId } = usePDFEdit();
  const { t } = useTranslation("editor");
  
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  // [수정] memoizedEditingCanvasPlugin에 onDeselect 전달
  const memoizedEditingCanvasPlugin = useMemo(() => {
    return editingCanvasPlugin({
      onEditElement,
      onPlaceElement,
      onCancelPlaceElement,
      onDeselect
    });
  }, [onEditElement, onPlaceElement, onCancelPlaceElement, onDeselect]);
  
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
  
  // PDF가 없을 때의 화면은 변경 없음

  return (
    <div className="flex-1 h-full bg-app-bg relative theme-transition" onClick={(e) => {
        // 뷰어 배경 클릭 시 선택 해제
        if (e.target === e.currentTarget) {
            setSelectedElementId(null);
        }
    }}>
      {!state.pdfUrl ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-panel-bg theme-transition relative overflow-hidden">
            {/* ... PDF 없을 때의 UI (기존과 동일) ... */}
            <div className="absolute inset-0 opacity-5">
            <div className="w-full h-full" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
          
          <div className="relative z-10 flex flex-col items-center justify-center text-center w-full h-full px-8 py-12">
            <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto">
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
              <h1 className="text-4xl font-bold text-text mb-6 theme-transition">
                {t("startTitle")}
              </h1>
              <p className="text-lg text-button-text mb-12 leading-relaxed theme-transition max-w-xl">
                <span className="text-primary font-semibold cursor-pointer" onClick={onUploadClick}>{t("startDesc").split("<icon>")[1]?.split("</icon>")[0] || t("openPdf")}</span>
                {t("startDesc").replace(/<icon>.*?<\/icon>/, "")}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 w-full max-w-4xl">
                <div className="flex flex-col items-center text-center p-6 bg-card-bg rounded-lg border border-border shadow-sm theme-transition">
                  <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-lg font-bold mb-4">1</div>
                  <h3 className="text-lg font-semibold text-text mb-2 theme-transition">{t("step1Title")}</h3>
                  <p className="text-sm text-button-text theme-transition">{t("step1Desc")}</p>
                </div>
                
                <div className="flex flex-col items-center text-center p-6 bg-card-bg rounded-lg border border-border shadow-sm theme-transition">
                  <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-lg font-bold mb-4">2</div>
                  <h3 className="text-lg font-semibold text-text mb-2 theme-transition">{t("step2Title")}</h3>
                  <p className="text-sm text-button-text theme-transition">{t("step2Desc")}</p>
                </div>
                
                <div className="flex flex-col items-center text-center p-6 bg-card-bg rounded-lg border border-border shadow-sm theme-transition">
                  <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-lg font-bold mb-4">3</div>
                  <h3 className="text-lg font-semibold text-text mb-2 theme-transition">{t("step3Title")}</h3>
                  <p className="text-sm text-button-text theme-transition">{t("step3Desc")}</p>
                </div>
              </div>
            </div>
            <div className="text-sm text-button-text opacity-75 theme-transition">
              {t("bottomInfo")}
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