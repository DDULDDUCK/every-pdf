//========================================================================
//
// CairoOutputDev.h
//
// Copyright 2003 Glyph & Cog, LLC
// Copyright 2004 Red Hat, INC
//
//========================================================================

//========================================================================
//
// Modified under the Poppler project - http://poppler.freedesktop.org
//
// All changes made under the Poppler project to this file are licensed
// under GPL version 2 or later
//
// Copyright (C) 2005-2008 Jeff Muizelaar <jeff@infidigm.net>
// Copyright (C) 2005, 2006 Kristian Høgsberg <krh@redhat.com>
// Copyright (C) 2005 Nickolay V. Shmyrev <nshmyrev@yandex.ru>
// Copyright (C) 2006-2011, 2013 Carlos Garcia Campos <carlosgc@gnome.org>
// Copyright (C) 2008, 2009, 2011-2017, 2022-2024 Adrian Johnson <ajohnson@redneon.com>
// Copyright (C) 2008 Michael Vrable <mvrable@cs.ucsd.edu>
// Copyright (C) 2010-2013 Thomas Freitag <Thomas.Freitag@alfa.de>
// Copyright (C) 2015 Suzuki Toshiya <mpsuzuki@hiroshima-u.ac.jp>
// Copyright (C) 2016 Jason Crain <jason@aquaticape.us>
// Copyright (C) 2018, 2019, 2021 Albert Astals Cid <aacid@kde.org>
// Copyright (C) 2018 Klarälvdalens Datakonsult AB, a KDAB Group company, <info@kdab.com>. Work sponsored by the LiMux project of the city of Munich
// Copyright (C) 2020 Michal <sudolskym@gmail.com>
// Copyright (C) 2021 Christian Persch <chpe@src.gnome.org>
// Copyright (C) 2022 Marek Kasik <mkasik@redhat.com>
//
// To see a description of the changes please see the Changelog file that
// came with your tarball or type make ChangeLog if you are building from git
//
//========================================================================

#ifndef CAIROOUTPUTDEV_H
#define CAIROOUTPUTDEV_H

#include <unordered_set>

#include <cairo-ft.h>
#include "OutputDev.h"
#include "TextOutputDev.h"
#include "GfxState.h"
#include "StructElement.h"
#include "StructTreeRoot.h"
#include "Annot.h"
#include "Link.h"

class PDFDoc;
class GfxState;
class GfxPath;
class Gfx8BitFont;
struct GfxRGB;
class CairoFontEngine;
class CairoFont;

//------------------------------------------------------------------------

//------------------------------------------------------------------------
// CairoImage
//------------------------------------------------------------------------
class CairoImage
{
public:
    // Constructor.
    CairoImage(double x1, double y1, double x2, double y2);

    // Destructor.
    ~CairoImage();

    CairoImage(const CairoImage &) = delete;
    CairoImage &operator=(const CairoImage &) = delete;

    // Set the image cairo surface
    void setImage(cairo_surface_t *image);

    // Get the image cairo surface
    cairo_surface_t *getImage() const { return image; }

    // Get the image rectangle
    void getRect(double *xa1, double *ya1, double *xa2, double *ya2)
    {
        *xa1 = x1;
        *ya1 = y1;
        *xa2 = x2;
        *ya2 = y2;
    }

private:
    cairo_surface_t *image; // image cairo surface
    double x1, y1; // upper left corner
    double x2, y2; // lower right corner
};

//------------------------------------------------------------------------
// CairoOutputDev
//------------------------------------------------------------------------

class CairoOutputDev : public OutputDev
{
public:
    // Constructor.
    CairoOutputDev();

    // Destructor.
    ~CairoOutputDev() override;

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
    bool useShadedFills(int type) override { return type <= 7; }

    // Does this device use FillColorStop()?
    bool useFillColorStop() override { return true; }

    // Does this device use beginType3Char/endType3Char?  Otherwise,
    // text in Type 3 fonts will be drawn with drawChar/drawString.
    bool interpretType3Chars() override { return false; }

    // Does this device need to clip pages to the crop box even when the
    // box is the crop box?
    bool needClipToCropBox() override { return true; }

    //----- initialization and control

    // Start a page.
    void startPage(int pageNum, GfxState *state, XRef *xref) override;

    // End a page.
    void endPage() override;

    // Must be called before last call to endPage()
    void emitStructTree();

