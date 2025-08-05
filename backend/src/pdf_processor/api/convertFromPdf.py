from fastapi import APIRouter, UploadFile, HTTPException, BackgroundTasks, Form
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from typing import List, Literal
import os
import sys
import tempfile
import logging
import shutil
import zipfile
from pathlib import Path
import uuid
import platform
from pdf2image import convert_from_path
import img2pdf
from PIL import Image
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

from pdf_processor.utils import get_session_dir

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/convert-from-pdf")
async def convert_from_pdf(
    file: UploadFile,
    target_format: Literal["docx", "image"] = Form(...),
    image_format: Literal["jpg", "png"] = Form(None),
    output_path_str: str = Form(None)
):
    """PDF를 다른 형식으로 변환"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 지원됩니다")
    
    session_dir = get_session_dir()
    temp_pdf = session_dir / f"temp_{file.filename}"
    output_path = session_dir / f"{os.path.splitext(file.filename)[0]}"
    
    poppler_path = None
    if platform.system() == "Windows":
        if getattr(sys, '_MEIPASS', None):
            base_path = Path(sys._MEIPASS)
            poppler_path = str(base_path / "poppler" / "bin")
        else:
            poppler_path = str(Path(__file__).parent.parent.parent / "poppler" / "windows" / "poppler-24.08.0" / "Library" / "bin")
    elif platform.system() == "Darwin":
        if getattr(sys, '_MEIPASS', None):
            base_path = Path(sys._MEIPASS)
            poppler_path = str(base_path / "poppler" / "bin")
            lib_path = str(base_path / "poppler" / "lib")
        else:
            base_path = Path(__file__).parent.parent.parent
            poppler_path = str(base_path / "poppler" / "mac" / "25.03.0" / "bin")
            lib_path = str(base_path / "poppler" / "mac" / "25.03.0" / "lib")
        os.environ['DYLD_LIBRARY_PATH'] = lib_path
        os.environ['PATH'] = f"{poppler_path}:{os.environ.get('PATH', '')}"

    try:
        with open(temp_pdf, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        if target_format == "docx":
            if output_path_str:
                output_docx = Path(output_path_str)
                try:
                    output_docx.parent.mkdir(parents=True, exist_ok=True)
                except Exception as dir_err:
                    raise HTTPException(status_code=500, detail=f"Failed to create output directory: {dir_err}")
                cleanup_task = BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
            else:
                output_docx = output_path.with_suffix('.docx')
                cleanup_task = BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))

            await convert_pdf_to_docx_advanced(temp_pdf, output_docx)
            temp_pdf.unlink()
            return FileResponse(
                path=str(output_docx),
                filename=output_docx.name,
                background=cleanup_task
            )
        elif target_format == "image":
            if not image_format:
                raise HTTPException(status_code=400, detail="이미지 형식(jpg 또는 png)을 지정해야 합니다")
            from pypdf import PdfReader
            reader = PdfReader(temp_pdf)
            num_pages = len(reader.pages)
            try:
                images = convert_from_path(
                    temp_pdf,
                    dpi=300,
                    fmt=image_format,
                    poppler_path=poppler_path
                )
                if len(images) > 1:
                    zip_filename = f"{os.path.splitext(file.filename)[0]}_images.zip"
                    output_zip = session_dir / zip_filename
                    with zipfile.ZipFile(str(output_zip), "w") as zip_file:
                        for i, image in enumerate(images):
                            temp_img_path = session_dir / f"page_{i+1}.{image_format}"
                            image.save(
                                str(temp_img_path),
                                format="JPEG" if image_format.lower() == "jpg" else "PNG",
                                quality=95 if image_format.lower() == "jpg" else None
                            )
                            zip_file.write(temp_img_path, f"page_{i+1}.{image_format}")
                            temp_img_path.unlink()
                    temp_pdf.unlink()
                    return FileResponse(
                        path=str(output_zip),
                        filename=zip_filename,
                        media_type="application/zip",
                        background=BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
                    )
                else:
                    output_img = output_path.with_suffix(f'.{image_format}')
                    images[0].save(
                        str(output_img),
                        format="JPEG" if image_format.lower() == "jpg" else "PNG",
                        quality=95 if image_format.lower() == "jpg" else None
                    )
                    temp_pdf.unlink()
                    return FileResponse(
                        path=str(output_img),
                        filename=f"{os.path.splitext(file.filename)[0]}.{image_format}",
                        background=BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
                    )
            except Exception as e:
                logger.error(f"PDF 이미지 변환 오류: {str(e)}")
                raise HTTPException(status_code=500, detail=f"PDF를 이미지로 변환하는데 실패했습니다: {str(e)}")
    except Exception as e:
        shutil.rmtree(session_dir, ignore_errors=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

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