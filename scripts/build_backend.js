const { spawn } = require('child_process');
const { join } = require('path');
const fs = require('fs');
const path = require('path');

const isWin = process.platform === 'win32';
const venvPath = join(__dirname, '..', 'backend', 'venv');
const backendPath = join(__dirname, '..', 'backend');
const distPath = join(backendPath, 'dist');

// PyInstaller를 사용하여 백엔드 빌드
async function buildBackend() {
  try {
    // dist 폴더 정리
    if (fs.existsSync(distPath)) {
      fs.rmSync(distPath, { recursive: true, force: true });
    }

    // venv의 PyInstaller 경로
    const pyinstallerPath = isWin
      ? join(venvPath, 'Scripts', 'pyinstaller.exe')
      : join(venvPath, 'bin', 'pyinstaller');

    // PyInstaller 실행
    const args = [
      '--noconfirm',
      '--clean',
      '--onedir',
      '--name', 'pdf_processor',
      '--hidden-import', 'PyPDF2',
      join(backendPath, 'src', 'pdf_processor', 'main.py')
    ];

    await runCommand(pyinstallerPath, args, { cwd: backendPath });

    console.log('백엔드 빌드가 완료되었습니다.');
  } catch (error) {
    console.error('백엔드 빌드 중 오류 발생:', error);
    process.exit(1);
  }
}

// 명령어 실행 함수
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      ...options,
      stdio: 'inherit',
      shell: true
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

// 실행
buildBackend();