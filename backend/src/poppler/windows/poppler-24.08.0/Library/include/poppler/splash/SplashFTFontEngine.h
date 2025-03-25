//========================================================================
//
// SplashFTFontEngine.h
//
//========================================================================

//========================================================================
//
// Modified under the Poppler project - http://poppler.freedesktop.org
//
// All changes made under the Poppler project to this file are licensed
// under GPL version 2 or later
//
// Copyright (C) 2006 Takashi Iwai <tiwai@suse.de>
// Copyright (C) 2009 Petr Gajdos <pgajdos@novell.com>
// Copyright (C) 2009, 2018, 2022 Albert Astals Cid <aacid@kde.org>
// Copyright (C) 2011 Andreas Hartmetz <ahartmetz@gmail.com>
// Copyright (C) 2013 Thomas Freitag <Thomas.Freitag@alfa.de>
// Copyright (C) 2017 Adrian Johnson <ajohnson@redneon.com>
//
// To see a description of the changes please see the Changelog file that
// came with your tarball or type make ChangeLog if you are building from git
//
//========================================================================

#ifndef SPLASHFTFONTENGINE_H
#define SPLASHFTFONTENGINE_H

#include <ft2build.h>
#include FT_FREETYPE_H

class SplashFontFile;
class SplashFontFileID;
class SplashFontSrc;

//------------------------------------------------------------------------
// SplashFTFontEngine
//------------------------------------------------------------------------

class SplashFTFontEngine
{
public:
    static SplashFTFontEngine *init(bool aaA, bool enableFreeTypeHintingA, bool enableSlightHinting);

    ~SplashFTFontEngine();

    SplashFTFontEngine(const SplashFTFontEngine &) = delete;
    SplashFTFontEngine &operator=(const SplashFTFontEngine &) = delete;

    // Load fonts.
    SplashFontFile *loadType1Font(SplashFontFileID *idA, SplashFontSrc *src, const char **enc);
    SplashFontFile *loadType1CFont(SplashFontFileID *idA, SplashFontSrc *src, const char **enc);
    SplashFontFile *loadOpenTypeT1CFont(SplashFontFileID *idA, SplashFontSrc *src, const char **enc);
    SplashFontFile *loadCIDFont(SplashFontFileID *idA, SplashFontSrc *src);
    SplashFontFile *loadOpenTypeCFFFont(SplashFontFileID *idA, SplashFontSrc *src, int *codeToGID, int codeToGIDLen);
    SplashFontFile *loadTrueTypeFont(SplashFontFileID *idA, SplashFontSrc *src, int *codeToGID, int codeToGIDLen, int faceIndex = 0);
    bool getAA() { return aa; }
    void setAA(bool aaA) { aa = aaA; }

private:
    SplashFTFontEngine(bool aaA, bool enableFreeTypeHintingA, bool enableSlightHintingA, FT_Library libA);

    bool aa;
    bool enableFreeTypeHinting;
    bool enableSlightHinting;
    FT_Library lib;

    friend class SplashFTFontFile;
    friend class SplashFTFont;
};

#endif
