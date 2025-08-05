import uvicorn
import sys
import socket
from pathlib import Path

# 수정된 부분: app.py에서 app 객체를 직접 임포트합니다.
from pdf_processor.app import app

# 수정된 부분: api 패키지에서 라우터 등록 함수를 임포트합니다.
from pdf_processor.api import register_routers

# FastAPI 앱이 실행되기 전에 라우터를 등록합니다.
register_routers(app)

def find_free_port(start_port: int = 3000, max_attempts: int = 100) -> int:
    """사용 가능한 포트 찾기"""
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('localhost', port)) != 0:
                return port
    raise RuntimeError("사용 가능한 포트를 찾을 수 없습니다")

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
