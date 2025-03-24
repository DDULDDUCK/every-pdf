declare global {
  interface Window {
    electron: {
      pdf: {
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
         * @returns 변환된 파일의 Blob (이미지 변환 시 여러 페이지면 ZIP 파일)
         */
        convertFromPdf: (file: File, targetFormat: 'docx' | 'image', imageFormat?: 'jpg' | 'png') => Promise<Blob>;
      };
    };
  }
}

export {};
