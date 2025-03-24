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

  convertFromPdf: async (file: File, targetFormat: 'docx' | 'image', imageFormat?: 'jpg' | 'png'): Promise<Blob> => {
    const port = await getBackendPort();
    console.log('Sending convert-from-pdf request to port:', port);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_format', targetFormat);
    if (imageFormat) {
      formData.append('image_format', imageFormat);
    }

    const response = await fetch(`${BASE_URL}:${port}/convert-from-pdf`, {
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
});
