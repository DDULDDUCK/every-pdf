const { spawn } = require('child_process');
const { join } = require('path');
const fs = require('fs');
const path = require('path');

const isWin = process.platform === 'win32';
const pythonExecutable = isWin ? 'python' : 'python3';
const venvPath = join(__dirname, '..', 'backend', 'venv');
const backendPath = join(__dirname, '..', 'backend');

// venv 생성 및 패키징 함수
async function setupVenv() {
  try {
    // 기존 venv 삭제
    if (fs.existsSync(venvPath)) {
      fs.rmSync(venvPath, { recursive: true, force: true });
    }

    // venv 생성
    await runCommand(pythonExecutable, ['-m', 'venv', venvPath]);

    // venv의 Python 및 pip 경로
    const pipPath = isWin
      ? join(venvPath, 'Scripts', 'pip.exe')
      : join(venvPath, 'bin', 'pip');

    // 의존성 설치
    await runCommand(pipPath, ['install', '-r', join(backendPath, 'requirements.txt')]);
    await runCommand(pipPath, ['install', 'pyinstaller']);

    console.log('Python 가상환경 설정이 완료되었습니다.');
  } catch (error) {
    console.error('Python 가상환경 설정 중 오류 발생:', error);
    process.exit(1);
  }
}

// 명령어 실행 함수
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
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
setupVenv();