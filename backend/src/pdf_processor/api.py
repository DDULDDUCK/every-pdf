from fastapi import FastAPI, UploadFile, HTTPException, BackgroundTasks, Form
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from starlette.middleware.cors import CORSMiddleware
from PyPDF2 import PdfReader, PdfWriter
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
from pdf2docx import Converter
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

logger = logging.getLogger(__name__)

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
    image_format: Literal["jpg", "png"] = Form(None)
):
    """PDF를 다른 형식으로 변환"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 지원됩니다")
    
    session_dir = get_session_dir()
    temp_pdf = session_dir / f"temp_{file.filename}"
    output_path = session_dir / f"{os.path.splitext(file.filename)[0]}"
    
    # OS별 poppler 경로 설정
    poppler_path = None
    if platform.system() == "Darwin":  # macOS
        poppler_path = str(Path(__file__).parent.parent / "poppler" / "macos" / "25.03.0" / "bin")
    elif platform.system() == "Windows":
        poppler_path = str(Path(__file__).parent.parent / "poppler" / "windows" / "poppler-24.08.0" / "Library" / "bin")

    try:
        # 업로드된 PDF 파일 저장
        with open(temp_pdf, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        if target_format == "docx":
            output_docx = output_path.with_suffix('.docx')
            # PDF를 Word로 변환
            cv = Converter(temp_pdf)
            cv.convert(output_docx)
            cv.close()
            
            # 임시 PDF 삭제
            temp_pdf.unlink()
            
            return FileResponse(
                path=str(output_docx),
                filename=f"{os.path.splitext(file.filename)[0]}.docx",
                background=BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
            )
            
        elif target_format == "image":
            if not image_format:
                raise HTTPException(status_code=400, detail="이미지 형식(jpg 또는 png)을 지정해야 합니다")
                
            # PDF를 이미지로 변환
            reader = PdfReader(temp_pdf)
            num_pages = len(reader.pages)
            
            try:
                # PDF를 이미지로 변환
                images = convert_from_path(
                    temp_pdf,
                    dpi=300,
                    fmt=image_format,
                    poppler_path=poppler_path
                )
                
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
    pages: str = Form("all")
):
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
        if watermark_type == "image" and watermark_image:
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
            
            # 원본 PDF의 첫 페이지 크기 가져오기
            with open(temp_path, 'rb') as pdf_file:
                pdf_reader = PdfReader(pdf_file)
                first_page = pdf_reader.pages[0]
                page_width = float(first_page.mediabox.width)
                page_height = float(first_page.mediabox.height)

            # 워터마크용 PDF 생성 (원본 PDF와 같은 크기로)
            c = canvas.Canvas(str(watermark_pdf), pagesize=(page_width, page_height))
            
            # 폰트 설정
            font_path = os.path.join(os.path.dirname(__file__), '..', 'fonts')
            if font_name == "NotoSansKR":
                font_file = os.path.join(font_path, 'NotoSansKR-VariableFont_wght.ttf')
                pdfmetrics.registerFont(TTFont('NotoSansKR', font_file))
                c.setFont('NotoSansKR', font_size)
            else:
                # 기본 폰트 사용
                c.setFont(font_name, font_size)
            
            # 색상 설정
            c.setFillColorRGB(r/255, g/255, b/255, alpha=opacity)
            
            # 회전 준비
            c.saveState()
            
            if position == "center":
                # 중앙에 워터마크 그리기 (상단 기준)
                text_width = c.stringWidth(watermark_text, font_name if font_name != "NotoSansKR" else "NotoSansKR", font_size)
                x = (page_width - text_width) / 2
                y = page_height - ((page_height - font_size) / 2)
                c.translate(x + text_width/2, y - font_size/2)
                c.rotate(rotation)
                c.drawString(-text_width/2, 0, watermark_text)
            elif position == "tile":
                # 타일 패턴으로 워터마크 그리기 (상단에서 시작)
                text_width = c.stringWidth(watermark_text, font_name if font_name != "NotoSansKR" else "NotoSansKR", font_size)
                tile_size = max(text_width, font_size) * 2
                for x in range(0, int(page_width), int(tile_size)):
                    for y in range(int(page_height), -int(tile_size), -int(tile_size)):
                        c.saveState()
                        c.translate(x, y)
                        c.rotate(rotation)
                        c.drawString(0, 0, watermark_text)
                        c.restoreState()
            else:
                # 지정된 위치에 워터마크 그리기 (상단 기준)
                text_width = c.stringWidth(watermark_text, font_name if font_name != "NotoSansKR" else "NotoSansKR", font_size)
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
                
                # 워터마크용 PDF 생성
                img_io = BytesIO()
                img.save(img_io, format='PNG')
                img_io.seek(0)
                
                # 원본 PDF의 첫 페이지 크기 가져오기
                with open(temp_path, 'rb') as pdf_file:
                    pdf_reader = PdfReader(pdf_file)
                    first_page = pdf_reader.pages[0]
                    page_width = float(first_page.mediabox.width)
                    page_height = float(first_page.mediabox.height)

                # 워터마크용 PDF 생성 (원본 PDF와 같은 크기로)
                c = canvas.Canvas(str(watermark_pdf), pagesize=(page_width, page_height))
                
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
                    # 타일 패턴으로 배치 (상단에서 시작)
                    tile_spacing = max(img_width, img_height) * 1.5
                    for x in range(0, int(page_width), int(tile_spacing)):
                        for y in range(int(page_height), -int(tile_spacing), -int(tile_spacing)):
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
                raise HTTPException(status_code=500, detail=f"이미지 워터마크 처리 실패: {str(e)}")
        
        # 워터마크 PDF 읽기
        watermark_reader = PdfReader(watermark_pdf)
        watermark_page = watermark_reader.pages[0]
        
        # 결과 PDF 생성
        writer = PdfWriter()
        
        # 각 페이지에 워터마크 적용
        for i in range(total_pages):
            page = reader.pages[i]
            
            if i in pages_to_watermark:
                # 워터마크 적용
                page.merge_page(watermark_page)
            
            # 결과 PDF에 페이지 추가
            writer.add_page(page)
        
        # 결과 저장
        with open(output_path, "wb") as output_file:
            writer.write(output_file)
        
        # 임시 파일 삭제
        temp_path.unlink()
        watermark_pdf.unlink()
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