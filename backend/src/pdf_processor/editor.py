# --- editor.py (텍스트 위치 미세 조정) ---

import io
import json
import base64
import os
import sys
from typing import List, Dict, Any
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from pypdf import PdfReader, PdfWriter
from PIL import Image
import tempfile
from pathlib import Path

# --- Enhanced font setup based on addWatermark.py ---
DEFAULT_FONT_NAME = "Helvetica"
REGULAR_FONT_NAME = "NotoSansKR-Regular"
BOLD_FONT_NAME = "NotoSansKR-Bold"
REGULAR_FONT_FILE = "NotoSansKR-Regular.ttf"
BOLD_FONT_FILE = "NotoSansKR-Bold.ttf"

try:
    # PyInstaller가 생성한 임시 경로 확인
    if getattr(sys, '_MEIPASS', None):
        font_path = os.path.join(sys._MEIPASS, 'pdf_processor', 'fonts')
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        font_path = os.path.join(base_dir, '..', '..', 'fonts')
    
    regular_font_path = os.path.join(font_path, REGULAR_FONT_FILE)
    bold_font_path = os.path.join(font_path, BOLD_FONT_FILE)
    
    if os.path.exists(regular_font_path) and os.path.exists(bold_font_path):
        # 일반 폰트와 볼드 폰트 등록
        pdfmetrics.registerFont(TTFont(REGULAR_FONT_NAME, regular_font_path))
        pdfmetrics.registerFont(TTFont(BOLD_FONT_NAME, bold_font_path))
        DEFAULT_FONT_NAME = REGULAR_FONT_NAME
        print(f"SUCCESS: Fonts '{REGULAR_FONT_NAME}' and '{BOLD_FONT_NAME}' loaded successfully.")
    else:
        missing_fonts = []
        if not os.path.exists(regular_font_path):
            missing_fonts.append(REGULAR_FONT_FILE)
        if not os.path.exists(bold_font_path):
            missing_fonts.append(BOLD_FONT_FILE)
        print(f"ERROR: Font files not found: {', '.join(missing_fonts)}")
except Exception as e:
    print(f"CRITICAL ERROR: Failed to load fonts. Error: {e}")
# --- End of font setup ---

def hex_to_color(hex_color: str):
    return HexColor(hex_color)

def create_overlay(page_width_pt: float, page_height_pt: float, elements: List[Dict[str, Any]]) -> bytes:
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=(page_width_pt, page_height_pt))
    PADDING = 2
    
    for el in elements:
        el_type = el.get("type")
        x_px, y_px = el.get("x", 0), el.get("y", 0)
        py_top = page_height_pt - y_px
        px = x_px

        if el_type == "text":
            font_size_px = el.get("fontSize", 12)
            text_content = el.get("text", "")
            lines = text_content.splitlines() if text_content else []

            line_height = font_size_px * 1.2
            block_height = len(lines) * line_height
            max_width = 0
            if lines:
                max_width = max(pdfmetrics.stringWidth(line, DEFAULT_FONT_NAME, font_size_px) for line in lines)

            if el.get("hasBackground", False):
                bg_color = el.get("backgroundColor", "#FFFFFF")
                c.setFillColor(hex_to_color(bg_color))
                bg_bottom_y = py_top - block_height
                
                c.rect(
                    px - PADDING, 
                    bg_bottom_y - PADDING, 
                    max_width + (2 * PADDING), 
                    block_height + (2 * PADDING), 
                    stroke=0, fill=1
                )

            if lines:
                text_object = c.beginText()
                text_object.setFont(DEFAULT_FONT_NAME, font_size_px)
                text_object.setFillColor(hex_to_color(el.get("color", "#000000")))
                text_object.setLeading(line_height)
 
                start_x = px
                start_y = py_top - font_size_px 

                text_object.setTextOrigin(start_x, start_y)

                for line in lines:
                    text_object.textLine(line)
                c.drawText(text_object)

        elif el_type == "signature":
            width_px, height_px = el.get("width", 100), el.get("height", 50)
            py_bottom = py_top - height_px
            
            if el.get("hasBackground", False):
                bg_color = el.get("backgroundColor", "#FFFFFF")
                c.setFillColor(hex_to_color(bg_color))
                c.rect(px, py_bottom, width_px, height_px, stroke=0, fill=1)

            try:
                img_bytes = base64.b64decode(el.get("imageData", ""))
                img = Image.open(io.BytesIO(img_bytes))
                
                with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp_f:
                    img.save(temp_f, format="PNG")
                    temp_path = temp_f.name
                
                c.drawImage(temp_path, px, py_bottom, width=width_px, height=height_px, mask='auto')
                os.remove(temp_path)
            except Exception as e:
                print(f"Error processing signature image: {e}")

        elif el_type == "checkbox":
            size_px = el.get("size", 18)
            py_bottom = py_top - size_px
            is_transparent = el.get("isTransparent", False)
            has_border = el.get("hasBorder", True)
            
            # 위치 보정을 위한 조정된 좌표
            adj_px = px + 1.3
            adj_py_bottom = py_bottom - 1.3

            if has_border or not is_transparent:
                c.setStrokeColor(hex_to_color(el.get("borderColor", "#000000")))
                c.setFillColor(hex_to_color(el.get("color", "#FFFFFF")))
                # 두께를 1.0으로 줄여서 프론트엔드와 시각적으로 맞춤
                c.setLineWidth(1.0) 
                c.rect(
                    adj_px, adj_py_bottom, 
                    size_px, size_px, 
                    stroke=(1 if has_border else 0), 
                    fill=(0 if is_transparent else 1)
                )

            if el.get("checked", False):
                c.setStrokeColor(HexColor("#000000"))
                c.setLineWidth(size_px / 8)
                c.setLineCap(1)
                c.setLineJoin(1)
                p = c.beginPath()
                p.moveTo(px + size_px * 0.2, py_bottom + size_px * 0.5)
                p.lineTo(px + size_px * 0.45, py_bottom + size_px * 0.25)
                p.lineTo(px + size_px * 0.8, py_bottom + size_px * 0.75)
                c.drawPath(p)

    c.save()
    packet.seek(0)
    return packet.read()

def apply_edits_to_pdf(pdf_file_stream: io.BytesIO, elements_json: str) -> bytes:
    # ... (이 함수는 변경 없음)
    elements_by_page = {}
    try:
        all_elements = json.loads(elements_json)
    except json.JSONDecodeError:
        raise ValueError("Invalid JSON format for elements")
        
    for el in all_elements:
        page_str = str(el.get("page"))
        if page_str not in elements_by_page:
            elements_by_page[page_str] = []
        elements_by_page[page_str].append(el)

    reader = PdfReader(pdf_file_stream)
    writer = PdfWriter()

    for i, page in enumerate(reader.pages):
        page_num_str = str(i + 1)
        if page_num_str in elements_by_page:
            page_width_pt = float(page.mediabox.width)
            page_height_pt = float(page.mediabox.height)
            
            overlay_bytes = create_overlay(page_width_pt, page_height_pt, elements_by_page[page_num_str])
            overlay_pdf = PdfReader(io.BytesIO(overlay_bytes))
            
            page.merge_page(overlay_pdf.pages[0])
        
        writer.add_page(page)

    output_stream = io.BytesIO()
    writer.write(output_stream)
    return output_stream.getvalue()