//========================================================================
//
// PreScanOutputDev.h
//
// Copyright 2005 Glyph & Cog, LLC
//
//========================================================================

//========================================================================
//
// Modified under the Poppler project - http://poppler.freedesktop.org
//
// All changes made under the Poppler project to this file are licensed
// under GPL version 2 or later
//
// Copyright (C) 2009 Carlos Garcia Campos <carlosgc@gnome.org>
// Copyright (C) 2010, 2018-2021 Albert Astals Cid <aacid@kde.org>
// Copyright (C) 2011, 2014 William Bader <williambader@hotmail.com>
// Copyright (C) 2011, 2013 Thomas Freitag <Thomas.Freitag@alfa.de>
// Copyright (C) 2011 Adrian Johnson <ajohnson@redneon.com>
//
// To see a description of the changes please see the Changelog file that
// came with your tarball or type make ChangeLog if you are building from git
//
//========================================================================

#ifndef PRESCANOUTPUTDEV_H
#define PRESCANOUTPUTDEV_H

#include "Object.h"
#include "GfxState.h"
#include "OutputDev.h"
#include "PSOutputDev.h"

//------------------------------------------------------------------------
// PreScanOutputDev
//------------------------------------------------------------------------

class PreScanOutputDev : public OutputDev
{
public:
    // Constructor.
    explicit PreScanOutputDev(PSLevel levelA);

    // Destructor.
    ~PreScanOutputDev() override;

    //----- get info about output device

    // Does this device use upside-down coordinates?
    // (Upside-down means (0,0) is the top left corner of the page.)
    bool upsideDown() override { return true; }

    // Does this device use drawChar() or drawString()?
    bool useDrawChar() override { return true; }

    // Does this device use tilingPatternFill()?  If this returns false,
    // tiling pattern fills will be reduced to a series of other drawing
    // operations.
    bool useTilingPatternFill() override { return true; }

    // Does this device use functionShadedFill(), axialShadedFill(), and
    // radialShadedFill()?  If this returns false, these shaded fills
    // will be reduced to a series of other drawing operations.
    bool useShadedFills(int type) override { return true; }

    // Does this device use beginType3Char/endType3Char?  Otherwise,
    // text in Type 3 fonts will be drawn with drawChar/drawString.
    bool interpretType3Chars() override { return true; }

    //----- initialization and control

    // Start a page.
    void startPage(int pageNum, GfxState *state, XRef *xref) override;

    // End a page.
    void endPage() override;

    //----- path painting
    void stroke(GfxState *state) override;
    void fill(GfxState *state) override;
    void eoFill(GfxState *state) override;
    bool tilingPatternFill(GfxState *state, Gfx *gfx, Catalog *cat, GfxTilingPattern *tPat, const double *mat, int x0, int y0, int x1, int y1, double xStep, double yStep) override;
    bool functionShadedFill(GfxState *state, GfxFunctionShading *shading) override;
    bool axialShadedFill(GfxState *state, GfxAxialShading *shading, double tMin, double tMax) override;
    bool radialShadedFill(GfxState *state, GfxRadialShading *shading, double tMin, double tMax) override;

    //----- path clipping
    void clip(GfxState *state) override;
    void eoClip(GfxState *state) override;

    //----- text drawing
    void beginStringOp(GfxState *state) override;
    void endStringOp(GfxState *state) override;
    bool beginType3Char(GfxState *state, double x, double y, double dx, double dy, CharCode code, const Unicode *u, int uLen) override;
    void endType3Char(GfxState *state) override;

    //----- image drawing
    void drawImageMask(GfxState *state, Object *ref, Stream *str, int width, int height, bool invert, bool interpolate, bool inlineImg) override;
    void drawImage(GfxState *state, Object *ref, Stream *str, int width, int height, GfxImageColorMap *colorMap, bool interpolate, const int *maskColors, bool inlineImg) override;
    void drawMaskedImage(GfxState *state, Object *ref, Stream *str, int width, int height, GfxImageColorMap *colorMap, bool interpolate, Stream *maskStr, int maskWidth, int maskHeight, bool maskInvert, bool maskInterpolate) override;
    void drawSoftMaskedImage(GfxState *state, Object *ref, Stream *str, int width, int height, GfxImageColorMap *colorMap, bool interpolate, Stream *maskStr, int maskWidth, int maskHeight, GfxImageColorMap *maskColorMap,
                             bool maskInterpolate) override;

    //----- transparency groups and soft masks
    void beginTransparencyGroup(GfxState *state, const double *bbox, GfxColorSpace *blendingColorSpace, bool isolated, bool knockout, bool forSoftMask) override;
    void paintTransparencyGroup(GfxState *state, const double *bbox) override;
    void setSoftMask(GfxState *state, const double *bbox, bool alpha, Function *transferFunc, GfxColor *backdropColor) override;

    //----- special access

    // Returns true if the operations performed since the last call to
    // clearStats() are all monochrome (black or white).
    bool isMonochrome() { return mono; }

    // Returns true if the operations performed since the last call to
    // clearStats() are all gray.
    bool isGray() { return gray; }

    // Returns true if the operations performed since the last call to
    // clearStats() included any transparency.
    bool usesTransparency() { return transparency; }

    // Returns true if the operations performed since the last call to
    // clearStats() are all rasterizable by GDI calls in GDIOutputDev.
    bool isAllGDI() { return gdi; }

    // Returns true if the operations performed since the last call to
    // clearStats() included any image mask fills with a pattern color
    // space. (only level1!)
    bool usesPatternImageMask() { return patternImgMask; }

    // Clear the stats used by the above functions.
    void clearStats();

private:
    void check(GfxColorSpace *colorSpace, const GfxColor *color, double opacity, GfxBlendMode blendMode);

    bool mono;
    bool gray;
    bool transparency;
    bool gdi;
    PSLevel level; // PostScript level (1, 2, separation)
    bool patternImgMask;
    int inTilingPatternFill;
};

#endif
