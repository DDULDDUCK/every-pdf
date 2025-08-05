# --- api/edit.py (수정됨) ---

import io
import json
from urllib.parse import quote # <<< urllib.parse.quote 임포트
from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from .. import editor

router = APIRouter()

@router.post("/edit")
async def edit_pdf_api(
    file: UploadFile = File(...), 
    elements: str = Form(...)
):
    """
    PDF 파일과 편집 요소 목록(JSON 문자열)을 받아 PDF를 수정한 후
    결과 파일을 반환합니다.
    - file: 업로드된 PDF 파일
    - elements: PDFEditElement[] 형식의 JSON 문자열
    """
    if not file.content_type == "application/pdf":
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드할 수 있습니다.")

    try:
        pdf_bytes = await file.read()
        pdf_stream = io.BytesIO(pdf_bytes)

        edited_pdf_bytes = editor.apply_edits_to_pdf(
            pdf_file_stream=pdf_stream,
            elements_json=elements
        )
        
        # *** 여기가 수정된 부분입니다 ***
        # 파일 이름을 URL 인코딩하여 안전하게 만듭니다.
        original_filename = file.filename if file.filename else "unknown.pdf"
        encoded_filename = quote(f"edited_{original_filename}")
        
        # 표준에 맞는 Content-Disposition 헤더 생성
        # filename* 속성은 UTF-8 인코딩을 명시하여 다국어 파일명을 지원합니다.
        headers = {
            'Content-Disposition': f"attachment; filename*=UTF-8''{encoded_filename}"
        }

        # 결과 파일을 스트리밍으로 응답
        return StreamingResponse(
            io.BytesIO(edited_pdf_bytes),
            media_type="application/pdf",
            headers=headers
        )

    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="잘못된 형식의 elements 데이터입니다.")
    except Exception as e:
        print(f"PDF 편집 중 에러 발생: {e}")
        raise HTTPException(status_code=500, detail=f"PDF 편집에 실패했습니다: {str(e)}")