    void beginForm(Object *obj, Ref id) override;
    void endForm(Object *obj, Ref id) override;

    //----- save/restore graphics state
    void saveState(GfxState *state) override;
    void restoreState(GfxState *state) override;

    //----- update graphics state
    void updateAll(GfxState *state) override;
    void setDefaultCTM(const double *ctm) override;
    void updateCTM(GfxState *state, double m11, double m12, double m21, double m22, double m31, double m32) override;
    void updateLineDash(GfxState *state) override;
    void updateFlatness(GfxState *state) override;
    void updateLineJoin(GfxState *state) override;
    void updateLineCap(GfxState *state) override;
    void updateMiterLimit(GfxState *state) override;
    void updateLineWidth(GfxState *state) override;
    void updateFillColor(GfxState *state) override;
    void updateStrokeColor(GfxState *state) override;
    void updateFillOpacity(GfxState *state) override;
    void updateStrokeOpacity(GfxState *state) override;
    void updateFillColorStop(GfxState *state, double offset) override;
    void updateBlendMode(GfxState *state) override;

    //----- update text state
    void updateFont(GfxState *state) override;

    //----- path painting
    void stroke(GfxState *state) override;
    void fill(GfxState *state) override;
    void eoFill(GfxState *state) override;
    void clipToStrokePath(GfxState *state) override;
    bool tilingPatternFill(GfxState *state, Gfx *gfx, Catalog *cat, GfxTilingPattern *tPat, const double *mat, int x0, int y0, int x1, int y1, double xStep, double yStep) override;
    bool functionShadedFill(GfxState *state, GfxFunctionShading *shading) override;
    bool axialShadedFill(GfxState *state, GfxAxialShading *shading, double tMin, double tMax) override;
    bool axialShadedSupportExtend(GfxState *state, GfxAxialShading *shading) override;
    bool radialShadedFill(GfxState *state, GfxRadialShading *shading, double sMin, double sMax) override;
    bool radialShadedSupportExtend(GfxState *state, GfxRadialShading *shading) override;
    bool gouraudTriangleShadedFill(GfxState *state, GfxGouraudTriangleShading *shading) override;
    bool patchMeshShadedFill(GfxState *state, GfxPatchMeshShading *shading) override;

    //----- path clipping
    void clip(GfxState *state) override;
    void eoClip(GfxState *state) override;

    //----- text drawing
    void beginString(GfxState *state, const GooString *s) override;
    void endString(GfxState *state) override;
    void drawChar(GfxState *state, double x, double y, double dx, double dy, double originX, double originY, CharCode code, int nBytes, const Unicode *u, int uLen) override;
    void beginActualText(GfxState *state, const GooString *text) override;
    void endActualText(GfxState *state) override;

    bool beginType3Char(GfxState *state, double x, double y, double dx, double dy, CharCode code, const Unicode *u, int uLen) override;
    void endType3Char(GfxState *state) override;
    void beginTextObject(GfxState *state) override;
    void endTextObject(GfxState *state) override;

    void beginMarkedContent(const char *name, Dict *properties) override;
    void endMarkedContent(GfxState *state) override;

    //----- image drawing
    void drawImageMask(GfxState *state, Object *ref, Stream *str, int width, int height, bool invert, bool interpolate, bool inlineImg) override;
    void setSoftMaskFromImageMask(GfxState *state, Object *ref, Stream *str, int width, int height, bool invert, bool inlineImg, double *baseMatrix) override;
    void unsetSoftMaskFromImageMask(GfxState *state, double *baseMatrix) override;
    void drawImageMaskRegular(GfxState *state, Object *ref, Stream *str, int width, int height, bool invert, bool interpolate, bool inlineImg);

    void drawImage(GfxState *state, Object *ref, Stream *str, int width, int height, GfxImageColorMap *colorMap, bool interpolate, const int *maskColors, bool inlineImg) override;
    void drawSoftMaskedImage(GfxState *state, Object *ref, Stream *str, int width, int height, GfxImageColorMap *colorMap, bool interpolate, Stream *maskStr, int maskWidth, int maskHeight, GfxImageColorMap *maskColorMap,
                             bool maskInterpolate) override;

    void drawMaskedImage(GfxState *state, Object *ref, Stream *str, int width, int height, GfxImageColorMap *colorMap, bool interpolate, Stream *maskStr, int maskWidth, int maskHeight, bool maskInvert, bool maskInterpolate) override;

