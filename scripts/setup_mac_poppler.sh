#!/bin/bash

# 대상 디렉토리 생성
DEST_DIR="backend/src/poppler/mac/25.03.0"
mkdir -p "backend/src/poppler/mac/25.03.0/bin"
mkdir -p "backend/src/poppler/mac/25.03.0/lib"

# Poppler 실행 파일 복사
echo "Copying Poppler executables..."
cp /opt/homebrew/Cellar/poppler/25.03.0/bin/pdftocairo "backend/src/poppler/mac/25.03.0/bin/"
cp /opt/homebrew/Cellar/poppler/25.03.0/bin/pdftoppm "backend/src/poppler/mac/25.03.0/bin/"
cp /opt/homebrew/Cellar/poppler/25.03.0/bin/pdftotext "backend/src/poppler/mac/25.03.0/bin/"

# Poppler 라이브러리 복사
echo "Copying Poppler libraries..."
cp /opt/homebrew/Cellar/poppler/25.03.0/lib/libpoppler.*.dylib "backend/src/poppler/mac/25.03.0/lib/"
cp /opt/homebrew/Cellar/poppler/25.03.0/lib/libpoppler-cpp.*.dylib "backend/src/poppler/mac/25.03.0/lib/"
cp /opt/homebrew/Cellar/poppler/25.03.0/lib/libpoppler-glib.*.dylib "backend/src/poppler/mac/25.03.0/lib/"

# 의존성 라이브러리 복사
echo "Copying dependency libraries..."
# Cairo
cp /opt/homebrew/opt/cairo/lib/libcairo.*.dylib "backend/src/poppler/mac/25.03.0/lib/"

# FreeType
cp /opt/homebrew/opt/freetype/lib/libfreetype.*.dylib "backend/src/poppler/mac/25.03.0/lib/"

# Fontconfig
cp /opt/homebrew/opt/fontconfig/lib/libfontconfig.*.dylib "backend/src/poppler/mac/25.03.0/lib/"

# libpng
cp /opt/homebrew/opt/libpng/lib/libpng16.*.dylib "backend/src/poppler/mac/25.03.0/lib/"

# libtiff
cp /opt/homebrew/opt/libtiff/lib/libtiff.*.dylib "backend/src/poppler/mac/25.03.0/lib/"

# libjpeg
cp /opt/homebrew/opt/jpeg/lib/libjpeg.*.dylib "backend/src/poppler/mac/25.03.0/lib/"

# libgpg-error
cp /opt/homebrew/opt/nss/lib/libnss3.dylib "backend/src/poppler/mac/25.03.0/lib/"

# libassuan
cp /opt/homebrew/opt/libassuan/lib/libassuan.*.dylib "backend/src/poppler/mac/25.03.0/lib/"

# libgcrypt
cp /opt/homebrew/opt/libgcrypt/lib/libgcrypt.*.dylib "backend/src/poppler/mac/25.03.0/lib/"

# libksba
cp /opt/homebrew/opt/libksba/lib/libksba.*.dylib "backend/src/poppler/mac/25.03.0/lib/"

# npth
cp /opt/homebrew/opt/npth/lib/libnpth.*.dylib "backend/src/poppler/mac/25.03.0/lib/"

# libusb
cp /opt/homebrew/opt/libusb/lib/libusb-*.dylib "backend/src/poppler/mac/25.03.0/lib/"


# 실행 권한 설정
echo "Setting executable permissions..."
chmod +x "backend/src/poppler/mac/25.03.0/bin/"*

echo "Done!"