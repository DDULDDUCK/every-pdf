from fastapi import APIRouter, UploadFile, HTTPException, BackgroundTasks, Form
from fastapi.responses import FileResponse
import shutil
from typing import List
from pathlib import Path
from starlette.background import BackgroundTask
from pypdf import PdfReader, PdfWriter
import os
import uuid

from pdf_processor.utils import get_session_dir, parse_page_ranges

router = APIRouter()

@router.post("/split")
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