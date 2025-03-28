import { app, ipcMain, dialog, Menu, BrowserWindow, MenuItemConstructorOptions } from 'electron';
import serve from 'electron-serve';
import { createWindow } from './helpers';
import { join } from 'path';
import { spawn } from 'child_process';
import { existsSync } from 'fs';

const isProd: boolean = process.env.NODE_ENV === 'production';

if (isProd) {
  serve({ directory: 'app' });
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

let pythonProcess: any = null;
let isQuitting = false;
let mainWindow: any = null;
let backendPort: number | null = null;

const startPythonProcess = () => {
  return new Promise<void>((resolve, reject) => {
    let executablePath: string;
    let args: string[] = [];
    let cwd: string;

    if (isProd) {
      // 프로덕션 환경에서는 패키징된 백엔드 실행 파일 사용
      const resourcePath = process.resourcesPath;
      const backendPath = join(resourcePath, 'backend');
      console.log('Production backend path:', backendPath);

      if (process.platform === 'win32') {
        executablePath = join(backendPath, 'pdf_processor', 'pdf_processor.exe');
      } else {
        executablePath = join(backendPath, 'pdf_processor', 'pdf_processor');
        // 실행 권한 설정
        try {
          require('fs').chmodSync(executablePath, '755');
          console.log('Set executable permissions for:', executablePath);
        } catch (err) {
          console.error('Failed to set permissions:', err);
        }
      }
      cwd = join(backendPath, 'pdf_processor');
    } else {
      // 개발 환경에서는 가상환경의 Python 실행
      const venvPath = join(app.getAppPath(), 'backend', 'venv');
      if (process.platform === 'win32') {
        executablePath = join(venvPath, 'Scripts', 'python.exe');
      } else {
        executablePath = join(venvPath, 'bin', 'python3');
        if (!existsSync(executablePath)) {
          executablePath = join(venvPath, 'bin', 'python');
        }
      }
      args = ['-m', 'pdf_processor'];
      cwd = join(app.getAppPath(), 'backend', 'src');
    }

    console.log('Starting backend process:', {
      executablePath,
      args,
      cwd,
      exists: existsSync(executablePath)
    });

    if (!existsSync(executablePath)) {
      const errorMsg = `Backend executable not found: ${executablePath}`;
      console.error(errorMsg);
      return reject(new Error(errorMsg));
    }

    // 타임아웃 설정
    const timeoutId = setTimeout(() => {
      reject(new Error('Backend startup timeout'));
    }, 30000);

    pythonProcess = spawn(executablePath, args, {
      cwd,
      env: {
        ...process.env,
        PYTHONPATH: isProd ? join(process.resourcesPath, 'backend') : join(app.getAppPath(), 'backend', 'src'),
        PYTHONIOENCODING: 'utf-8', // 인코딩 강제 설정
      },
      shell: process.platform === 'win32'
    });

    let portFound = false;
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      console.log(`Backend stdout: ${output}`);

      const portMatch = output.match(/PORT=(\d+)/);
      if (portMatch && !portFound) {
        portFound = true;
        backendPort = parseInt(portMatch[1], 10);
        console.log('Backend port found:', backendPort);
        
        if (mainWindow) {
          mainWindow.webContents.send('backend-port', backendPort);
        }
        
        clearTimeout(timeoutId);
        resolve();
      }
    });

    pythonProcess.stderr.on('data', (data: Buffer) => {
      const error = data.toString();
      errorOutput += error;
      console.error(`Backend stderr: ${error}`);
    });

    pythonProcess.on('close', (code: number) => {
      console.log(`Backend process exited with code ${code}`);
      if (code !== 0 && !isQuitting) {
        if (timeoutId) clearTimeout(timeoutId);
        
        if (!portFound) {
          console.error('Backend process failed with errors:', errorOutput);
          reject(new Error(`Backend process failed with code ${code}: ${errorOutput}`));
        } else {
          console.error('Backend process crashed, attempting to restart...');
          setTimeout(() => {
            startPythonProcess()
              .then(() => console.log('Backend restarted successfully'))
              .catch(err => console.error('Failed to restart backend:', err));
          }, 1000);
        }
      }
      pythonProcess = null;
    });

    pythonProcess.on('error', (err: Error) => {
      console.error('Failed to start backend process:', err);
      clearTimeout(timeoutId);
      reject(err);
    });
  });
};

