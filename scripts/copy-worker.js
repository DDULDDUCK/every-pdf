const fs = require('fs');
const path = require('path');

// 1. 필요한 경로 설정
// __dirname은 현재 스크립트 파일이 있는 'scripts' 폴더를 가리킵니다.
const projectRoot = path.join(__dirname, '..'); // 프로젝트 루트로 이동
const destDir = path.join(projectRoot, 'renderer', 'public', 'static');
const destFile = path.join(destDir, 'pdf.worker.min.js');
const sourceCandidates = [
  path.join(projectRoot, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js'),
  path.join(projectRoot, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.js'),
  path.join(projectRoot, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'),
  path.join(projectRoot, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.mjs'),
];

const sourceFile = sourceCandidates.find((candidate) => fs.existsSync(candidate));

try {
  if (!sourceFile) {
    throw new Error('Could not find a compatible pdf.js worker file in node_modules/pdfjs-dist/build');
  }

  // 2. 대상 디렉토리가 없으면 생성 (mkdir -p 와 동일한 기능)
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(`Created directory: ${destDir}`);
  }

  // 3. 파일 복사
  fs.copyFileSync(sourceFile, destFile);
  console.log(`Successfully copied ${path.basename(sourceFile)} to ${destDir}/pdf.worker.min.js`);

} catch (error) {
  console.error('An error occurred during the copy process:', error);
  process.exit(1); // 오류 발생 시 스크립트 종료
}
