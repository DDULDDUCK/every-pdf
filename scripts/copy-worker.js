const fs = require('fs');
const path = require('path');

const destDir = path.join(__dirname, '..', 'renderer', 'public', 'static');
const sourceFile = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js');
const destFile = path.join(destDir, 'pdf.worker.min.js');

// 1. 대상 디렉토리가 없으면 생성 (mkdir -p 와 동일한 기능)
fs.mkdirSync(destDir, { recursive: true });

// 2. 파일 복사
fs.copyFileSync(sourceFile, destFile);

console.log('pdf.worker.min.js copied successfully!');