    //----- transparency groups and soft masks
    void beginTransparencyGroup(GfxState * /*state*/, const double * /*bbox*/, GfxColorSpace * /*blendingColorSpace*/, bool /*isolated*/, bool /*knockout*/, bool /*forSoftMask*/) override;
    void endTransparencyGroup(GfxState * /*state*/) override;
    void popTransparencyGroup();
    void paintTransparencyGroup(GfxState * /*state*/, const double * /*bbox*/) override;
    void setSoftMask(GfxState * /*state*/, const double * /*bbox*/, bool /*alpha*/, Function * /*transferFunc*/, GfxColor * /*backdropColor*/) override;
    void clearSoftMask(GfxState * /*state*/) override;

    //----- Type 3 font operators
    void type3D0(GfxState *state, double wx, double wy) override;
    void type3D1(GfxState *state, double wx, double wy, double llx, double lly, double urx, double ury) override;

    //----- special access

    // Called to indicate that a new PDF document has been loaded.
    void startDoc(PDFDoc *docA, CairoFontEngine *fontEngine = nullptr);

    // Called to prepare this output dev for rendering CairoType3Font.
    void startType3Render(GfxState *state, XRef *xref);

    bool isReverseVideo() { return false; }

    void setCairo(cairo_t *cr);
    void setTextPage(TextPage *text);
    void setPrinting(bool printingA)
    {
        printing = printingA;
        needFontUpdate = true;
    }
    void copyAntialias(cairo_t *cr, cairo_t *source_cr);
    void setLogicalStructure(bool logStruct) { this->logicalStruct = logStruct; }

    enum Type3RenderType
    {
        Type3RenderNone,
        Type3RenderMask,
        Type3RenderColor
    };
    void setType3RenderType(Type3RenderType state) { t3_render_state = state; }
    void getType3GlyphWidth(double *wx, double *wy)
    {
        *wx = t3_glyph_wx;
        *wy = t3_glyph_wy;
    }
    bool hasType3GlyphBBox() { return t3_glyph_has_bbox; }
    double *getType3GlyphBBox() { return t3_glyph_bbox; }
    bool type3GlyphHasColor() { return t3_glyph_has_color; }

protected:
    void doPath(cairo_t *cairo, GfxState *state, const GfxPath *path);
    cairo_surface_t *downscaleSurface(cairo_surface_t *orig_surface);
    void getScaledSize(const cairo_matrix_t *matrix, int orig_width, int orig_height, int *scaledWidth, int *scaledHeight);
    cairo_filter_t getFilterForSurface(cairo_surface_t *image, bool interpolate);
    bool getStreamData(Stream *str, char **buffer, int *length);
    void setMimeData(GfxState *state, Stream *str, Object *ref, GfxImageColorMap *colorMap, cairo_surface_t *image, int height);
    void fillToStrokePathClip(GfxState *state);
    void alignStrokeCoords(const GfxSubpath *subpath, int i, double *x, double *y);
    AnnotLink *findLinkObject(const StructElement *elem);
    void quadToCairoRect(AnnotQuadrilaterals *quads, int idx, double destPageHeight, cairo_rectangle_t *rect);
    bool appendLinkDestRef(GooString *s, const LinkDest *dest);
    void appendLinkDestXY(GooString *s, const LinkDest *dest, double destPageHeight);
    bool beginLinkTag(AnnotLink *annotLink);
    bool beginLink(const StructElement *linkElem);
    void getStructElemAttributeString(const StructElement *elem);
    int getContentElementStructParents(const StructElement *element);
    bool checkIfStructElementNeeded(const StructElement *element);
    void emitStructElement(const StructElement *elem);
    void startFirstPage(int pageNum, GfxState *state, XRef *xrefA);
    bool setMimeDataForJBIG2Globals(Stream *str, cairo_surface_t *image);
    bool setMimeDataForCCITTParams(Stream *str, cairo_surface_t *image, int height);
    static void textStringToQuotedUtf8(const GooString *text, GooString *s);
    bool isPDF();

    std::optional<GfxRGB> fill_color, stroke_color;
    cairo_pattern_t *fill_pattern, *stroke_pattern;
    double fill_opacity;
    double stroke_opacity;
    bool stroke_adjust;
    bool adjusted_stroke_width;
    bool align_stroke_coords;
    std::shared_ptr<CairoFont> currentFont;
    XRef *xref;

