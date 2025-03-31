import { contextBridge, ipcRenderer } from 'electron';

interface PDFResponse {
  data: Blob;
  headers: Headers;
}

const BASE_URL = 'http://localhost';
let PORT: number | null = null;

// 백엔드 서버의 포트를 가져오는 함수
const getBackendPort = async (): Promise<number> => {
  if (PORT) return PORT;
  
  // 포트를 받을 때까지 대기 (최대 30초)
  for (let i = 0; i < 30; i++) {
    const port = await ipcRenderer.invoke('get-backend-port');
    if (port) {
      PORT = port;
      console.log('Backend port received:', port);
      return port;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Backend server not ready (timeout)');
};

// 백엔드 서버로부터의 응답을 처리하는 함수
const handleResponse = async (response: Response): Promise<Blob> => {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
  return response.blob();
};

// PDF 처리 함수들
const pdfApi = {
  splitPdf: async (file: File, pages: string): Promise<Blob> => {
    const port = await getBackendPort();
    console.log('Sending split request to port:', port);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('pages', pages);

    const response = await fetch(`${BASE_URL}:${port}/split`, {
      method: 'POST',
      body: formData,
    });

    return handleResponse(response);
  },

  mergePdfs: async (files: File[]): Promise<Blob> => {
    const port = await getBackendPort();
    console.log('Sending merge request to port:', port);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${BASE_URL}:${port}/merge`, {
      method: 'POST',
      body: formData,
    });

    return handleResponse(response);
  },

  rotatePdf: async (file: File, pages: string, angle: number, includeUnspecified: boolean): Promise<Blob> => {
    const port = await getBackendPort();
    console.log('Sending rotate request to port:', port);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('pages', pages);
    formData.append('angle', angle.toString());
    formData.append('include_unspecified', includeUnspecified.toString());

    const response = await fetch(`${BASE_URL}:${port}/rotate`, {
      method: 'POST',
      body: formData,
    });

    return handleResponse(response);
  },

  convertToPdf: async (files: File[], sourceFormat: 'txt' | 'html' | 'image'): Promise<Blob> => {
    const port = await getBackendPort();
    console.log('Sending convert-to-pdf request to port:', port);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('source_format', sourceFormat);

    const response = await fetch(`${BASE_URL}:${port}/convert-to-pdf`, {
      method: 'POST',
      body: formData,
    });

    return handleResponse(response);
  },

  convertFromPdf: async (file: File, targetFormat: 'docx' | 'image', imageFormat?: 'jpg' | 'png', outputPath?: string): Promise<Blob> => {
    const port = await getBackendPort();
    console.log('Sending convert-from-pdf request to port:', port);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_format', targetFormat);
    if (imageFormat) {
      formData.append('image_format', imageFormat);
    }
    // 사용자가 지정한 저장 경로 추가
    if (outputPath) {
      formData.append('output_path_str', outputPath);
    }

    const response = await fetch(`${BASE_URL}:${port}/convert-from-pdf`, {
      method: 'POST',
      body: formData,
    });

    // DOCX 변환 시에는 백엔드에서 직접 저장하므로, 성공 시 빈 Blob 반환 가능
    // 또는 백엔드에서 성공 여부만 반환하도록 수정할 수도 있음
    // 여기서는 일단 기존 handleResponse 유지
    return handleResponse(response);
  },

  addWatermark: async (
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
  ): Promise<Blob> => {
    const port = await getBackendPort();
    console.log('Sending add-watermark request to port:', port);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('watermark_type', options.watermarkType);
    
    if (options.watermarkType === 'text' && options.watermarkText) {
      formData.append('watermark_text', options.watermarkText);
    }
    
    if (options.watermarkType === 'image' && options.watermarkImage) {
      formData.append('watermark_image', options.watermarkImage);
    }
    
    formData.append('opacity', options.opacity.toString());
    formData.append('rotation', options.rotation.toString());
    formData.append('position', options.position);
    
    if (options.fontSize) {
      formData.append('font_size', options.fontSize.toString());
    }
    
    // 항상 NotoSansKR 폰트 사용
    formData.append('font_name', 'NotoSansKR');
    if (options.fontColor) {
      formData.append('font_color', options.fontColor);
    }

    if (options.fontBold !== undefined) {
      formData.append('font_bold', options.fontBold.toString());
    }
    
    formData.append('pages', options.pages);
    formData.append('pages', options.pages);

    const response = await fetch(`${BASE_URL}:${port}/add-watermark`, {
      method: 'POST',
      body: formData,
    });

    return handleResponse(response);
  },

  encryptPdf: async (file: File, password: string): Promise<Blob> => { // Removed allowPrinting and allowCommenting
    const port = await getBackendPort();
    console.log('Sending encrypt request to port:', port);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);
    // Removed allow_printing and allow_commenting from FormData

    const response = await fetch(`${BASE_URL}:${port}/encrypt`, {
      method: 'POST',
      body: formData,
    });

    return handleResponse(response);
  },

  decryptPdf: async (file: File, password: string): Promise<Blob> => {
    const port = await getBackendPort();
    console.log('Sending decrypt request to port:', port);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);

    const response = await fetch(`${BASE_URL}:${port}/decrypt`, {
      method: 'POST',
      body: formData,
    });

    return handleResponse(response);
  },
};

// 백엔드 포트를 받기 위한 IPC 리스너
ipcRenderer.on('backend-port', (_event, port: number) => {
  console.log('Received backend port:', port);
  PORT = port;
});

// API를 renderer 프로세스에 노출
contextBridge.exposeInMainWorld('electron', {
  pdf: pdfApi,
  // 파일 저장 대화상자 호출 함수 추가
  showSaveDialog: (options: Electron.SaveDialogOptions): Promise<Electron.SaveDialogReturnValue> => {
    return ipcRenderer.invoke('show-save-dialog', options);
  },
});
