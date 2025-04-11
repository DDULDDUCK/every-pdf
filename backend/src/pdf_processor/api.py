from fastapi import FastAPI, UploadFile, HTTPException, BackgroundTasks, Form
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from starlette.middleware.cors import CORSMiddleware
from pypdf import PdfReader, PdfWriter
import os
import sys
import tempfile
import logging
import shutil
import zipfile
from pathlib import Path
from typing import List, Literal
import uuid
import platform
from pdf2image import convert_from_path
import img2pdf
from PIL import Image, ImageDraw, ImageFont
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from xhtml2pdf import pisa
from io import BytesIO
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import re
import subprocess
import pdfplumber
import docx
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn

logger = logging.getLogger(__name__)

def check_and_install_poppler():
    """macOS에서 poppler 설치 여부를 확인하고 필요한 경우 설치"""
    if platform.system() != "Darwin":
        return
        
    try:
        # 먼저 터미널에서 직접 poppler 명령어 실행을 시도
        result = subprocess.run(['pdftocairo', '-v'],
                              capture_output=True,
                              text=True)
        return
    except FileNotFoundError:
        # poppler가 설치되어 있지 않은 경우
        logger.info("poppler가 설치되어 있지 않습니다. 설치를 시작합니다...")
        try:
            # Homebrew 설치 확인
            brew_check = subprocess.run(['which', 'brew'],
                                     capture_output=True,
                                     text=True)
            if brew_check.returncode == 0:
                # Homebrew를 통한 설치 시도
                install_result = subprocess.run(['brew', 'install', 'poppler'],
                                            capture_output=True,
                                            text=True)
                if install_result.returncode == 0:
                    logger.info("poppler가 성공적으로 설치되었습니다.")
                    return
            
            # Homebrew를 통한 설치가 실패한 경우 MacPorts 시도
            macports_check = subprocess.run(['which', 'port'],
                                         capture_output=True,
                                         text=True)
            if macports_check.returncode == 0:
                install_result = subprocess.run(['sudo', 'port', 'install', 'poppler'],
                                            capture_output=True,
                                            text=True)
                if install_result.returncode == 0:
                    logger.info("poppler가 성공적으로 설치되었습니다.")
                    return
            
            raise RuntimeError("패키지 매니저를 찾을 수 없습니다. Homebrew나 MacPorts를 설치해주세요.")
            
        except Exception as e:
            logger.error(f"poppler 설치 실패: {str(e)}")
            raise RuntimeError(f"poppler 설치에 실패했습니다. Homebrew나 MacPorts를 사용하여 수동으로 설치해주세요: {str(e)}")
    
    except Exception as e:
        logger.error(f"poppler 설치 확인 중 오류 발생: {str(e)}")
        raise RuntimeError(f"poppler 설치 확인 과정에서 오류가 발생했습니다: {str(e)}")

app = FastAPI()

# CORS 미들웨어 설정
origins = []

# 개발 환경을 위한 origin
origins.extend([
    "http://localhost:8888",      # 개발 환경의 Next.js 서버
])

# 모든 로컬호스트 포트 허용 (동적 포트 할당 대응)
for port in range(3000, 4000):    # FastAPI가 사용할 수 있는 포트 범위
    origins.append(f"http://localhost:{port}")

# Electron app:// 프로토콜 허용
origins.append("app://.")

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

# 프로그램 종료 시 임시 디렉토리 정리를 위한 함수
def cleanup_temp_dir():
    """임시 디렉토리 정리"""
    if TEMP_DIR.exists():
        for file in TEMP_DIR.glob("*"):
            try:
                file.unlink()
            except:
                pass
        TEMP_DIR.rmdir()

import atexit
atexit.register(cleanup_temp_dir)

def get_session_dir() -> Path:
    """세션별 임시 디렉토리 생성"""
    session_id = str(uuid.uuid4())
    session_dir = TEMP_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    return session_dir

def parse_page_ranges(range_str: str, max_pages: int) -> List[int]:
    """페이지 범위 문자열을 페이지 번호 리스트로 변환"""
    pages = set()
    
    # 콤마로 구분된 각 부분을 처리
    for part in range_str.replace(" ", "").split(","):
        if not part:
            continue
            
        # 범위 형식 (예: "1-5")
        if "-" in part:
            start, end = map(int, part.split("-"))
            if start > end:
                start, end = end, start
            if start < 1:
                raise ValueError("페이지 번호는 1 이상이어야 합니다")
            if end > max_pages:
                raise ValueError(f"페이지 번호는 {max_pages} 이하여야 합니다")
            pages.update(range(start, end + 1))
        
        # 단일 페이지 번호
        else:
            page = int(part)
            if page < 1:
                raise ValueError("페이지 번호는 1 이상이어야 합니다")
            if page > max_pages:
                raise ValueError(f"페이지 번호는 {max_pages} 이하여야 합니다")
            pages.add(page)
    
    return sorted(list(pages))

