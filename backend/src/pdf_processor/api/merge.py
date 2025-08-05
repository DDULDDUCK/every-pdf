from fastapi import APIRouter, UploadFile, HTTPException
from fastapi.responses import FileResponse
from typing import List
from pathlib import Path
from starlette.background import BackgroundTask
from pypdf import PdfReader, PdfWriter
import shutil
import os

from ..utils import get_session_dir

router = APIRouter()

@router.post("/merge")
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