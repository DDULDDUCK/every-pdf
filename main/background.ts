import { app, ipcMain, dialog } from 'electron';
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
      const resourcePath = process.resourcesPath;
      const backendPath = join(resourcePath, 'backend');
      console.log('Production backend path:', backendPath);

      if (process.platform === 'win32') {
        executablePath = join(backendPath, 'pdf_processor.exe');
      } else {
        executablePath = join(backendPath, 'pdf_processor');
        require('fs').chmodSync(executablePath, '755');
      }
      cwd = backendPath;
    } else {
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

    // 타임아웃 설정
    const timeoutId = setTimeout(() => {
      reject(new Error('Backend startup timeout'));
    }, 30000);

    pythonProcess = spawn(executablePath, args, {
      cwd,
      env: {
        ...process.env,
        PYTHONPATH: isProd ? join(process.resourcesPath, 'backend') : join(app.getAppPath(), 'backend', 'src'),
      },
      shell: process.platform === 'win32'
    });

    let portFound = false;

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
      console.error(`Backend stderr: ${error}`);
    });

    pythonProcess.on('close', (code: number) => {
      console.log(`Backend process exited with code ${code}`);
      if (code !== 0 && !isQuitting) {
        console.error('Backend process crashed, attempting to restart...');
        setTimeout(() => {
          startPythonProcess()
            .then(() => console.log('Backend restarted successfully'))
            .catch(err => console.error('Failed to restart backend:', err));
        }, 1000);
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
    dialog.showErrorBox('Error', 'Failed to start backend service');
    app.quit();
    return;
  }

  if (isProd) {
    await mainWindow.loadURL('app://./home');
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
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
