from fastapi import UploadFile, HTTPException, Form, APIRouter
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
import shutil
from pypdf import PdfReader, PdfWriter
from ..utils import get_session_dir

router = APIRouter()

@router.post("/decrypt")
async def decrypt_pdf(
    file: UploadFile,
    password: str = Form(...)
):
    """PDF 파일 복호화
    Args:
        file: 암호화된 PDF 파일
        password: 복호화를 위한 비밀번호
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 지원됩니다")

    session_dir = get_session_dir()
    temp_path = session_dir / f"temp_{file.filename}"
    output_path = session_dir / f"decrypted_{file.filename}"

    try:
        # 업로드된 파일 저장
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # PDF 처리
        reader = PdfReader(temp_path)
        
        # 암호화 여부 확인
        if not reader.is_encrypted:
            raise HTTPException(status_code=400, detail="암호화되지 않은 PDF 파일입니다")

        try:
            # 비밀번호로 복호화 시도
            reader.decrypt(password)
        except:
            raise HTTPException(status_code=400, detail="잘못된 비밀번호입니다")

        # 복호화된 PDF 생성
        writer = PdfWriter()
        
        # 모든 페이지 복사
        for page in reader.pages:
            writer.add_page(page)

        # 결과 저장
        with open(output_path, "wb") as output_file:
            writer.write(output_file)

        # 임시 파일 삭제
        temp_path.unlink()

        return FileResponse(
            path=str(output_path),
            filename=f"decrypted_{file.filename}",
            background=BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
        )

    except Exception as e:
        # 오류 발생 시 세션 디렉토리 정리
        shutil.rmtree(session_dir, ignore_errors=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))