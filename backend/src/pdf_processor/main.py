import uvicorn
import sys
import socket
from pathlib import Path
from pdf_processor.api import app

def find_free_port(start_port: int = 3000, max_attempts: int = 100) -> int:
    """사용 가능한 포트 찾기"""
    for port in range(start_port, start_port + max_attempts):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('localhost', port))
                return port
        except socket.error:
            continue
    raise RuntimeError("사용 가능한 포트를 찾을 수 없습니다")

def get_app_dir() -> Path:
    """애플리케이션 디렉토리 가져오기"""
    if getattr(sys, 'frozen', False):
        # PyInstaller로 패키징된 경우
        return Path(sys._MEIPASS)
    else:
        # 개발 모드
        return Path(__file__).parent

def main():
    """메인 실행 함수"""
    try:
        # 사용 가능한 포트 찾기
        port = find_free_port()
        
        # 포트 번호를 stdout으로 출력 (Electron이 이를 읽음)
        print(f"PORT={port}", flush=True)
        
        # FastAPI 서버 실행
        uvicorn.run(
            app,
            host="localhost",
            port=port,
            log_level="info"
        )
    except Exception as e:
        print(f"ERROR={str(e)}", file=sys.stderr, flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()