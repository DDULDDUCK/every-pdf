<p align="center"><img src="https://i.imgur.com/a9QWW0v.png" width="300"></p>

# PDF-Studio

> Nextron(Electron + Next.js) 기반의 PDF 도구 데스크탑 애플리케이션입니다. TailwindCSS, Python 백엔드, 다양한 PDF 기능을 제공합니다.

---

## 프로젝트 구조

```
PDF-Studio/
├── app/           # Electron 앱 리소스(HTML, preload, background 등)
├── backend/       # Python PDF 처리 백엔드
├── main/          # Electron 메인 프로세스 (TypeScript)
├── renderer/      # Next.js 프론트엔드 (React, TypeScript)
├── resources/     # 앱 아이콘 등 리소스
├── scripts/       # 개발/배포용 스크립트
├── package.json   # Node/Electron 패키지 설정
└── ...
```

## 설치 및 실행

### 1. 의존성 설치

```bash
# Node.js 패키지 설치 (루트에서)
npm install

# 또는 yarn
# yarn

# Python 백엔드 의존성 설치
cd backend
pip install -r requirements.txt
cd ..
```

### 2. 개발 모드 실행

```bash
# 프론트+Electron 개발 서버 실행
npm run dev
# 또는 yarn dev
```

### 3. 백엔드 빌드 (선택)

```bash
cd backend
# 빌드 스크립트 또는 pyinstaller 등 사용
# 예시: python -m PyInstaller pdf_processor.spec
cd ..
```

### 4. 프로덕션 빌드

```bash
npm run build
# 또는 yarn build
```

## 주요 스크립트

- `scripts/setup_mac_poppler.sh`: macOS용 poppler 설치
- `scripts/build_backend.js`: 백엔드 빌드 자동화

## 참고

- Electron, Next.js, TailwindCSS, Python 연동 프로젝트
- 환경에 따라 Python, Node.js, Electron, poppler 등이 필요할 수 있습니다.
