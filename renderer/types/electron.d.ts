interface Window {
  electron: {
    pdf: {
      splitPdf: (file: File, pages: string) => Promise<Blob>;
      mergePdfs: (files: File[]) => Promise<Blob>;
      rotatePdf: (
        file: File,
        pages: string,
        angle: number,
        includeUnspecified: boolean
      ) => Promise<Blob>;
      convertToPdf: (
        files: File[],
        sourceFormat: 'txt' | 'html' | 'image'
      ) => Promise<Blob>;
      convertFromPdf: (
        file: File,
        targetFormat: 'docx' | 'image',
        imageFormat?: 'jpg' | 'png',
        outputPath?: string // 저장 경로 추가
      ) => Promise<Blob>;
      addWatermark: (
        file: File,
        options: {
          watermarkType: 'text' | 'image';
          watermarkText?: string;
          watermarkImage?: File;
          opacity: number;
          rotation: number;
          position: 'center' | 'tile' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
          fontSize?: number;
          fontName?: 'NotoSansKR'; // 옵션으로 유지하되 NotoSansKR만 가능하도록 제한
          fontColor?: string;
          pages: string;
        }
      ) => Promise<Blob>;
      encryptPdf: (
        file: File,
        password: string,
      ) => Promise<Blob>;
      decryptPdf: (
        file: File,
        password: string
      ) => Promise<Blob>;
    };
    // 파일 저장 대화상자 함수 추가
    showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
  };
}