// 백엔드 포트를 요청하는 IPC 핸들러
ipcMain.handle('get-backend-port', () => {
  console.log('Backend port requested:', backendPort);
  return backendPort;
});

(async () => {
  await app.whenReady();

  // 메뉴 템플릿 생성
  const template: MenuItemConstructorOptions[] = [
    {
      label: '파일',
      submenu: [
        { role: 'quit', label: '종료' }
      ]
    },
    {
      label: '편집',
      submenu: [
        { role: 'undo', label: '실행 취소' },
        { role: 'redo', label: '다시 실행' },
        { type: 'separator' },
        { role: 'cut', label: '잘라내기' },
        { role: 'copy', label: '복사' },
        { role: 'paste', label: '붙여넣기' },
        { role: 'delete', label: '삭제' },
        { role: 'selectAll', label: '모두 선택' }
      ]
    },
    {
      label: '보기',
      submenu: [
        { role: 'reload', label: '새로고침' },
        { role: 'resetZoom', label: '실제 크기' },
        { role: 'zoomIn', label: '확대' },
        { role: 'zoomOut', label: '축소' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '전체 화면' }
      ]
    },
    {
      role: 'help',
      label: '도움말',
      submenu: [
        {
          label: '정보',
          click: async () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'PDF Studio 정보',
              message: 'PDF Studio',
              detail: `버전: 1.0.0\n제작: JaeSeok Song\n\nPDF 문서를 쉽게 편집할 수 있는 도구입니다.`,
              buttons: ['확인'],
              noLink: true
            });
          }
        },
        {
          label: '라이센스 정보',
          click: async () => {
            dialog.showMessageBox({
              type: 'info',
              title: '라이센스 정보',
              message: '사용된 오픈소스 라이브러리',
              detail: `본 프로그램은 다음의 오픈소스 라이브러리를 사용합니다:

Backend 라이브러리:
- FastAPI (MIT License)
- Uvicorn (BSD License)
- PyPDF (MIT License)
- Pillow (Historical Permission Notice and Disclaimer - HPND)
- python-multipart (Apache License 2.0)
- PyInstaller (GPL v2)
- img2pdf (LGPL v3)
- xhtml2pdf (Apache License 2.0)
- ReportLab (BSD License)
- pdf2image (MIT License)
- pdfplumber (MIT License)
- python-docx (MIT License)

Frontend 라이브러리:
- Electron (MIT License)
- React (MIT License)
- Next.js (MIT License)
- Tailwind CSS (MIT License)

각 라이브러리의 라이센스 전문은 해당 프로젝트의 GitHub 페이지에서 확인하실 수 있습니다.`,
              buttons: ['확인'],
              noLink: true
            });
          }
        }
      ]
    }
  ];

  // 메뉴 설정
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  isQuitting = false;

  mainWindow = createWindow('main', {
    width: 1000,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    console.log('Starting backend process...');
    await startPythonProcess();
    console.log('Backend process started successfully');
  } catch (error) {
    console.error('Failed to start backend:', error);
    dialog.showErrorBox('Error', `Failed to start backend service!: ${error.message}`);
    app.quit();
    return;
  }

  if (isProd) {
    await mainWindow.loadURL('app://./welcome');
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/welcome`);
    mainWindow.webContents.openDevTools();
  }
})();

app.on('window-all-closed', () => {
  isQuitting = true;
  if (pythonProcess) {
    pythonProcess.kill();
  }
  app.quit();
});

process.on('exit', () => {
  isQuitting = true;
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

process.on('SIGTERM', () => {
  isQuitting = true;
  if (pythonProcess) {
    pythonProcess.kill();
  }
  app.quit();
});

process.on('SIGINT', () => {
  isQuitting = true;
  if (pythonProcess) {
    pythonProcess.kill();
  }
  app.quit();
});
