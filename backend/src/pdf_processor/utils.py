import os
import sys
import uuid
from pathlib import Path
from typing import List

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

APP_DATA_DIR = get_app_data_dir()
TEMP_DIR = APP_DATA_DIR / "temp"
APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

def get_session_dir() -> Path:
    """세션별 임시 디렉토리 생성"""
    session_id = str(uuid.uuid4())
    session_dir = TEMP_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    return session_dir

def parse_page_ranges(range_str: str, max_pages: int) -> List[int]:
    """페이지 범위 문자열을 페이지 번호 리스트로 변환"""
    pages = set()
    for part in range_str.replace(" ", "").split(","):
        if not part:
            continue
        if "-" in part:
            start, end = map(int, part.split("-"))
            if start > end:
                start, end = end, start
            if start < 1:
                raise ValueError("페이지 번호는 1 이상이어야 합니다")
            if end > max_pages:
                raise ValueError(f"페이지 번호는 {max_pages} 이하여야 합니다")
            pages.update(range(start, end + 1))
        else:
            page = int(part)
            if page < 1:
                raise ValueError("페이지 번호는 1 이상이어야 합니다")
            if page > max_pages:
                raise ValueError(f"페이지 번호는 {max_pages} 이하여야 합니다")
            pages.add(page)
    return sorted(list(pages))