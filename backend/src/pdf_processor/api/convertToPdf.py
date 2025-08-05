from fastapi import APIRouter, UploadFile, HTTPException, Form
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from typing import List, Literal
import os
import sys
import shutil
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO
from xhtml2pdf import pisa
import img2pdf

from ..utils import get_session_dir, parse_page_ranges

router = APIRouter()

@router.post("/convert-to-pdf")
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
            
            temp_path = session_dir / f"temp_{files[0].filename}"
            content = await files[0].read()
            with open(temp_path, "wb") as buffer:
                buffer.write(content)
            
            if getattr(sys, '_MEIPASS', None):
                font_path = os.path.join(sys._MEIPASS, 'pdf_processor', 'fonts', 'NotoSansKR-VariableFont_wght.ttf')
            else:
                font_path = os.path.join(os.path.dirname(__file__), '..', 'fonts', 'NotoSansKR-VariableFont_wght.ttf')
            
            with open(temp_path, 'r', encoding='utf-8') as f:
                text = f.read()
            
            c = canvas.Canvas(str(output_path), pagesize=letter)
            pdfmetrics.registerFont(TTFont('NotoSansKR', font_path))
            c.setFont('NotoSansKR', 12)
            margin = 50
            line_height = 20
            max_width = letter[0] - 2 * margin
            y = letter[1] - margin
            
            def get_wrapped_lines(text, c, max_width):
                lines = []
                current_line = ''
                for word in text.split():
                    if c.stringWidth(word, 'NotoSansKR', 12) > max_width:
                        if current_line:
                            lines.append(current_line)
                            current_line = ''
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
                        test_line = current_line + ' ' + word if current_line else word
                        if c.stringWidth(test_line, 'NotoSansKR', 12) <= max_width:
                            current_line = test_line
                        else:
                            lines.append(current_line)
                            current_line = word
                if current_line:
                    lines.append(current_line)
                return lines
            
            for paragraph in text.split('\n'):
                if not paragraph.strip():
                    y -= line_height
                    if y <= margin:
                        c.showPage()
                        c.setFont('NotoSansKR', 12)
                        y = letter[1] - margin
                    continue
                wrapped_lines = get_wrapped_lines(paragraph, c, max_width)
                for line in wrapped_lines:
                    if y <= margin:
                        c.showPage()
                        c.setFont('NotoSansKR', 12)
                        y = letter[1] - margin
                    c.drawString(margin, y, line)
                    y -= line_height
                y -= line_height * 0.5
            c.save()
            temp_path.unlink()
        
        elif source_format == "html":
            if not files[0].filename.lower().endswith('.html'):
                raise HTTPException(status_code=400, detail="HTML 파일만 지원됩니다")
            temp_path = session_dir / f"temp_{files[0].filename}"
            with open(temp_path, "wb") as buffer:
                content = await files[0].read()
                buffer.write(content)
            font_path = os.path.join(os.path.dirname(__file__), '..', '..', 'fonts', 'NotoSansKR-VariableFont_wght.ttf')
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
            result_pdf = BytesIO()
            pisa_status = pisa.CreatePDF(
                styled_html,
                dest=result_pdf
            )
            if not pisa_status.err:
                with open(output_path, 'wb') as f:
                    f.write(result_pdf.getvalue())
            else:
                raise HTTPException(status_code=500, detail="HTML을 PDF로 변환하는데 실패했습니다.")
            temp_path.unlink()
        
        elif source_format == "image":
            if not all(any(f.filename.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png']) for f in files):
                raise HTTPException(status_code=400, detail="JPG, JPEG, PNG 이미지만 지원됩니다")
            image_paths = []
            for i, file in enumerate(files):
                temp_image = session_dir / f"temp_image_{i}_{file.filename}"
                content = await file.read()
                with open(temp_image, "wb") as buffer:
                    buffer.write(content)
                image_paths.append(temp_image)
            try:
                with open(output_path, "wb") as output_file:
                    output_file.write(img2pdf.convert([str(p) for p in image_paths]))
            finally:
                for path in image_paths:
                    if path.exists():
                        path.unlink()
        
        return FileResponse(
            path=str(output_path),
            filename=f"{os.path.splitext(files[0].filename)[0]}.pdf",
            background=BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
        )
    
    except Exception as e:
        shutil.rmtree(session_dir, ignore_errors=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))