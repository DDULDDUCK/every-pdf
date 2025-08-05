from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import os
import sys
import logging
from pathlib import Path
import uuid
import atexit
import shutil # <<< shutil 임포트

logger = logging.getLogger(__name__)

# FastAPI 앱 인스턴스 생성
app = FastAPI()

# CORS 미들웨어 설정
origins = [
    "http://localhost:8888",
    "app://."
]
for port in range(3000, 4000):
    origins.append(f"http://localhost:{port}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_app_data_dir() -> Path:
    """애플리케이션 데이터 디렉토리 가져오기"""
    if sys.platform == 'win32':
        app_data = os.getenv('LOCALAPPDATA', os.path.expanduser('~'))
        base_dir = Path(app_data) / "PDF-Studio"
    elif sys.platform == 'darwin':
        base_dir = Path(os.path.expanduser('~')) / "Library" / "Application Support" / "PDF-Studio"
    else:  # linux
        base_dir = Path(os.path.expanduser('~')) / ".pdf-studio"
    
    return base_dir

# 애플리케이션 데이터 디렉토리 설정
APP_DATA_DIR = get_app_data_dir()
TEMP_DIR = APP_DATA_DIR / "temp"

# 디렉토리 생성
APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# *** 여기가 수정된 부분입니다 ***
@atexit.register
def cleanup_temp_dir():
    """임시 디렉토리와 그 안의 모든 내용을 삭제합니다."""
    try:
        if TEMP_DIR.exists():
            # shutil.rmtree는 디렉터리가 비어있지 않아도 강제로 삭제합니다.
            shutil.rmtree(TEMP_DIR)
            print(f"Cleaned up temporary directory: {TEMP_DIR}")
    except Exception as e:
        print(f"Error cleaning up temp directory: {e}")

# 세션 관리 및 유틸리티 함수들은 기존 코드를 그대로 사용
def get_session_dir() -> Path:
    """세션별 임시 디렉토리 생성"""
    session_id = str(uuid.uuid4())
    session_dir = TEMP_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    return session_dir

def parse_page_ranges(range_str: str, max_pages: int) -> list[int]:
    """페이지 범위 문자열을 페이지 번호 리스트로 변환"""
    pages = set()
    for part in range_str.replace(" ", "").split(","):
        if not part: continue
        if "-" in part:
            start, end = map(int, part.split("-"))
            if start > end: start, end = end, start
            if start < 1: raise ValueError("Page number must be 1 or greater")
            if end > max_pages: raise ValueError(f"Page number cannot exceed {max_pages}")
            pages.update(range(start, end + 1))
        else:
            page = int(part)
            if page < 1: raise ValueError("Page number must be 1 or greater")
            if page > max_pages: raise ValueError(f"Page number cannot exceed {max_pages}")
            pages.add(page)
    return sorted(list(pages))