@app.post("/split")
async def split_pdf(file: UploadFile, pages: str = Form(...)):
    """PDF 파일을 지정된 페이지들로 분할"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 지원됩니다")
    
    session_dir = get_session_dir()
    temp_path = session_dir / f"temp_{file.filename}"
    output_path = session_dir / f"split_{file.filename}"
    
    try:
        # 업로드된 파일 저장
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # PDF 처리
        reader = PdfReader(temp_path)
        writer = PdfWriter()
        
        # PDF 총 페이지 수 확인
        total_pages = len(reader.pages)
        
        try:
            # 페이지 범위 문자열 파싱
            page_list = parse_page_ranges(pages, total_pages)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        if not page_list:
            raise HTTPException(
                status_code=400,
                detail=f"페이지가 선택되지 않았습니다. 예시: '1-3,5,7-9' (1부터 {total_pages}까지)"
            )
        
        # 선택된 페이지들을 새 PDF에 추가
        for page_num in page_list:
            # 1부터 시작하는 페이지 번호를 0부터 시작하는 인덱스로 변환
            writer.add_page(reader.pages[page_num - 1])
        
        # 결과 저장
        with open(output_path, "wb") as output_file:
            writer.write(output_file)
        
        # 임시 파일 삭제
        temp_path.unlink()
        
        return FileResponse(
            path=str(output_path),
            filename=f"split_{file.filename}",
            background=BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
        )
    
    except Exception as e:
        # 오류 발생 시 세션 디렉토리 정리
        shutil.rmtree(session_dir, ignore_errors=True)
        raise e

@app.post("/merge")
async def merge_pdfs(files: List[UploadFile]):
    """여러 PDF 파일을 하나로 병합"""
    if not all(file.filename.lower().endswith('.pdf') for file in files):
        raise HTTPException(status_code=400, detail="모든 파일은 PDF 형식이어야 합니다")
    
    session_dir = get_session_dir()
    temp_files = []
    output_path = session_dir / "merged.pdf"
    
    try:
        merger = PdfWriter()
        
        for file in files:
            temp_path = session_dir / f"temp_{file.filename}"
            temp_files.append(temp_path)
            
            # 파일 저장
            content = await file.read()
            with open(temp_path, "wb") as buffer:
                buffer.write(content)
            
            # PDF 병합
            reader = PdfReader(temp_path)
            merger.append(reader)
        
        # 결과 저장
        with open(output_path, "wb") as output_file:
            merger.write(output_file)
        
        # 임시 파일 삭제
        for temp_file in temp_files:
            if temp_file.exists():
                temp_file.unlink()
        
        return FileResponse(
            path=str(output_path),
            filename="merged.pdf",
            background=BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
        )
    
    except Exception as e:
        # 오류 발생 시 세션 디렉토리 정리
        shutil.rmtree(session_dir, ignore_errors=True)
        raise e

@app.post("/rotate")
async def rotate_pdf(
    file: UploadFile,
    pages: str = Form(...),
    angle: int = Form(...),
    include_unspecified: bool = Form(...)
):
    """PDF 페이지 회전
    
    Args:
        file: PDF 파일
        pages: 회전할 페이지 범위 (예: "1-3,5,7-9" 또는 "all")
        angle: 회전 각도 (90, 180, 270)
        include_unspecified: 지정하지 않은 페이지 포함 여부
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 지원됩니다")
    
    if angle not in [90, 180, 270]:
        raise HTTPException(status_code=400, detail="회전 각도는 90, 180, 270만 지원됩니다")
    
    session_dir = get_session_dir()
    temp_path = session_dir / f"temp_{file.filename}"
    output_path = session_dir / f"rotated_{file.filename}"
    
    try:
        # 파일 저장
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # PDF 처리
        reader = PdfReader(temp_path)
        writer = PdfWriter()
        
        total_pages = len(reader.pages)

        # 'all'인 경우 모든 페이지를 회전
        if pages.lower() == 'all':
            pages_to_rotate = list(range(1, total_pages + 1))
        else:
            try:
                # 페이지 범위 문자열 파싱
                pages_to_rotate = parse_page_ranges(pages, total_pages)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
            
            if not pages_to_rotate:
                raise HTTPException(
                    status_code=400,
                    detail=f"페이지가 선택되지 않았습니다. 예시: '1-3,5,7-9' (1부터 {total_pages}까지) 또는 'all'"
                )

        # 페이지 처리
        for i in range(total_pages):
            page_num = i + 1  # 1부터 시작하는 페이지 번호
            page_obj = reader.pages[i]

            if page_num in pages_to_rotate:
                # 선택된 페이지 회전
                page_obj.rotate(angle)
                writer.add_page(page_obj)
            elif include_unspecified:
                # 지정하지 않은 페이지도 포함
                writer.add_page(page_obj)
            else:
                # 지정하지 않은 페이지는 제외
                continue
        
        # 결과 저장
        with open(output_path, "wb") as output_file:
            writer.write(output_file)
        
        # 임시 파일 삭제
        temp_path.unlink()
        
        return FileResponse(
            path=str(output_path),
            filename=f"rotated_{file.filename}",
            background=BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
        )
    
    except Exception as e:
        # 오류 발생 시 세션 디렉토리 정리
        shutil.rmtree(session_dir, ignore_errors=True)
        raise e

