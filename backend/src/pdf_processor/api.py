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
from pdf2docx import Converter
import img2pdf
import fitz  # PyMuPDF
from PIL import Image
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from xhtml2pdf import pisa
from io import BytesIO
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

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
            
            y = 750  # 시작 y 위치
            for line in text.split('\n'):
                if y <= 50:  # 새 페이지 시작
                    c.showPage()
                    c.setFont('NotoSansKR', 12)  # 새 페이지에서도 폰트 설정 유지
                    y = 750
                c.drawString(50, y, line)
                y -= 15
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
            
            # 폰트와 기본 스타일 추가
            styled_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    @font-face {{
                        font-family: 'NotoSansKR';
                        src: url('file://{font_path}');
                        font-weight: normal;
                        font-style: normal;
                    }}
                    * {{
                        font-family: 'NotoSansKR', sans-serif !important;
                    }}
                    body {{
                        font-size: 12px;
                        line-height: 1.5;
                    }}
                </style>
            </head>
            <body>
                {html_content}
            </body>
            </html>
            """
            
            # HTML을 PDF로 변환
            result_pdf = BytesIO()
            pdf_options = {
                'encoding': 'utf-8',
                'load_ttf_fonts': {
                    'NotoSansKR': font_path
                }
            }
            
            pisa_status = pisa.CreatePDF(
                styled_html,
                dest=result_pdf,
                **pdf_options
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
            pdf_document = fitz.open(temp_pdf)
            
            if len(pdf_document) > 1:
                # 여러 페이지가 있는 경우 ZIP 파일로 저장
                zip_filename = f"{os.path.splitext(file.filename)[0]}_images.zip"
                output_zip = session_dir / zip_filename
                
                with zipfile.ZipFile(str(output_zip), "w") as zip_file:
                    for page_num in range(len(pdf_document)):
                        page = pdf_document[page_num]
                        # 더 높은 해상도로 pixmap 생성
                        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                        
                        # 이미지로 변환
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        
                        # 각 페이지를 임시 이미지 파일로 저장
                        temp_img = session_dir / f"page_{page_num + 1}.{image_format}"
                        img.save(str(temp_img), format="JPEG" if image_format.lower() == "jpg" else "PNG")
                        
                        # 임시 이미지 파일을 ZIP에 추가
                        zip_file.write(temp_img, f"page_{page_num + 1}.{image_format}")
                        temp_img.unlink()  # 임시 이미지 파일 삭제
                
                pdf_document.close()
                temp_pdf.unlink()  # 임시 PDF 삭제
                
                return FileResponse(
                    path=str(output_zip),
                    filename=zip_filename,
                    media_type="application/zip",
                    background=BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
                )
            else:
                # 단일 페이지인 경우 이미지 파일로 저장
                output_img = output_path.with_suffix(f'.{image_format}')
                page = pdf_document[0]
                # 더 높은 해상도로 pixmap 생성
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                # 이미지로 변환
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                # 이미지 저장
                img.save(str(output_img), format="JPEG" if image_format.lower() == "jpg" else "PNG")
                
                pdf_document.close()
                temp_pdf.unlink()  # 임시 PDF 삭제
                
                return FileResponse(
                    path=str(output_img),
                    filename=f"{os.path.splitext(file.filename)[0]}.{image_format}",
                    background=BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
                )
    
    except Exception as e:
        # 오류 발생 시 세션 디렉토리 정리
        shutil.rmtree(session_dir, ignore_errors=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))