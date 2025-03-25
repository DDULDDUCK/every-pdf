//========================================================================
//
// SplashFontEngine.h
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
// Copyright (C) 2009, 2011, 2018 Albert Astals Cid <aacid@kde.org>
// Copyright (C) 2011 Andreas Hartmetz <ahartmetz@gmail.com>
// Copyright (C) 2013 Thomas Freitag <Thomas.Freitag@alfa.de>
// Copyright (C) 2017 Adrian Johnson <ajohnson@redneon.com>
// Copyright (C) 2018 Oliver Sander <oliver.sander@tu-dresden.de>
//
// To see a description of the changes please see the Changelog file that
// came with your tarball or type make ChangeLog if you are building from git
//
//========================================================================

#ifndef SPLASHFONTENGINE_H
#define SPLASHFONTENGINE_H

#include <array>

#include "SplashTypes.h"
#include "poppler_private_export.h"

class SplashT1FontEngine;
class SplashFTFontEngine;
class SplashDTFontEngine;
class SplashDT4FontEngine;
class SplashFontFile;
class SplashFontFileID;
class SplashFont;
class SplashFontSrc;

//------------------------------------------------------------------------
// SplashFontEngine
//------------------------------------------------------------------------

class POPPLER_PRIVATE_EXPORT SplashFontEngine
{
public:
    // Create a font engine.
    SplashFontEngine(bool enableFreeType, bool enableFreeTypeHinting, bool enableSlightHinting, bool aa);

    ~SplashFontEngine();

    SplashFontEngine(const SplashFontEngine &) = delete;
    SplashFontEngine &operator=(const SplashFontEngine &) = delete;

    // Get a font file from the cache.  Returns NULL if there is no
    // matching entry in the cache.
    SplashFontFile *getFontFile(SplashFontFileID *id);

    // Load fonts - these create new SplashFontFile objects.
    SplashFontFile *loadType1Font(SplashFontFileID *idA, SplashFontSrc *src, const char **enc);
    SplashFontFile *loadType1CFont(SplashFontFileID *idA, SplashFontSrc *src, const char **enc);
    SplashFontFile *loadOpenTypeT1CFont(SplashFontFileID *idA, SplashFontSrc *src, const char **enc);
    SplashFontFile *loadCIDFont(SplashFontFileID *idA, SplashFontSrc *src);
    SplashFontFile *loadOpenTypeCFFFont(SplashFontFileID *idA, SplashFontSrc *src, int *codeToGID, int codeToGIDLen);
    SplashFontFile *loadTrueTypeFont(SplashFontFileID *idA, SplashFontSrc *src, int *codeToGID, int codeToGIDLen, int faceIndex = 0);

    // Get a font - this does a cache lookup first, and if not found,
    // creates a new SplashFont object and adds it to the cache.  The
    // matrix, mat = textMat * ctm:
    //    [ mat[0] mat[1] ]
    //    [ mat[2] mat[3] ]
    // specifies the font transform in PostScript style:
    //    [x' y'] = [x y] * mat
    // Note that the Splash y axis points downward.
    SplashFont *getFont(SplashFontFile *fontFile, const SplashCoord *textMat, const SplashCoord *ctm);
    bool getAA();
    void setAA(bool aa);

private:
    std::array<SplashFont *, 16> fontCache;

    SplashFTFontEngine *ftEngine;
};

#endif
