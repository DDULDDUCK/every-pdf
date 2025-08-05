from fastapi import APIRouter, UploadFile, HTTPException, Form
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from pypdf import PdfReader, PdfWriter
import shutil
from typing import List
from pdf_processor.utils import get_session_dir, parse_page_ranges

router = APIRouter()

@router.post("/rotate")
async def rotate_pdf(
    file: UploadFile,
    pages: str = Form(...),
    angle: int = Form(...),
    include_unspecified: bool = Form(...)
):
    """PDF 페이지 회전"""
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