@app.post("/convert-to-pdf")
async def convert_to_pdf(
    files: List[UploadFile],
    source_format: Literal["txt", "html", "image"] = Form(...)
):
    """다른 형식의 파일들을 PDF로 변환"""
    session_dir = get_session_dir()
    output_path = session_dir / "output.pdf"
    
    try:
        if source_format == "txt":
            if not files[0].filename.lower().endswith('.txt'):
                raise HTTPException(status_code=400, detail="TXT 파일만 지원됩니다")
            
            # 텍스트 파일 확인
            if not files[0].filename.lower().endswith('.txt'):
                raise HTTPException(status_code=400, detail="TXT 파일만 지원됩니다")
            
            # 텍스트 파일은 첫 번째 파일만 처리
            temp_path = session_dir / f"temp_{files[0].filename}"
            content = await files[0].read()
            with open(temp_path, "wb") as buffer:
                buffer.write(content)
            
            # 폰트 경로 설정
            # PyInstaller가 생성한 임시 경로 확인
            if getattr(sys, '_MEIPASS', None):
                font_path = os.path.join(sys._MEIPASS, 'pdf_processor', 'fonts', 'NotoSansKR-VariableFont_wght.ttf')
            else:
                font_path = os.path.join(os.path.dirname(__file__), '..', 'fonts', 'NotoSansKR-VariableFont_wght.ttf')
            
            # 텍스트 읽기
            with open(temp_path, 'r', encoding='utf-8') as f:
                text = f.read()
            
            # PDF로 변환
            c = canvas.Canvas(str(output_path), pagesize=letter)
            
            # 한글 폰트 등록
            pdfmetrics.registerFont(TTFont('NotoSansKR', font_path))
            c.setFont('NotoSansKR', 12)
            
            # 페이지 설정
            margin = 50  # 여백
            line_height = 20  # 줄 간격
            max_width = letter[0] - 2 * margin  # 사용 가능한 최대 너비
            y = letter[1] - margin  # 시작 y 위치
            
            def get_wrapped_lines(text, c, max_width):
                lines = []
                current_line = ''
                
                # 스페이스로 구분된 단어들 처리
                for word in text.split():
                    # 단어가 너무 길 경우 문자 단위로 나누기
                    if c.stringWidth(word, 'NotoSansKR', 12) > max_width:
                        if current_line:  # 현재 줄에 있는 내용 저장
                            lines.append(current_line)
                            current_line = ''
                        
                        # 긴 단어를 문자 단위로 처리
                        temp_word = ''
                        for char in word:
                            char_width = c.stringWidth(temp_word + char, 'NotoSansKR', 12)
                            if char_width <= max_width:
                                temp_word += char
                            else:
                                lines.append(temp_word)
                                temp_word = char
                        if temp_word:
                            current_line = temp_word
                    else:
                        # 일반적인 단어 처리
                        test_line = current_line + ' ' + word if current_line else word
                        if c.stringWidth(test_line, 'NotoSansKR', 12) <= max_width:
                            current_line = test_line
                        else:
                            lines.append(current_line)
                            current_line = word
                
                if current_line:  # 마지막 줄 처리
                    lines.append(current_line)
                
                return lines
            
            # 텍스트 처리
            for paragraph in text.split('\n'):
                if not paragraph.strip():  # 빈 줄 처리
                    y -= line_height
                    if y <= margin:
                        c.showPage()
                        c.setFont('NotoSansKR', 12)
                        y = letter[1] - margin
                    continue
                
                # 긴 문장 줄바꿈 처리
                wrapped_lines = get_wrapped_lines(paragraph, c, max_width)
                
                for line in wrapped_lines:
                    if y <= margin:  # 새 페이지 시작
                        c.showPage()
                        c.setFont('NotoSansKR', 12)
                        y = letter[1] - margin
                    c.drawString(margin, y, line)
                    y -= line_height
                
                # 문단 사이 추가 간격
                y -= line_height * 0.5
            
            c.save()
            
            # 임시 파일 삭제
            temp_path.unlink()
            
        elif source_format == "html":
            # HTML 파일 확인 및 저장
            if not files[0].filename.lower().endswith('.html'):
                raise HTTPException(status_code=400, detail="HTML 파일만 지원됩니다")
            
            # 임시 파일 경로 설정
            temp_path = session_dir / f"temp_{files[0].filename}"
            
            # 업로드된 파일 저장
            with open(temp_path, "wb") as buffer:
                content = await files[0].read()
                buffer.write(content)
            
            # 폰트 경로 설정
            font_path = os.path.join(os.path.dirname(__file__), '..', 'fonts', 'NotoSansKR-VariableFont_wght.ttf')
            
            # HTML 읽기
            with open(temp_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            styled_html = '''
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    * {
                        font-family: HYSMyeongJo-Medium !important;
                    }
                </style>
            </head>
            <body>
            '''
            styled_html += html_content
            styled_html += '''
            </body>
            </html>
            '''
            
            # HTML을 PDF로 변환
            result_pdf = BytesIO()
            
            # PDF 생성 (기본 옵션만 사용)
            pisa_status = pisa.CreatePDF(
                styled_html,
                dest=result_pdf
            )
            
            if not pisa_status.err:
                with open(output_path, 'wb') as f:
                    f.write(result_pdf.getvalue())
            else:
                raise HTTPException(status_code=500, detail="HTML을 PDF로 변환하는데 실패했습니다.")
            
            # 임시 파일 삭제
            temp_path.unlink()
            
        elif source_format == "image":
            # 이미지 파일 확인
            if not all(any(f.filename.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png']) for f in files):
                raise HTTPException(status_code=400, detail="JPG, JPEG, PNG 이미지만 지원됩니다")
            
            # 여러 이미지 파일을 임시로 저장
            image_paths = []
            for i, file in enumerate(files):
                temp_image = session_dir / f"temp_image_{i}_{file.filename}"
                content = await file.read()
                with open(temp_image, "wb") as buffer:
                    buffer.write(content)
                image_paths.append(temp_image)
            
            try:
                # 모든 이미지를 하나의 PDF로 변환
                with open(output_path, "wb") as output_file:
                    output_file.write(img2pdf.convert([str(p) for p in image_paths]))
            finally:
                # 임시 이미지 파일들 삭제
                for path in image_paths:
                    if path.exists():
                        path.unlink()
        
        return FileResponse(
            path=str(output_path),
            filename=f"{os.path.splitext(files[0].filename)[0]}.pdf",
            background=BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
        )
    
    except Exception as e:
        # 오류 발생 시 세션 디렉토리 정리
        shutil.rmtree(session_dir, ignore_errors=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/convert-from-pdf")
async def convert_from_pdf(
    file: UploadFile,
    target_format: Literal["docx", "image"] = Form(...),
    image_format: Literal["jpg", "png"] = Form(None),
    output_path_str: str = Form(None)  # 사용자가 지정한 저장 경로
):
    """PDF를 다른 형식으로 변환"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 지원됩니다")
    
    session_dir = get_session_dir()
    temp_pdf = session_dir / f"temp_{file.filename}"
    output_path = session_dir / f"{os.path.splitext(file.filename)[0]}"
    
    # OS별 poppler 경로 및 환경 설정
    poppler_path = None
    if platform.system() == "Windows":
        poppler_path = str(Path(__file__).parent.parent / "poppler" / "windows" / "poppler-24.08.0" / "Library" / "bin")
    elif platform.system() == "Darwin":
        # PyInstaller의 _MEIPASS 경로 확인
        if getattr(sys, '_MEIPASS', None):
            base_path = Path(sys._MEIPASS)
            poppler_path = str(base_path / "poppler" / "bin")
            lib_path = str(base_path / "poppler" / "lib")
        else:
            base_path = Path(__file__).parent.parent
            poppler_path = str(base_path / "poppler" / "mac" / "25.03.0" / "bin")
            lib_path = str(base_path / "poppler" / "mac" / "25.03.0" / "lib")
        
        # 환경 변수 설정
        os.environ['DYLD_LIBRARY_PATH'] = lib_path
        os.environ['PATH'] = f"{poppler_path}:{os.environ.get('PATH', '')}"

    try:
        # 업로드된 PDF 파일 저장
        with open(temp_pdf, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        
        if target_format == "docx":
            print(f"Received file: {output_path_str}")  # 로깅 추가
            if output_path_str:
                # 사용자가 경로를 지정한 경우
                print(f"Received file1: {output_path_str}")
                logger.info(f"Received output path string: {output_path_str}") # 로깅 추가
                output_docx = Path(output_path_str)
                logger.info(f"Output docx path object: {output_docx}") # 로깅 추가
                # 디렉토리가 존재하지 않으면 생성 (필요한 경우)
                try:
                    output_docx.parent.mkdir(parents=True, exist_ok=True)
                    print(f"Ensured directory exists: {output_docx.parent}") # 로깅 추가
                except Exception as dir_err:
                    print(f"Failed to create directory {output_docx.parent}: {dir_err}")
                    # 디렉토리 생성 실패 시 오류 처리 또는 기본 경로 사용 고려
                    raise HTTPException(status_code=500, detail=f"Failed to create output directory: {dir_err}")
                # 세션 디렉토리 정리 작업에서 이 파일을 제외해야 할 수 있음
                # 여기서는 우선 BackgroundTask는 그대로 둠
                cleanup_task = BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
            else:
                print(f"Received file2: {output_path_str}")  # 로깅 추가
                # 사용자가 경로를 지정하지 않은 경우 (기존 방식)
                output_docx = output_path.with_suffix('.docx')
                cleanup_task = BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))

            # 향상된 PDF를 Word로 변환 함수 호출
            print(f"Converting PDF to DOCX: {temp_pdf} -> {output_docx}")  # 로깅 추가
            await convert_pdf_to_docx_advanced(temp_pdf, output_docx)
            
            # 임시 PDF 삭제
            temp_pdf.unlink()
            
            return FileResponse(
                path=str(output_docx),
                filename=output_docx.name, # 파일 이름은 실제 저장된 파일 이름 사용
                background=cleanup_task
            )
        elif target_format == "image":
            if not image_format:
                raise HTTPException(status_code=400, detail="이미지 형식(jpg 또는 png)을 지정해야 합니다")
                
            # PDF를 이미지로 변환
            reader = PdfReader(temp_pdf)
            num_pages = len(reader.pages)
            
            try:
                # poppler가 존재하는지 확인
                # poppler 경로 디버그 로깅
                logger.info(f"Current poppler path: {poppler_path}")
                if poppler_path:
                    logger.info(f"Path exists: {Path(poppler_path).exists()}")
                    logger.info(f"Directory contents: {list(Path(poppler_path).glob('*')) if Path(poppler_path).exists() else 'Directory not found'}")
                
                try:
                    poppler_exec_paths = [
                        os.path.join(poppler_path, 'pdftocairo'),
                        os.path.join(poppler_path, 'pdftocairo.exe')
                    ]
                    logger.info(f"Checking poppler executables: {poppler_exec_paths}")
                    logger.info(f"Executable exists: {[Path(p).exists() for p in poppler_exec_paths]}")
                    
                    if not any(Path(p).exists() for p in poppler_exec_paths):
                        raise FileNotFoundError("poppler 실행 파일을 찾을 수 없습니다")
                except Exception as e:
                    logger.error(f"poppler 확인 오류: {str(e)}")
                    if platform.system() == 'Darwin':
                        logger.error(f"Project root: {Path(__file__).parent.parent.parent}")
                        logger.error(f"DYLD_LIBRARY_PATH: {os.environ.get('DYLD_LIBRARY_PATH', 'Not set')}")
                    raise
                
                try:
                    # PDF를 이미지로 변환
                    images = convert_from_path(
                        temp_pdf,
                        dpi=300,
                        fmt=image_format,
                        poppler_path=poppler_path
                    )
                except Exception as e:
                    logger.error(f"PDF 변환 오류: {str(e)}")
                    if platform.system() == 'Darwin' and 'DYLD_LIBRARY_PATH' in os.environ:
                        logger.error(f"DYLD_LIBRARY_PATH: {os.environ['DYLD_LIBRARY_PATH']}")
                    raise
                
                if len(images) > 1:
                    # 여러 페이지인 경우 ZIP 파일로 압축
                    zip_filename = f"{os.path.splitext(file.filename)[0]}_images.zip"
                    output_zip = session_dir / zip_filename
                    
                    with zipfile.ZipFile(str(output_zip), "w") as zip_file:
                        for i, image in enumerate(images):
                            # 각 이미지 저장
                            temp_img_path = session_dir / f"page_{i+1}.{image_format}"
                            image.save(
                                str(temp_img_path),
                                format="JPEG" if image_format.lower() == "jpg" else "PNG",
                                quality=95 if image_format.lower() == "jpg" else None
                            )
                            
                            # ZIP 파일에 추가
                            zip_file.write(temp_img_path, f"page_{i+1}.{image_format}")
                            
                            # 임시 이미지 파일 삭제
                            temp_img_path.unlink()
                    
                    temp_pdf.unlink()  # 원본 PDF 삭제
                    
                    return FileResponse(
                        path=str(output_zip),
                        filename=zip_filename,
                        media_type="application/zip",
                        background=BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
                    )
                else:
                    # 단일 페이지인 경우 이미지 파일 하나만 반환
                    output_img = output_path.with_suffix(f'.{image_format}')
                    
                    # 첫 페이지 저장
                    images[0].save(
                        str(output_img),
                        format="JPEG" if image_format.lower() == "jpg" else "PNG",
                        quality=95 if image_format.lower() == "jpg" else None
                    )
                    
                    temp_pdf.unlink()  # 원본 PDF 삭제
                    
                    return FileResponse(
                        path=str(output_img),
                        filename=f"{os.path.splitext(file.filename)[0]}.{image_format}",
                        background=BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
                    )
            
            except Exception as e:
                logger.error(f"PDF 이미지 변환 오류: {str(e)}")
                raise HTTPException(status_code=500, detail=f"PDF를 이미지로 변환하는데 실패했습니다: {str(e)}")
    
    except Exception as e:
        # 오류 발생 시 세션 디렉토리 정리
        shutil.rmtree(session_dir, ignore_errors=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

def extract_text_style(char):
    """PDF 문자의 스타일 정보 추출"""
    return {
        'font_name': char.get('fontname', '').split('+')[-1].replace('-', ' '),
        'font_size': round(float(char.get('size', 11))),
        'color': char.get('non_stroking_color', (0, 0, 0)),
        'bold': 'Bold' in char.get('fontname', ''),
        'italic': 'Italic' in char.get('fontname', '')
    }

def get_alignment(text_block, page_width):
    """텍스트 블록의 정렬 방식 결정"""
    x0, x1 = text_block['x0'], text_block['x1']
    block_width = x1 - x0
    center = page_width / 2

    # 여백과 위치를 고려한 정렬 판단
    margin = 50
    if abs(x0 - margin) < 20 and abs(page_width - x1 - margin) < 20:
        return WD_ALIGN_PARAGRAPH.JUSTIFY
    elif abs(x0 + block_width/2 - center) < 20:
        return WD_ALIGN_PARAGRAPH.CENTER
    elif abs(page_width - x1 - margin) < 20:
        return WD_ALIGN_PARAGRAPH.RIGHT
    else:
        return WD_ALIGN_PARAGRAPH.LEFT

def apply_text_style(run, style):
    """Word 문서의 텍스트 스타일 적용"""
    if style['font_name']:
        run.font.name = style['font_name']
    if style['font_size']:
        run.font.size = Pt(style['font_size'])
    if style['color'] and len(style['color']) == 3:
        r, g, b = [int(c * 255) if isinstance(c, float) else c for c in style['color']]
        run.font.color.rgb = RGBColor(r, g, b)
    run.font.bold = style['bold']
    run.font.italic = style['italic']

async def convert_pdf_to_docx_advanced(pdf_path, docx_path):
    """
    PDF를 DOCX로 변환하는 함수 - Microsoft Office Word 필요
    - Windows: Word COM 자동화 사용
    - macOS: Word for Mac 사용
    """
    logger.info(f"Starting PDF to DOCX conversion. PDF: {pdf_path}, Target DOCX: {docx_path}")
    
    # 출력 디렉토리가 존재하는지 확인하고 생성
    output_dir = os.path.dirname(docx_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        logger.info(f"Ensuring output directory exists: {output_dir}")
    
    if platform.system() == "Windows":
        try:
            import win32com.client
            
            # Word COM 객체 생성
            word = win32com.client.Dispatch("Word.Application")
            word.Visible = False
            
            try:
                # PDF를 Word로 열기
                doc = word.Documents.Open(str(pdf_path))
                # DOCX로 저장
                doc.SaveAs2(str(docx_path), FileFormat=16)  # wdFormatDocumentDefault = 16
                doc.Close()
                logger.info(f"Successfully converted and saved DOCX file in Windows: {docx_path}")
                return True
            finally:
                word.Quit()
                
        except Exception as e:
            logger.error(f"Windows conversion failed: {str(e)}")
            raise RuntimeError(f"Windows에서 Word를 통한 변환 실패: {str(e)}")
            
    elif platform.system() == "Darwin":
        try:
            import subprocess
            import time
            
            # AppleScript 명령어 생성
            applescript = f'''
                tell application "Microsoft Word"
                    activate
                    set pdf_path to POSIX file "{pdf_path}"
                    set docx_path to POSIX file "{docx_path}"
                    
                    -- PDF 열기
                    open pdf_path
                    
                    -- 저장이 완료될 때까지 대기
                    delay 1
                    
                    -- 활성 문서 저장
                    if exists active document then
                        set mydoc to active document
                        save as mydoc file name docx_path file format format document
                        close mydoc saving no
                        return "success"
                    else
                        return "error: no active document"
                    end if
                end tell
            '''
            
            # AppleScript 실행
            logger.info("Executing AppleScript for PDF conversion...")
            process = subprocess.Popen(['osascript', '-e', applescript],
                                    stdout=subprocess.PIPE,
                                    stderr=subprocess.PIPE)
            stdout, stderr = process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode('utf-8')
                logger.error(f"AppleScript execution failed: {error_msg}")
                raise RuntimeError(f"AppleScript 실행 실패: {error_msg}")
            
            result = stdout.decode('utf-8').strip()
            if result == "success":
                logger.info(f"Successfully converted and saved DOCX file in macOS: {docx_path}")
                return True
            else:
                raise RuntimeError(f"문서 변환 실패: {result}")
            
        except Exception as e:
            logger.error(f"macOS conversion failed: {str(e)}")
            raise RuntimeError(f"macOS에서 Word를 통한 변환 실패: {str(e)}")
    
    else:
        error_msg = "PDF를 DOCX로 변환하려면 Windows 또는 macOS와 Microsoft Office가 필요합니다."
        logger.error(error_msg)
        raise RuntimeError(error_msg)

def group_text_into_paragraphs(words, table_bboxes):
    """텍스트 블록을 단락으로 그룹화

    Args:
        words: pdfplumber에서 추출한 단어 목록
        table_bboxes: 테이블의 바운딩 박스 목록 [(x0, y0, x1, y1), ...]

    Returns:
        List[Dict]: 그룹화된 텍스트 블록 목록. 각 블록은 text와 위치 정보를 포함
    """
    if not words:
        return []

    # 단어들을 y축 좌표로 정렬 (상단에서 하단으로)
    sorted_words = sorted(words, key=lambda w: (-w['top'], w['x0']))
    
    # 결과 블록 목록
    text_blocks = []
    
    # 현재 처리 중인 단락 정보
    current_block = {
        'text': '',
        'top': sorted_words[0]['top'],
        'bottom': sorted_words[0]['bottom'],
        'x0': sorted_words[0]['x0'],
        'x1': sorted_words[0]['x1']
    }
    
    # 줄 간격 임계값 (이 값보다 큰 간격은 새로운 단락으로 처리)
    line_spacing_threshold = 2.0
    
    for i, word in enumerate(sorted_words):
        # 테이블 영역 내부의 텍스트는 건너뛰기
        if any(is_within_table(word, bbox) for bbox in table_bboxes):
            continue
            
        # 새로운 단락 시작 조건 확인
        if current_block['text']:
            vertical_gap = abs(word['top'] - current_block['bottom'])
            is_new_paragraph = vertical_gap > (word['bottom'] - word['top']) * line_spacing_threshold
            
            if is_new_paragraph:
                # 현재 블록 저장하고 새로운 블록 시작
                if current_block['text'].strip():
                    text_blocks.append(current_block.copy())
                current_block = {
                    'text': '',
                    'top': word['top'],
                    'bottom': word['bottom'],
                    'x0': word['x0'],
                    'x1': word['x1']
                }
            
        # 현재 단어 추가
        current_block['text'] += (' ' + word['text'] if current_block['text'] else word['text'])
        current_block['bottom'] = max(current_block['bottom'], word['bottom'])
        current_block['x0'] = min(current_block['x0'], word['x0'])
        current_block['x1'] = max(current_block['x1'], word['x1'])
    
    # 마지막 블록 추가
    if current_block['text'].strip():
        text_blocks.append(current_block)
    
    return text_blocks

def is_within_table(word, table_bbox):
    """단어가 테이블 영역 내에 있는지 확인"""
    x0, y0, x1, y1 = table_bbox
    return (word['x0'] >= x0 and word['x1'] <= x1 and
            word['top'] >= y0 and word['bottom'] <= y1)

def clean_table_data(table_data):
    """테이블 데이터에서 빈 행과 열을 정리"""
    if not table_data:
        return []
        
    # 빈 셀 여부 확인 함수
    def is_empty_cell(cell):
        return cell is None or str(cell).strip() == ''
    
    # 빈 행 제거
    filtered_rows = [row for row in table_data if not all(is_empty_cell(cell) for cell in row)]
    
    if not filtered_rows:
        return []
    
    # 모든 행의 길이를 최대 길이에 맞추기
    max_cols = max(len(row) for row in filtered_rows)
    normalized_rows = [row + [None] * (max_cols - len(row)) for row in filtered_rows]
    
    # 빈 열 찾기
    empty_cols = []
    for col in range(max_cols):
        if all(is_empty_cell(row[col]) for row in normalized_rows):
            empty_cols.append(col)
    
    # 빈 열 제거
    filtered_table = []
    for row in normalized_rows:
        filtered_row = [cell for i, cell in enumerate(row) if i not in empty_cols]
        filtered_table.append(filtered_row)
    
    return filtered_table

def extract_images_from_pdf_page(pdf_path, page_num):
    """PDF 페이지에서 이미지 추출 (PyMuPDF 대신 다른 방법 사용)"""
    images = []
    
    try:
        # 방법 1: PyPDF2를 사용하여 이미지 객체 추출 시도
        with open(pdf_path, 'rb') as f:
            pdf_reader = PdfReader(f)
            page = pdf_reader.pages[page_num]
            
            # PDF 페이지의 리소스에서 XObject(이미지) 가져오기 시도
            if '/Resources' in page and '/XObject' in page['/Resources']:
                x_objects = page['/Resources']['/XObject']
                for obj_name, obj in x_objects.items():
                    if obj['/Subtype'] == '/Image':
                        try:
                            # 이미지 데이터 추출
                            data = obj.get_data()
                            # 이미지 타입에 따른 처리
                            if '/Filter' in obj and '/DCTDecode' in obj['/Filter']:
                                # JPEG 형식
                                images.append(data)
                            elif '/Filter' in obj and '/FlateDecode' in obj['/Filter']:
                                # PNG 형식으로 변환
                                width = obj['/Width']
                                height = obj['/Height']
                                color_space = obj['/ColorSpace']
                                
                                # RGB 변환
                                if color_space == '/DeviceRGB':
                                    mode = "RGB"
                                else:
                                    mode = "P"  # 팔레트 모드
                                
                                img = Image.frombytes(mode, (width, height), data)
                                img_byte_arr = BytesIO()
                                img.save(img_byte_arr, format='PNG')
                                images.append(img_byte_arr.getvalue())
                        except Exception as img_err:
                            logger.warning(f"이미지 추출 실패: {str(img_err)}")
    
    except Exception as e:
        logger.warning(f"PyPDF2 이미지 추출 실패: {str(e)}")
    
    # 이미지가 추출되지 않았다면 백업 방법: PDF를 이미지로 변환
    if not images:
        try:
            # OS별 poppler 경로 설정 (이전 코드와 동일)
            poppler_path = None
            if platform.system() == "Windows":
                if getattr(sys, '_MEIPASS', None):
                    # 프로덕션 환경 (PyInstaller로 패키징된 경우)
                    poppler_path = os.path.join(sys._MEIPASS, 'poppler', 'bin')
                else:
                    # 개발 환경
                    poppler_path = str(Path(__file__).parent.parent / "poppler" / "windows" / "poppler-24.08.0" / "Library" / "bin")
            elif platform.system() == "Darwin":
                if getattr(sys, '_MEIPASS', None):
                    base_path = Path(sys._MEIPASS)
                    poppler_path = str(base_path / "poppler" / "bin")
                else:
                    base_path = Path(__file__).parent.parent
                    poppler_path = str(base_path / "poppler" / "mac" / "25.03.0" / "bin")
            
            # PDF 페이지를 이미지로 변환
            page_images = convert_from_path(
                pdf_path, 
                first_page=page_num+1, 
                last_page=page_num+1,
                dpi=300,
                fmt='png',
                poppler_path=poppler_path
            )
            
            # 전체 페이지 이미지를 바이트로 변환
            if page_images:
                img_byte_arr = BytesIO()
                page_images[0].save(img_byte_arr, format='PNG')
                images.append(img_byte_arr.getvalue())
        
        except Exception as e:
            logger.warning(f"PDF2Image 변환 실패: {str(e)}")
    
    return images

@app.post("/encrypt")
async def encrypt_pdf(
    file: UploadFile,
    password: str = Form(...),
    allow_printing: bool = Form(True),
    allow_commenting: bool = Form(True)
):
    """PDF 파일 암호화
    
    Args:
        file: PDF 파일
        password: 암호화에 사용할 비밀번호
        allow_printing: 인쇄 허용 여부
        allow_commenting: 주석 허용 여부
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 지원됩니다")

    session_dir = get_session_dir()
    temp_path = session_dir / f"temp_{file.filename}"
    output_path = session_dir / f"encrypted_{file.filename}"

    try:
        # 업로드된 파일 저장
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # PDF 처리
        reader = PdfReader(temp_path)
        writer = PdfWriter()

        # 모든 페이지 복사
        for page in reader.pages:
            writer.add_page(page)

        # 암호화 설정 (AES-256-R5 알고리즘 사용)
        writer.encrypt(
            user_password=password,
            owner_password=password,  # 소유자 비밀번호도 동일하게 설정
            algorithm="AES-256-R5"  # 권장되는 안전한 암호화 알고리즘
        )

        # 결과 저장
        with open(output_path, "wb") as output_file:
            writer.write(output_file)

        # 임시 파일 삭제
        temp_path.unlink()

        return FileResponse(
            path=str(output_path),
            filename=f"encrypted_{file.filename}",
            background=BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
        )

    except Exception as e:
        # 오류 발생 시 세션 디렉토리 정리
        shutil.rmtree(session_dir, ignore_errors=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/decrypt")
async def decrypt_pdf(
    file: UploadFile,
    password: str = Form(...)
):
    """PDF 파일 복호화
    
    Args:
        file: 암호화된 PDF 파일
        password: 복호화를 위한 비밀번호
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 지원됩니다")

    session_dir = get_session_dir()
    temp_path = session_dir / f"temp_{file.filename}"
    output_path = session_dir / f"decrypted_{file.filename}"

    try:
        # 업로드된 파일 저장
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # PDF 처리
        reader = PdfReader(temp_path)
        
        # 암호화 여부 확인
        if not reader.is_encrypted:
            raise HTTPException(status_code=400, detail="암호화되지 않은 PDF 파일입니다")

        try:
            # 비밀번호로 복호화 시도
            reader.decrypt(password)
        except:
            raise HTTPException(status_code=400, detail="잘못된 비밀번호입니다")

        # 복호화된 PDF 생성
        writer = PdfWriter()
        
        # 모든 페이지 복사
        for page in reader.pages:
            writer.add_page(page)

        # 결과 저장
        with open(output_path, "wb") as output_file:
            writer.write(output_file)

        # 임시 파일 삭제
        temp_path.unlink()

        return FileResponse(
            path=str(output_path),
            filename=f"decrypted_{file.filename}",
            background=BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
        )

    except Exception as e:
        # 오류 발생 시 세션 디렉토리 정리
        shutil.rmtree(session_dir, ignore_errors=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/add-watermark")
async def add_watermark(
    file: UploadFile,
    watermark_type: Literal["text", "image"] = Form(...),
    watermark_text: str = Form(None),
    watermark_image: UploadFile = None,
    opacity: float = Form(0.5),
    rotation: int = Form(0),
    position: Literal["center", "tile", "top-left", "top-right", "bottom-left", "bottom-right"] = Form("center"),
    font_size: int = Form(40),
    font_name: Literal["NotoSansKR", "Arial", "Times"] = Form("NotoSansKR"),
    font_color: str = Form("#000000"),
    font_bold: str = Form("false"),  # 문자열로 받아서 파싱
    pages: str = Form("all")
):
    print("폰트:"+font_bold)
    """PDF에 워터마크 추가
    
    Args:
        file: 원본 PDF 파일
        watermark_type: 워터마크 유형 (text / image)
        watermark_text: 텍스트 워터마크 내용
        watermark_image: 이미지 워터마크 파일
        opacity: 투명도 (0.0 - 1.0)
        rotation: 회전 각도 (0 - 360)
        position: 워터마크 위치
        font_size: 폰트 크기 (텍스트 워터마크)
        font_name: 폰트 이름 (텍스트 워터마크)
        font_color: 폰트 색상 (텍스트 워터마크, HEX 형식)
        font_bold: 볼드체 사용 여부 ("true" 또는 "false")
        pages: 워터마크 적용 페이지 ("all" 또는 "1-3,5,7")
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 지원됩니다")
    
    if watermark_type == "text" and not watermark_text:
        raise HTTPException(status_code=400, detail="텍스트 워터마크 내용을 입력해주세요")
    
    if watermark_type == "image" and not watermark_image:
        raise HTTPException(status_code=400, detail="이미지 워터마크 파일을 업로드해주세요")
    
    session_dir = get_session_dir()
    temp_path = session_dir / f"temp_{file.filename}"
    output_path = session_dir / f"watermarked_{file.filename}"
    watermark_pdf = session_dir / "watermark.pdf"
    
    try:
        # 업로드된 PDF 파일 저장
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # 이미지 워터마크인 경우 임시 파일로 저장
        watermark_img_path = None
        if (watermark_type == "image" and watermark_image):
            watermark_img_path = session_dir / f"watermark_{watermark_image.filename}"
            with open(watermark_img_path, "wb") as buffer:
                content = await watermark_image.read()
                buffer.write(content)
        
        # PDF 읽기
        reader = PdfReader(temp_path)
        total_pages = len(reader.pages)
        
        # 페이지 범위 확인
        if pages.lower() == "all":
            pages_to_watermark = list(range(total_pages))
        else:
            try:
                # 페이지 번호는 1부터 시작하므로 인덱스로 변환
                page_indices = parse_page_ranges(pages, total_pages)
                pages_to_watermark = [p - 1 for p in page_indices]  # 0-based index로 변환
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
        
        # 워터마크 PDF 생성
        if watermark_type == "text":
            # 텍스트 워터마크 처리
            # RGB 색상 파싱
            color = font_color.lstrip('#')
            r, g, b = tuple(int(color[i:i+2], 16) for i in (0, 2, 4))
            
            # 폰트 설정
            # PyInstaller가 생성한 임시 경로 확인
            if getattr(sys, '_MEIPASS', None):
                font_path = os.path.join(sys._MEIPASS, 'pdf_processor', 'fonts')
            else:
                font_path = os.path.join(os.path.dirname(__file__), '..', 'fonts')
            
            is_bold = font_bold.lower() == "true"
            
            if font_name == "NotoSansKR":
                # 일반 폰트와 볼드 폰트 파일 경로 설정
                regular_font_file = os.path.join(font_path, 'NotoSansKR-Regular.ttf')
                bold_font_file = os.path.join(font_path, 'NotoSansKR-Bold.ttf')
                
                # 폰트 등록
                pdfmetrics.registerFont(TTFont('NotoSansKR-Regular', regular_font_file))
                pdfmetrics.registerFont(TTFont('NotoSansKR-Bold', bold_font_file))

            # 각 페이지 크기에 맞는 워터마크 PDF를 생성하기 위한 준비
            watermark_pdfs = []
            reader = PdfReader(temp_path)

            for i in pages_to_watermark:
                page = reader.pages[i]
                page_width = float(page.mediabox.width)
                page_height = float(page.mediabox.height)

                # 각 페이지용 워터마크 PDF 생성
                watermark_path = session_dir / f"watermark_{i}.pdf"
                watermark_pdfs.append(watermark_path)
                c = canvas.Canvas(str(watermark_path), pagesize=(page_width, page_height))

                # 폰트 설정
                if font_name == "NotoSansKR":
                    # 일반/볼드 폰트 선택
                    font_key = 'NotoSansKR-Bold' if is_bold else 'NotoSansKR-Regular'
                    c.setFont(font_key, font_size)
                else:
                    font_key = f"{font_name}-Bold" if is_bold else font_name
                    c.setFont(font_key, font_size)

                # 색상 설정
                c.setFillColorRGB(r/255, g/255, b/255, alpha=opacity)

                # 회전 준비
                c.saveState()

                if position == "center":
                    # 중앙에 워터마크 그리기 (상단 기준)
                    text_width = c.stringWidth(watermark_text, font_key, font_size)
                    x = (page_width - text_width) / 2
                    y = page_height - ((page_height - font_size) / 2)
                    c.translate(x + text_width/2, y - font_size/2)
                    c.rotate(rotation)
                    c.drawString(-text_width/2, 0, watermark_text)
                elif position == "tile":
                    # 타일 패턴으로 워터마크 그리기
                    text_width = c.stringWidth(watermark_text, font_key, font_size)
                    tile_size = max(text_width, font_size) * 2
                    
                    # 페이지 전체를 덮도록 여유있게 계산
                    start_y = page_height + tile_size
                    end_y = -tile_size
                    
                    for x in range(0, int(page_width + tile_size), int(tile_size)):
                        for y in range(int(start_y), int(end_y), -int(tile_size)):
                            c.saveState()
                            c.translate(x, y)
                            c.rotate(rotation)
                            c.drawString(-text_width/2, -font_size/2, watermark_text)
                            c.restoreState()
                else:
                    # 지정된 위치에 워터마크 그리기 (상단 기준)
                    text_width = c.stringWidth(watermark_text, font_key, font_size)
                    margin = 50  # 여백

                    # 여백 조정 (텍스트가 화면을 벗어나지 않도록)
                    min_x = margin
                    max_x = page_width - margin - text_width
                    min_y = margin + font_size
                    max_y = page_height - margin

                    if position == "top-left":
                        x, y = min_x, max_y
                    elif position == "top-right":
                        x, y = max_x, max_y
                    elif position == "bottom-left":
                        x, y = min_x, min_y
                    elif position == "bottom-right":
                        x, y = max_x, min_y

                    # 화면 범위를 벗어나지 않도록 좌표 보정
                    x = max(min_x, min(x, max_x))
                    y = max(min_y, min(y, max_y))

                    c.translate(x + text_width/2, y - font_size/2)
                    c.rotate(rotation)
                    c.drawString(-text_width/2, 0, watermark_text)

                c.restoreState()
                c.save()

            # 기존 워터마크 PDF 파일은 더 이상 필요하지 않음
            
        elif watermark_type == "image" and watermark_img_path:
            # 이미지 워터마크 처리
            try:
                # 이미지 로드
                img = Image.open(watermark_img_path)
                
                # 이미지에 투명도 적용
                if img.mode != 'RGBA':
                    img = img.convert('RGBA')
                
                # 투명도 적용 (각 픽셀의 알파 채널 조정)
                datas = img.getdata()
                new_data = []
                for item in datas:
                    # RGBA에서 알파값을 조정
                    new_data.append((item[0], item[1], item[2], int(item[3] * opacity) if len(item) > 3 else int(255 * opacity)))
                img.putdata(new_data)
                
                # 이미지 크기 조정
                max_size = 300  # 최대 크기 제한
                if img.width > max_size or img.height > max_size:
                    ratio = min(max_size / img.width, max_size / img.height)
                    new_size = (int(img.width * ratio), int(img.height * ratio))
                    img = img.resize(new_size, Image.Resampling.LANCZOS)
                
                # 각 페이지에 대한 워터마크 생성
                watermark_pdfs = []
                
                for i in pages_to_watermark:
                    page = reader.pages[i]
                    page_width = float(page.mediabox.width)
                    page_height = float(page.mediabox.height)
                    
                    # 각 페이지용 워터마크 PDF 생성
                    watermark_path = session_dir / f"watermark_{i}.pdf"
                    watermark_pdfs.append(watermark_path)
                    
                    img_io = BytesIO()
                    img.save(img_io, format='PNG')
                    img_io.seek(0)
                    
                    c = canvas.Canvas(str(watermark_path), pagesize=(page_width, page_height))
                    
                    # 이미지 크기
                    img_width, img_height = img.size
                    
                    # 회전 설정
                    c.saveState()
                    
                    if position == "center":
                        # 중앙에 이미지 배치 (상단 기준)
                        x = (page_width - img_width) / 2
                        y = page_height - ((page_height - img_height) / 2)
                        c.translate(x + img_width/2, y - img_height/2)
                        c.rotate(rotation)
                        c.drawImage(ImageReader(img), -img_width/2, -img_height/2, width=img_width, height=img_height, mask='auto')
                    elif position == "tile":
                        # 타일 패턴으로 배치
                        tile_spacing = max(img_width, img_height) * 1.5
                        
                        # 페이지 전체를 덮도록 여유있게 계산
                        start_y = page_height + tile_spacing
                        end_y = -tile_spacing
                        
                        for x in range(0, int(page_width + tile_spacing), int(tile_spacing)):
                            for y in range(int(start_y), int(end_y), -int(tile_spacing)):
                                c.saveState()
                                c.translate(x + img_width/2, y)
                                c.rotate(rotation)
                                c.drawImage(ImageReader(img), -img_width/2, -img_height/2, width=img_width, height=img_height, mask='auto')
                                c.restoreState()
                    else:
                        # 지정된 위치에 배치 (상단 기준)
                        margin = 50  # 여백
                        if position == "top-left":
                            x, y = margin, page_height
                        elif position == "top-right":
                            x, y = page_width - margin - img_width, page_height
                        elif position == "bottom-left":
                            x, y = margin, img_height
                        elif position == "bottom-right":
                            x, y = page_width - margin - img_width, img_height
                        
                        c.translate(x + img_width/2, y - img_height/2)
                        c.rotate(rotation)
                        c.drawImage(ImageReader(img), -img_width/2, -img_height/2, width=img_width, height=img_height, mask='auto')
                    
                    c.restoreState()
                    c.save()
                
            except Exception as e:
                # 생성된 워터마크 PDF들 정리
                for wp in watermark_pdfs:
                    if wp.exists():
                        wp.unlink()
                raise HTTPException(status_code=500, detail=f"이미지 워터마크 처리 실패: {str(e)}")
        
        # 결과 PDF 생성
        writer = PdfWriter()
        
        # 각 페이지에 워터마크 적용
        for i in range(total_pages):
            page = reader.pages[i]
            
            if i in pages_to_watermark:
                # 해당 페이지의 워터마크 PDF 읽기
                watermark_path = session_dir / f"watermark_{i}.pdf"
                if watermark_path.exists():
                    watermark_reader = PdfReader(str(watermark_path))
                    watermark_page = watermark_reader.pages[0]
                    # 워터마크 적용
                    page.merge_page(watermark_page)
                    # 사용한 워터마크 PDF 삭제
                    watermark_path.unlink()
            
            # 결과 PDF에 페이지 추가
            writer.add_page(page)
        
        # 결과 저장
        with open(output_path, "wb") as output_file:
            writer.write(output_file)
        
        # 임시 파일 삭제
        temp_path.unlink()
        if watermark_img_path and watermark_img_path.exists():
            watermark_img_path.unlink()
        
        return FileResponse(
            path=str(output_path),
            filename=f"watermarked_{file.filename}",
            background=BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
        )
        
    except Exception as e:
        # 오류 발생 시 세션 디렉토리 정리
        shutil.rmtree(session_dir, ignore_errors=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))