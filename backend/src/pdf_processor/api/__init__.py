from fastapi import FastAPI

from .split import router as split_router
from .merge import router as merge_router
from .rotate import router as rotate_router
from .convertToPdf import router as convert_to_pdf_router
from .convertFromPdf import router as convert_from_pdf_router
from .addWatermark import router as add_watermark_router
from .encrypt import router as encrypt_router
from .decrypt import router as decrypt_router
from .edit import router as edit_router

# get_session_dir, parse_page_ranges는 utils에서 import
from ..utils import get_session_dir, parse_page_ranges

def register_routers(app: FastAPI):
    app.include_router(split_router)
    app.include_router(merge_router)
    app.include_router(rotate_router)
    app.include_router(convert_to_pdf_router)
    app.include_router(convert_from_pdf_router)
    app.include_router(add_watermark_router)
    app.include_router(encrypt_router)
    app.include_router(decrypt_router)
    app.include_router(edit_router)