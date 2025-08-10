import { app, ipcMain, dialog, Menu, BrowserWindow, MenuItemConstructorOptions } from 'electron';
import fs from 'fs/promises';
import serve from 'electron-serve';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { createWindow } from './helpers';
import { join } from 'path';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
// 자동 업데이트 로그 설정
autoUpdater.logger = log;
log.transports.file.level = 'info';

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

// 서버 상태: 'connecting' | 'connected' | 'error'
let serverStatus: 'connecting' | 'connected' | 'error' = 'connecting';

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
      // 제거 후 테스트
      //shell: process.platform === 'win32'
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
        // 서버 상태 변경: connected
        serverStatus = 'connected';
        if (mainWindow) {
          mainWindow.webContents.send('server-status-changed', serverStatus);
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
          // 서버 상태 변경: error
          serverStatus = 'error';
          if (mainWindow) {
            mainWindow.webContents.send('server-status-changed', serverStatus);
          }
          reject(new Error(`Backend process failed with code ${code}: ${errorOutput}`));
        } else {
          console.error('Backend process crashed, attempting to restart...');
          setTimeout(() => {
            serverStatus = 'connecting';
            if (mainWindow) {
              mainWindow.webContents.send('server-status-changed', serverStatus);
            }
            startPythonProcess()
              .then(() => console.log('Backend restarted successfully'))
              .catch(err => {
                serverStatus = 'error';
                if (mainWindow) {
                  mainWindow.webContents.send('server-status-changed', serverStatus);
                }
                console.error('Failed to restart backend:', err);
              });
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

ipcMain.handle('save-file-dialog', async (event, options, data) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) {
    console.error('IPC "save-file-dialog" call: BrowserWindow not found.');
    return null;
  }
  
  const { canceled, filePath } = await dialog.showSaveDialog(window, options);

  if (canceled || !filePath) {
    return null; // 사용자가 취소한 경우
  }

  try {
    await fs.writeFile(filePath, data);
    return filePath; // 성공 시 저장된 경로 반환
  } catch (err) {
    console.error('Failed to save file:', err);
    dialog.showErrorBox('Save Error', 'An error occurred while saving the file: ' + err.message);
    return null;
  }
});

// 백엔드 포트를 요청하는 IPC 핸들러
ipcMain.handle('get-backend-port', () => {
  console.log('Backend port requested:', backendPort);
  return backendPort;
});

// 서버 상태 조회 IPC 핸들러
ipcMain.handle('get-server-status', () => {
  return serverStatus;
});

// 파일 저장 대화상자를 위한 IPC 핸들러
ipcMain.handle('show-save-dialog', async (event, options) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) {
    throw new Error('BrowserWindow not found');
  }
  return await dialog.showSaveDialog(window, options);
});

// 자동 업데이트 이벤트 핸들러
autoUpdater.on('checking-for-update', () => {
  console.log('업데이트 확인 중...');
});

autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: 'A new version is available.',
    detail: `Version ${info.version} is available. Would you like to update now?`,
    buttons: ['Update Now', 'Later'],
    cancelId: 1
  }).then(result => {
    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });
});

autoUpdater.on('update-not-available', () => {
  console.log('You are running the latest version.');
});

autoUpdater.on('error', (err) => {
  dialog.showErrorBox('Error', 'An error occurred during update: ' + err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
  let message = `Download speed: ${progressObj.bytesPerSecond}`;
  message += ` - Downloaded ${progressObj.percent}%`;
  message += ` (${progressObj.transferred}/${progressObj.total})`;
  console.log(message);
});

autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'The update has been downloaded.',
    detail: 'Would you like to restart the application to apply the update?',
    buttons: ['Restart', 'Later'],
    cancelId: 1
  }).then(result => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });
});

(async () => {
  await app.whenReady();

  if (isProd) {
    // 프로덕션 환경에서만 자동 업데이트 체크
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('업데이트 확인 중 오류 발생:', error);
    }
  }

  // 메뉴 템플릿 생성
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { role: 'quit', label: 'Quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Undo' },
        { role: 'redo', label: 'Redo' },
        { type: 'separator' },
        { role: 'cut', label: 'Cut' },
        { role: 'copy', label: 'Copy' },
        { role: 'paste', label: 'Paste' },
        { role: 'delete', label: 'Delete' },
        { role: 'selectAll', label: 'Select All' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'resetZoom', label: 'Actual Size' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toggle Full Screen' }
      ]
    },
    {
      role: 'help',
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: async () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About Every PDF',
              message: 'Every PDF',
              detail: `Version: ${app.getVersion()}\nAuthor: DDULDDUCK\n\nA tool for easy PDF document editing.`,
              buttons: ['OK'],
              noLink: true
            });
            }
          },
          {
            label: 'License Info',
            click: async () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'License Information',
              message: 'Open Source Libraries Used',
              detail: `This program uses the following open source libraries:
              
      Backend libraries:
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

      Frontend libraries:
      - Electron (MIT License)
      - React (MIT License)
      - Next.js (MIT License)
      - Tailwind CSS (MIT License)

      You can find the full license texts for each library on their respective GitHub project pages.`,
              buttons: ['OK'],
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

  const iconPath = join(app.getAppPath(), 'resources',
    process.platform === 'win32' ? 'logo.ico' :
    process.platform === 'darwin' ? 'logo.icns' : 'logo.png' // Linux는 logo.png 사용 (resources 폴더에 있어야 함)
  );

  mainWindow = createWindow('main', {
    width: 1000,
    height: 800,
    icon: iconPath, // 아이콘 경로 추가
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // UI를 먼저 표시
  if (isProd) {
    await mainWindow.loadURL('app://./welcome');
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/welcome`);
    mainWindow.webContents.openDevTools();
  }

  // 서버 상태: connecting으로 설정 및 알림
  serverStatus = 'connecting';
  if (mainWindow) {
    mainWindow.webContents.send('server-status-changed', serverStatus);
  }

  // 백엔드 서버 비동기 시작
  (async () => {
    try {
      console.log('Starting backend process...');
      await startPythonProcess();
      console.log('Backend process started successfully');
    } catch (error) {
      console.error('Failed to start backend:', error);
      serverStatus = 'error';
      if (mainWindow) {
        mainWindow.webContents.send('server-status-changed', serverStatus);
      }
      dialog.showErrorBox('Error', `Failed to start backend service!: ${error.message}`);
      app.quit();
    }
  })();
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
