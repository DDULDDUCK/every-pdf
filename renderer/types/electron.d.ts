// renderer/types/renderer.d.ts (또는 프로젝트의 다른 .d.ts 파일)

// 다른 파일에서 PDFEditElement 등을 import 할 수 있도록 export 추가
export {};

declare global {
  // PDF 편집 요소 타입을 여기서도 참조할 수 있도록 정의
  // (또는 별도 파일에서 import 해오는 것이 더 좋음)
  type PDFTextElement = { id: string; type: 'text'; /* ... */ };
  type PDFSignatureElement = { id:string; type: 'signature'; /* ... */ };
  type PDFCheckboxElement = { id: string; type: 'checkbox'; /* ... */ };
  type PDFEditElement = PDFTextElement | PDFSignatureElement | PDFCheckboxElement;

  interface Window {
    electron: {
      pdf: {
        /**
         * PDF 파일을 편집 요소(텍스트, 서명 등)를 추가하여 수정
         * @param file 원본 PDF 파일
         * @param elements 편집 요소 객체의 배열
         * @returns 편집된 PDF 파일의 Blob
         */
        editPdf: (file: File, elements: PDFEditElement[]) => Promise<Blob>;

        /**
         * PDF 파일을 지정된 페이지들로 분할
         * @param file PDF 파일
         * @param pages 페이지 범위 문자열 (예: "1-3,5,7-9")
         * @returns 분할된 PDF 파일의 Blob
         */
        splitPdf: (file: File, pages: string) => Promise<Blob>;

        /**
         * 여러 PDF 파일을 하나로 병합
         * @param files PDF 파일 배열
         * @returns 병합된 PDF 파일의 Blob
         */
        mergePdfs: (files: File[]) => Promise<Blob>;

        /**
         * PDF 페이지 회전
         * @param file PDF 파일
         * @param pages 회전할 페이지 범위 (예: "1-3,5,7-9" 또는 "all")
         * @param angle 회전 각도 (90, 180, 270)
         * @param includeUnspecified 지정하지 않은 페이지 포함 여부
         * @returns 회전된 PDF 파일의 Blob
         */
        rotatePdf: (file: File, pages: string, angle: number, includeUnspecified: boolean) => Promise<Blob>;

        /**
         * 다른 형식의 파일을 PDF로 변환
         * @param files 변환할 파일들 (TXT, HTML, 또는 이미지)
         * @param sourceFormat 원본 파일 형식 ('txt', 'html', 또는 'image')
         * @returns 변환된 PDF 파일의 Blob
         */
        convertToPdf: (files: File[], sourceFormat: 'txt' | 'html' | 'image') => Promise<Blob>;

        /**
         * PDF를 다른 형식으로 변환
         * @param file PDF 파일
         * @param targetFormat 변환할 형식 ('docx' 또는 'image')
         * @param imageFormat 이미지 형식 ('jpg' 또는 'png', targetFormat이 'image'일 때만 사용)
         * @param outputPath (선택) DOCX 변환 시 저장할 경로
         * @returns 변환된 파일의 Blob
         */
        convertFromPdf: (file: File, targetFormat: 'docx' | 'image', imageFormat?: 'jpg' | 'png', outputPath?: string) => Promise<Blob>;
                
        /**
         * PDF 파일 암호화
         * @param file PDF 파일
         * @param password 암호화에 사용할 비밀번호
         * @returns 암호화된 PDF 파일의 Blob
         */
        encryptPdf: (file: File, password: string) => Promise<Blob>;
        
        /**
         * PDF 파일 복호화
         * @param file 암호화된 PDF 파일
         * @param password 복호화를 위한 비밀번호
         * @returns 복호화된 PDF 파일의 Blob
         */
        decryptPdf: (file: File, password: string) => Promise<Blob>;
        
        /**
         * PDF에 워터마크 추가
         * @param file 원본 PDF 파일
         * @param options 워터마크 옵션
         * @returns 워터마크가 적용된 PDF 파일의 Blob
         */
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
            fontName?: 'NotoSansKR';
            fontColor?: string;
            fontBold?: boolean;
            pages: string;
          }
        ) => Promise<Blob>;
      };

      /**
       * 네이티브 파일 저장 대화상자를 열고, 전달된 데이터를 파일로 저장
       * @param options Electron SaveDialogOptions
       * @param data 저장할 파일 데이터 (Uint8Array)
       * @returns 저장 성공 시 파일 경로, 취소 또는 실패 시 null
       */
      saveFile: (options: Electron.SaveDialogOptions, data: Uint8Array) => Promise<string | null>;
    };
    
    // api 객체에 대한 타입 정의
    api: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
        removeListener: (channel: string, listener: (...args: any[]) => void) => void;
    };
  }
}