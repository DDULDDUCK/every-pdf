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
      '--console',
      '--name', 'pdf_processor',
      '--add-data', `${join(backendPath, 'src', 'fonts')}${isWin ? ';' : ':'}pdf_processor/fonts`,
      ...(isWin ? [
        '--add-data',
        `${join(backendPath, 'src', 'poppler', 'windows', 'poppler-24.08.0', 'Library', 'bin')};poppler/bin`
      ] : process.platform === 'darwin' ? [
        '--add-data',
        `${join(backendPath, 'src', 'poppler', 'mac', '25.03.0', 'bin')}:poppler/bin`,
        '--add-data',
        `${join(backendPath, 'src', 'poppler', 'mac', '25.03.0', 'lib')}:poppler/lib`
      ] : []),
      '--hidden-import', 'PyPDF2',
      '--hidden-import', 'fastapi',
      '--hidden-import', 'uvicorn',
      '--hidden-import', 'uvicorn.logging',
      '--hidden-import', 'uvicorn.protocols',
      '--hidden-import', 'uvicorn.lifespan',
      '--hidden-import', 'uvicorn.loops',
      '--hidden-import', 'uvicorn.protocols.http',
      '--hidden-import', 'uvicorn.protocols.http.auto',
      '--hidden-import', 'uvicorn.protocols.websockets.auto',
      '--hidden-import', 'starlette',
      '--hidden-import', 'starlette.responses',
      '--hidden-import', 'starlette.routing',
      '--hidden-import', 'starlette.middleware',
      '--hidden-import', 'starlette.middleware.cors',
      '--hidden-import', 'starlette.background',
      '--hidden-import', 'starlette.responses',
      '--hidden-import', 'fastapi.responses',
      '--hidden-import', 'pdf2docx',
      '--hidden-import', 'img2pdf',
      '--hidden-import', 'xhtml2pdf',
      '--hidden-import', 'xhtml2pdf.pisa',
      '--hidden-import', 'reportlab',
      '--hidden-import', 'reportlab.pdfgen',
      '--hidden-import', 'reportlab.pdfgen.canvas',
      '--hidden-import', 'reportlab.pdfbase',
      '--hidden-import', 'reportlab.pdfbase.ttfonts',
      '--hidden-import', 'reportlab.pdfbase._fontdata',
      '--hidden-import', 'reportlab.lib.pagesizes',
      '--hidden-import', 'reportlab.lib.utils',
      '--hidden-import', 'reportlab.lib.styles',
      '--hidden-import', 'reportlab.graphics.barcode',
      '--hidden-import', 'reportlab.graphics.barcode.common',
      '--hidden-import', 'reportlab.graphics.barcode.code39',
      '--hidden-import', 'reportlab.graphics.barcode.code93',
      '--hidden-import', 'reportlab.graphics.barcode.code128',
      '--hidden-import', 'reportlab.graphics.barcode.usps',
      '--hidden-import', 'reportlab.graphics.barcode.usps4s',
      '--hidden-import', 'reportlab.graphics.barcode.eanbc',
      '--hidden-import', 'reportlab.graphics.barcode.ecc200datamatrix',
      '--hidden-import', 'reportlab.graphics.barcode.fourstate',
      '--hidden-import', 'reportlab.graphics.barcode.lto',
      '--hidden-import', 'reportlab.graphics.barcode.qr',
      '--hidden-import', 'reportlab.graphics.barcode.widgets',
      '--hidden-import', 'tempfile',
      '--hidden-import', 'socketserver',
      '--hidden-import', 'http.server',
      '--hidden-import', 'html.parser',
      '--hidden-import', 'io',
      '--hidden-import', 'PIL._tkinter_finder',
      '--hidden-import', 'atexit',
      '--hidden-import', 'os',
      '--hidden-import', 'sys',
      '--hidden-import', 'tempfile',
      '--hidden-import', 'logging',
      '--hidden-import', 'shutil',
      '--hidden-import', 'zipfile',
      '--hidden-import', 're',
      '--hidden-import', 'subprocess',
      '--hidden-import', 'platform',
      '--hidden-import', 'uuid',
      '--hidden-import', 'pathlib',
      '--hidden-import', 'PIL.features',
      '--hidden-import', 'xhtml2pdf.util',
      '--hidden-import', 'xhtml2pdf.context',
      '--hidden-import', 'xhtml2pdf.default',
      '--hidden-import', 'xhtml2pdf.parser',
      '--hidden-import', 'xhtml2pdf.xhtml2pdf_reportlab',
      '--hidden-import', 'pdf2image',
      '--hidden-import', 'PIL',
      '--hidden-import', 'PIL.Image',
      '--hidden-import', 'PIL.ImageDraw',
      '--hidden-import', 'PIL.ImageFont',
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