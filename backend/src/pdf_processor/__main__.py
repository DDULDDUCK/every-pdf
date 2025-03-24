"""
PDF Processor main entry point
"""
import sys
from pathlib import Path
from pdf_processor.main import main

def get_app_dir() -> Path:
    """애플리케이션 디렉토리 가져오기"""
    if getattr(sys, 'frozen', False):
        # PyInstaller로 패키징된 경우
        return Path(sys._MEIPASS)
    else:
        # 개발 모드
        return Path(__file__).parent

if __name__ == '__main__':
    sys.path.insert(0, str(get_app_dir()))
    main()