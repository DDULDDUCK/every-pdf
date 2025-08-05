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
from io import BytesIO

from pdf_processor.utils import get_session_dir, parse_page_ranges

router = APIRouter()

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
                font_path = os.path.join(os.path.dirname(__file__), '..', '..', 'fonts')
            
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