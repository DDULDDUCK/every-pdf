# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['/Users/jaeseok-song/Documents/PDF-Workspcae/PDF-Studio/backend/src/pdf_processor/main.py'],
    pathex=[],
    binaries=[],
    datas=[('/Users/jaeseok-song/Documents/PDF-Workspcae/PDF-Studio/backend/src/fonts', 'pdf_processor/fonts'), ('/Users/jaeseok-song/Documents/PDF-Workspcae/PDF-Studio/backend/src/poppler/mac/25.03.0/bin', 'poppler/bin'), ('/Users/jaeseok-song/Documents/PDF-Workspcae/PDF-Studio/backend/src/poppler/mac/25.03.0/lib', 'poppler/lib')],
    hiddenimports=['PyPDF2', 'fastapi', 'uvicorn', 'uvicorn.logging', 'uvicorn.protocols', 'uvicorn.lifespan', 'uvicorn.loops', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto', 'uvicorn.protocols.websockets.auto', 'starlette', 'starlette.responses', 'starlette.routing', 'starlette.middleware', 'starlette.middleware.cors', 'starlette.background', 'starlette.responses', 'fastapi.responses', 'pdf2docx', 'img2pdf', 'xhtml2pdf', 'xhtml2pdf.pisa', 'reportlab', 'reportlab.pdfgen', 'reportlab.pdfgen.canvas', 'reportlab.pdfbase', 'reportlab.pdfbase.ttfonts', 'reportlab.pdfbase._fontdata', 'reportlab.lib.pagesizes', 'reportlab.lib.utils', 'reportlab.lib.styles', 'reportlab.graphics.barcode', 'reportlab.graphics.barcode.common', 'reportlab.graphics.barcode.code39', 'reportlab.graphics.barcode.code93', 'reportlab.graphics.barcode.code128', 'reportlab.graphics.barcode.usps', 'reportlab.graphics.barcode.usps4s', 'reportlab.graphics.barcode.eanbc', 'reportlab.graphics.barcode.ecc200datamatrix', 'reportlab.graphics.barcode.fourstate', 'reportlab.graphics.barcode.lto', 'reportlab.graphics.barcode.qr', 'reportlab.graphics.barcode.widgets', 'tempfile', 'socketserver', 'http.server', 'html.parser', 'io', 'PIL._tkinter_finder', 'atexit', 'os', 'sys', 'tempfile', 'logging', 'shutil', 'zipfile', 're', 'subprocess', 'platform', 'uuid', 'pathlib', 'PIL.features', 'xhtml2pdf.util', 'xhtml2pdf.context', 'xhtml2pdf.default', 'xhtml2pdf.parser', 'xhtml2pdf.xhtml2pdf_reportlab', 'pdf2image', 'PIL', 'PIL.Image', 'PIL.ImageDraw', 'PIL.ImageFont'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='pdf_processor',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='pdf_processor',
)
