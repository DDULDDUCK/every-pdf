from fastapi import UploadFile, HTTPException, Form, APIRouter
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
import shutil
from pypdf import PdfReader, PdfWriter
from pdf_processor.utils import get_session_dir

router = APIRouter()

@router.post("/encrypt")
async def encrypt_pdf(
    file: UploadFile,
    password: str = Form(...),
    allow_printing: bool = Form(True),
    allow_commenting: bool = Form(True)
):
    """PDF 파일 암호화
    Args:
        file: PDF 파일
        password: 암호화에 사용할 비밀번호
        allow_printing: 인쇄 허용 여부
        allow_commenting: 주석 허용 여부
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 지원됩니다")

    session_dir = get_session_dir()
    temp_path = session_dir / f"temp_{file.filename}"
    output_path = session_dir / f"encrypted_{file.filename}"

    try:
        # 업로드된 파일 저장
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # PDF 처리
        reader = PdfReader(temp_path)
        writer = PdfWriter()

        # 모든 페이지 복사
        for page in reader.pages:
            writer.add_page(page)

        # 암호화 설정 (AES-256-R5 알고리즘 사용)
        writer.encrypt(
            user_password=password,
            owner_password=password,  # 소유자 비밀번호도 동일하게 설정
            algorithm="AES-256-R5"  # 권장되는 안전한 암호화 알고리즘
        )

        # 결과 저장
        with open(output_path, "wb") as output_file:
            writer.write(output_file)

        # 임시 파일 삭제
        temp_path.unlink()

        return FileResponse(
            path=str(output_path),
            filename=f"encrypted_{file.filename}",
            background=BackgroundTask(lambda: shutil.rmtree(session_dir, ignore_errors=True))
        )

    except Exception as e:
        # 오류 발생 시 세션 디렉토리 정리
        shutil.rmtree(session_dir, ignore_errors=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))