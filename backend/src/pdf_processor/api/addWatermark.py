# pdf_processor/addWatermark.py

from fastapi import APIRouter, UploadFile, HTTPException, Form
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from typing import Literal
from pathlib import Path
from pypdf import PdfReader, PdfWriter
import os
import sys
import shutil
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from reportlab.lib.colors import HexColor
from io import BytesIO

from pdf_processor.utils import get_session_dir, parse_page_ranges

router = APIRouter()

def draw_watermark_on_canvas(c, page_width, page_height, options):
    """
    텍스트 렌더링을 editor.py와 동일한 TextObject 방식으로 최종 수정한 버전.
    """
    font_size_px = options.get('font_size', 40)
    opacity = options.get('opacity', 0.5)
    
    if options['watermark_type'] == 'text':
        font_key = 'NotoSansKR-Bold' if options.get('is_bold') else 'NotoSansKR-Regular'
        element_width = pdfmetrics.stringWidth(options.get('watermark_text', ''), font_key, font_size_px)
        element_height = font_size_px
    elif options['watermark_type'] == 'image':
        element_width, element_height = options.get('image_size', (0, 0))
    else:
        return

    def draw_element_in_box(box_x, box_y, box_width, box_height):
        cx = box_x + box_width / 2
        cy = box_y + box_height / 2
        
        c.saveState()
        c.translate(cx, cy)
        c.rotate(options['rotation'])

        if options['watermark_type'] == 'text':
            # --- 여기가 editor.py와 동일하게 수정된 부분 ---
            text_object = c.beginText()
            text_object.setFont(font_key, font_size_px)
            text_object.setFillColor(HexColor(options['font_color']), alpha=opacity)
            
            # 텍스트를 그릴 시작점 계산 (회전된 좌표계의 원점 기준)
            # 좌측: -element_width / 2
            # 상단(베이스라인 기준): element_height / 2 - element_height
            start_x = -element_width / 2
            start_y = element_height / 2 - element_height
            
            text_object.setTextOrigin(start_x, start_y)
            text_object.textLine(options.get('watermark_text', ''))
            c.drawText(text_object)
            # --- 수정 끝 ---
        elif options['watermark_type'] == 'image' and 'image_obj' in options:
            c.drawImage(options['image_obj'], -element_width / 2, -element_height / 2, width=element_width, height=element_height, mask='auto')
        
        c.restoreState()

    margin = 50
    position = options['position']

    if position == 'center':
        draw_element_in_box(0, 0, page_width, page_height)
    elif position == 'top-left':
        draw_element_in_box(margin, page_height - margin - element_height, element_width, element_height)
    elif position == 'top-right':
        draw_element_in_box(page_width - margin - element_width, page_height - margin - element_height, element_width, element_height)
    elif position == 'bottom-left':
        draw_element_in_box(margin, margin, element_width, element_height)
    elif position == 'bottom-right':
        draw_element_in_box(page_width - margin - element_width, margin, element_width, element_height)
    elif position == 'tile':
        tile_w = page_width / 4
        tile_h = page_height / 4
        for row in range(4):
            for col in range(4):
                draw_element_in_box(col * tile_w, page_height - (row + 1) * tile_h, tile_w, tile_h)


# --- 이하 @router.post("/add-watermark") 부분은 이전과 동일하므로 변경 없음 ---
@router.post("/add-watermark")
async def add_watermark(
    file: UploadFile,
    watermark_type: Literal["text", "image"] = Form(...),
    watermark_text: str = Form(None),
    watermark_image: UploadFile = None,
    opacity: float = Form(0.5),
    rotation: int = Form(0),
    position: Literal["center", "tile", "top-left", "top-right", "bottom-left", "bottom-right"] = Form("center"),
    font_size: int = Form(40),
    font_name: Literal["NotoSansKR"] = Form("NotoSansKR"),
    font_color: str = Form("#000000"),
    font_bold: str = Form("false"),
    pages: str = Form("all")
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 지원됩니다")
    
    session_dir = get_session_dir()
    temp_path = session_dir / f"temp_{file.filename}"
    output_path = session_dir / f"watermarked_{file.filename}"
    
    try:
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        reader = PdfReader(temp_path)
        total_pages = len(reader.pages)
        
        pages_to_watermark = set()
        if pages.lower() == 'all':
            pages_to_watermark = set(range(total_pages))
        else:
            try:
                page_indices = parse_page_ranges(pages, total_pages)
                pages_to_watermark = set(p - 1 for p in page_indices)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
        
        is_bold_bool = font_bold.lower() == "true"
        watermark_options = {
            "watermark_type": watermark_type, "watermark_text": watermark_text,
            "opacity": opacity, "rotation": rotation, "position": position,
            "font_size": font_size, "font_name": font_name, "font_color": font_color,
            "is_bold": is_bold_bool
        }

        if getattr(sys, '_MEIPASS', None):
            font_path = os.path.join(sys._MEIPASS, 'pdf_processor', 'fonts')
        else:
            font_path = os.path.join(os.path.dirname(__file__), '..', '..', 'fonts')
        
        pdfmetrics.registerFont(TTFont('NotoSansKR-Regular', os.path.join(font_path, 'NotoSansKR-Regular.ttf')))
        pdfmetrics.registerFont(TTFont('NotoSansKR-Bold', os.path.join(font_path, 'NotoSansKR-Bold.ttf')))
        
        if watermark_type == "image" and watermark_image:
            img_content = await watermark_image.read()
            img = Image.open(BytesIO(img_content))
            
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            alpha = img.split()[3]
            alpha = alpha.point(lambda i: i * opacity)
            img.putalpha(alpha)

            max_dim = 150
            if img.width > max_dim or img.height > max_dim:
                ratio = min(max_dim / img.width, max_dim / img.height)
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)

            watermark_options['image_obj'] = ImageReader(img)
            watermark_options['image_size'] = img.size
        
        writer = PdfWriter()
        for i, page in enumerate(reader.pages):
            if i in pages_to_watermark:
                packet = BytesIO()
                page_width = float(page.mediabox.width)
                page_height = float(page.mediabox.height)
                c = canvas.Canvas(packet, pagesize=(page_width, page_height))
                
                draw_watermark_on_canvas(c, page_width, page_height, watermark_options)
                
                c.save()
                packet.seek(0)
                watermark_pdf = PdfReader(packet)
                page.merge_page(watermark_pdf.pages[0])
            
            writer.add_page(page)
        
        with open(output_path, "wb") as output_file:
            writer.write(output_file)
        
        return FileResponse(
            path=str(output_path),
            filename=f"watermarked_{file.filename}",
            background=BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
        )
        
    except Exception as e:
        shutil.rmtree(session_dir, ignore_errors=True)
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))