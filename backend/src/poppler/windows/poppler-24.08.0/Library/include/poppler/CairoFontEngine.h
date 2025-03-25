//========================================================================
//
// CairoFontEngine.h
//
// Copyright 2003 Glyph & Cog, LLC
// Copyright 2004 Red Hat, Inc
//
//========================================================================

//========================================================================
//
// Modified under the Poppler project - http://poppler.freedesktop.org
//
// All changes made under the Poppler project to this file are licensed
// under GPL version 2 or later
//
// Copyright (C) 2005, 2006 Kristian Høgsberg <krh@redhat.com>
// Copyright (C) 2005, 2018, 2019, 2021 Albert Astals Cid <aacid@kde.org>
// Copyright (C) 2006, 2007 Jeff Muizelaar <jeff@infidigm.net>
// Copyright (C) 2006, 2010 Carlos Garcia Campos <carlosgc@gnome.org>
// Copyright (C) 2008, 2017, 2022 Adrian Johnson <ajohnson@redneon.com>
// Copyright (C) 2013 Thomas Freitag <Thomas.Freitag@alfa.de>
// Copyright (C) 2018 Adam Reichold <adam.reichold@t-online.de>
// Copyright (C) 2022 Oliver Sander <oliver.sander@tu-dresden.de>
// Copyright (C) 2022 Marek Kasik <mkasik@redhat.com>
//
// To see a description of the changes please see the Changelog file that
// came with your tarball or type make ChangeLog if you are building from git
//
//========================================================================

#ifndef CAIROFONTENGINE_H
#define CAIROFONTENGINE_H

#include <memory>
#include <mutex>
#include <unordered_map>
#include <vector>

#include "poppler-config.h"
#include <cairo-ft.h>

#include "GfxFont.h"
#include "PDFDoc.h"

class CairoFontEngine;

class CairoFont
{
public:
    CairoFont(Ref refA, cairo_font_face_t *cairo_font_faceA, std::vector<int> &&codeToGIDA, bool substituteA, bool printingA);
    virtual ~CairoFont();
    CairoFont(const CairoFont &) = delete;
    CairoFont &operator=(const CairoFont &other) = delete;

    virtual bool matches(Ref &other, bool printing);
    cairo_font_face_t *getFontFace();
    unsigned long getGlyph(CharCode code, const Unicode *u, int uLen);
    double getSubstitutionCorrection(const std::shared_ptr<GfxFont> &gfxFont);

    bool isSubstitute() { return substitute; }

    Ref getRef() { return ref; }

protected:
    Ref ref;
    cairo_font_face_t *cairo_font_face;

    std::vector<int> codeToGID;

    bool substitute;
    bool printing;
};

//------------------------------------------------------------------------

struct FreeTypeFontFace
{
    FT_Face face;
    cairo_font_face_t *cairo_font_face;
};

class CairoFreeTypeFont : public CairoFont
{
public:
    static CairoFreeTypeFont *create(const std::shared_ptr<GfxFont> &gfxFont, XRef *xref, FT_Library lib, CairoFontEngine *fontEngine, bool useCIDs);
    ~CairoFreeTypeFont() override;

private:
    CairoFreeTypeFont(Ref ref, cairo_font_face_t *cairo_font_face, std::vector<int> &&codeToGID, bool substitute);

    static std::optional<FreeTypeFontFace> getFreeTypeFontFace(CairoFontEngine *fontEngine, FT_Library lib, const std::string &filename, std::vector<unsigned char> &&data);
};

//------------------------------------------------------------------------

class CairoType3Font : public CairoFont
{
public:
    static CairoType3Font *create(const std::shared_ptr<GfxFont> &gfxFont, PDFDoc *doc, CairoFontEngine *fontEngine, bool printing, XRef *xref);
    ~CairoType3Font() override;

    bool matches(Ref &other, bool printing) override;

private:
    CairoType3Font(Ref ref, cairo_font_face_t *cairo_font_face, std::vector<int> &&codeToGIDA, bool printing, XRef *xref);
};

//------------------------------------------------------------------------

//------------------------------------------------------------------------
// CairoFontEngine
//------------------------------------------------------------------------

class CairoFontEngine
{
public:
    // Create a font engine.
    explicit CairoFontEngine(FT_Library libA);
    ~CairoFontEngine();
    CairoFontEngine(const CairoFontEngine &) = delete;
    CairoFontEngine &operator=(const CairoFontEngine &other) = delete;

    std::shared_ptr<CairoFont> getFont(const std::shared_ptr<GfxFont> &gfxFont, PDFDoc *doc, bool printing, XRef *xref);

    static std::optional<FreeTypeFontFace> getExternalFontFace(FT_Library ftlib, const std::string &filename);

private:
    FT_Library lib;
    bool useCIDs;
    mutable std::mutex mutex;

    // Cache of CairoFont for current document
    // Most recently used is at the end of the vector.
    static const size_t cairoFontCacheSize = 64;
    std::vector<std::shared_ptr<CairoFont>> fontCache;

    // Global cache of cairo_font_face_t for external font files.
    static std::unordered_map<std::string, FreeTypeFontFace> fontFileCache;
    static std::recursive_mutex fontFileCacheMutex;
};

#endif