    struct StrokePathClip
    {
        GfxPath *path;
        cairo_matrix_t ctm;
        double line_width;
        double *dashes;
        int dash_count;
        double dash_offset;
        cairo_line_cap_t cap;
        cairo_line_join_t join;
        double miter;
        int ref_count;
    } *strokePathClip;

    PDFDoc *doc; // the current document

    static FT_Library ft_lib;
    static std::once_flag ft_lib_once_flag;

    CairoFontEngine *fontEngine;
    bool fontEngine_owner;

    cairo_t *cairo;
    cairo_matrix_t orig_matrix;
    bool needFontUpdate; // set when the font needs to be updated
    bool printing;
    bool use_show_text_glyphs;
    bool text_matrix_valid;
    cairo_glyph_t *glyphs;
    int glyphCount;
    cairo_text_cluster_t *clusters;
    int clusterCount;
    char *utf8;
    int utf8Count;
    int utf8Max;
    cairo_path_t *textClipPath;
    bool inUncoloredPattern; // inside a uncolored pattern (PaintType = 2)
    Type3RenderType t3_render_state;
    double t3_glyph_wx, t3_glyph_wy;
    bool t3_glyph_has_bbox;
    bool t3_glyph_has_color;
    bool has_color;
    double t3_glyph_bbox[4];
    bool logicalStruct;
    bool firstPage;
    int pdfPageNum; // page number of the PDF file
    int cairoPageNum; // page number in cairo output
    std::vector<std::string> markedContentStack;
    std::vector<Annot *> annotations;
    std::set<std::string> emittedDestinations;
    std::map<int, int> pdfPageToCairoPageMap;

    TextPage *textPage; // text for the current page
    ActualText *actualText;

    cairo_pattern_t *group;
    cairo_pattern_t *shape;
    cairo_pattern_t *mask;
    cairo_matrix_t mask_matrix;
    cairo_t *cairo_shape;
    int knockoutCount;
    struct ColorSpaceStack
    {
        bool knockout;
        GfxColorSpace *cs;
        cairo_matrix_t group_matrix;
        struct ColorSpaceStack *next;
    } *groupColorSpaceStack;

    struct SaveStateElement
    {
        // These patterns hold a reference
        cairo_pattern_t *fill_pattern;
        cairo_pattern_t *stroke_pattern;
        double fill_opacity;
        double stroke_opacity;
        cairo_pattern_t *mask; // can be null
        cairo_matrix_t mask_matrix;
        Ref fontRef;
    };
    std::vector<SaveStateElement> saveStateStack;

    std::map<Ref, std::map<std::string, std::unique_ptr<LinkDest>>> destsMap;
    std::map<Ref, int> pdfPageRefToCairoPageNumMap;
    std::vector<int> structParentsStack;
    int currentStructParents;

    struct StructParentsMcidHash
    {
        size_t operator()(std::pair<int, int> x) const { return x.first << 16 | x.second; }
    };
    std::unordered_set<std::pair<int, int>, StructParentsMcidHash> mcidEmitted; // <structParent, MCID>

    std::unordered_set<const StructElement *> structElementNeeded;
};

//------------------------------------------------------------------------
// CairoImageOutputDev
//------------------------------------------------------------------------

// XXX: this should ideally not inherit from CairoOutputDev but use it instead perhaps
class CairoImageOutputDev : public CairoOutputDev
{
public:
    // Constructor.
    CairoImageOutputDev();

    // Destructor.
    ~CairoImageOutputDev() override;

    //----- get info about output device

    // Does this device use upside-down coordinates?
    // (Upside-down means (0,0) is the top left corner of the page.)
    bool upsideDown() override { return true; }

    // Does this device use drawChar() or drawString()?
    bool useDrawChar() override { return false; }

    // Does this device use tilingPatternFill()?  If this returns false,
    // tiling pattern fills will be reduced to a series of other drawing
    // operations.
    bool useTilingPatternFill() override { return true; }

    // Does this device use functionShadedFill(), axialShadedFill(), and
    // radialShadedFill()?  If this returns false, these shaded fills
    // will be reduced to a series of other drawing operations.
    bool useShadedFills(int type) override { return type <= 7; }

    // Does this device use FillColorStop()?
    bool useFillColorStop() override { return false; }

    // Does this device use beginType3Char/endType3Char?  Otherwise,
    // text in Type 3 fonts will be drawn with drawChar/drawString.
    bool interpretType3Chars() override { return false; }

    // Does this device need non-text content?
    bool needNonText() override { return true; }

    //----- save/restore graphics state
    void saveState(GfxState *state) override { }
    void restoreState(GfxState *state) override { }

    //----- update graphics state
    void updateAll(GfxState *state) override { }
    void setDefaultCTM(const double *ctm) override { }
    void updateCTM(GfxState *state, double m11, double m12, double m21, double m22, double m31, double m32) override { }
    void updateLineDash(GfxState *state) override { }
    void updateFlatness(GfxState *state) override { }
    void updateLineJoin(GfxState *state) override { }
    void updateLineCap(GfxState *state) override { }
    void updateMiterLimit(GfxState *state) override { }
    void updateLineWidth(GfxState *state) override { }
    void updateFillColor(GfxState *state) override { }
    void updateStrokeColor(GfxState *state) override { }
    void updateFillOpacity(GfxState *state) override { }
    void updateStrokeOpacity(GfxState *state) override { }
    void updateBlendMode(GfxState *state) override { }

    //----- update text state
    void updateFont(GfxState *state) override { }

    //----- path painting
    void stroke(GfxState *state) override { }
    void fill(GfxState *state) override { }
    void eoFill(GfxState *state) override { }
    void clipToStrokePath(GfxState *state) override { }
    bool tilingPatternFill(GfxState *state, Gfx *gfx, Catalog *cat, GfxTilingPattern *tPat, const double *mat, int x0, int y0, int x1, int y1, double xStep, double yStep) override { return true; }
    bool axialShadedFill(GfxState *state, GfxAxialShading *shading, double tMin, double tMax) override { return true; }
    bool radialShadedFill(GfxState *state, GfxRadialShading *shading, double sMin, double sMax) override { return true; }

    //----- path clipping
    void clip(GfxState *state) override { }
    void eoClip(GfxState *state) override { }

    //----- image drawing
    void drawImageMask(GfxState *state, Object *ref, Stream *str, int width, int height, bool invert, bool interpolate, bool inlineImg) override;
    void drawImage(GfxState *state, Object *ref, Stream *str, int width, int height, GfxImageColorMap *colorMap, bool interpolate, const int *maskColors, bool inlineImg) override;
    void drawSoftMaskedImage(GfxState *state, Object *ref, Stream *str, int width, int height, GfxImageColorMap *colorMap, bool interpolate, Stream *maskStr, int maskWidth, int maskHeight, GfxImageColorMap *maskColorMap,
                             bool maskInterpolate) override;
    void drawMaskedImage(GfxState *state, Object *ref, Stream *str, int width, int height, GfxImageColorMap *colorMap, bool interpolate, Stream *maskStr, int maskWidth, int maskHeight, bool maskInvert, bool maskInterpolate) override;
    void setSoftMaskFromImageMask(GfxState *state, Object *ref, Stream *str, int width, int height, bool invert, bool inlineImg, double *baseMatrix) override;
    void unsetSoftMaskFromImageMask(GfxState *state, double *baseMatrix) override { }

    //----- transparency groups and soft masks
    void beginTransparencyGroup(GfxState * /*state*/, const double * /*bbox*/, GfxColorSpace * /*blendingColorSpace*/, bool /*isolated*/, bool /*knockout*/, bool /*forSoftMask*/) override { }
    void endTransparencyGroup(GfxState * /*state*/) override { }
    void paintTransparencyGroup(GfxState * /*state*/, const double * /*bbox*/) override { }
    void setSoftMask(GfxState * /*state*/, const double * /*bbox*/, bool /*alpha*/, Function * /*transferFunc*/, GfxColor * /*backdropColor*/) override { }
    void clearSoftMask(GfxState * /*state*/) override { }

    //----- Image list
    // By default images are not rendred
    void setImageDrawDecideCbk(bool (*cbk)(int img_id, void *data), void *data)
    {
        imgDrawCbk = cbk;
        imgDrawCbkData = data;
    }
    // Iterate through list of images.
    int getNumImages() const { return numImages; }
    CairoImage *getImage(int i) const { return images[i]; }

private:
    void saveImage(CairoImage *image);
    void getBBox(GfxState *state, int width, int height, double *x1, double *y1, double *x2, double *y2);

    CairoImage **images;
    int numImages;
    int size;
    bool (*imgDrawCbk)(int img_id, void *data);
    void *imgDrawCbkData;
};

#endif
