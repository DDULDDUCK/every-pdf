//========================================================================
//
// JBIG2Stream.h
//
// Copyright 2002-2003 Glyph & Cog, LLC
//
//========================================================================

//========================================================================
//
// Modified under the Poppler project - http://poppler.freedesktop.org
//
// All changes made under the Poppler project to this file are licensed
// under GPL version 2 or later
//
// Copyright (C) 2009 David Benjamin <davidben@mit.edu>
// Copyright (C) 2013 Adrian Johnson <ajohnson@redneon.com>
// Copyright (C) 2015 Suzuki Toshiya <mpsuzuki@hiroshima-u.ac.jp>
// Copyright (C) 2019-2021 Oliver Sander <oliver.sander@tu-dresden.de>
// Copyright (C) 2019 Volker Krause <vkrause@kde.org>
// Copyright (C) 2019, 2021 Albert Astals Cid <aacid@kde.org>
// Copyright (C) 2019, 2020 Even Rouault <even.rouault@spatialys.com>
//
// To see a description of the changes please see the Changelog file that
// came with your tarball or type make ChangeLog if you are building from git
//
//========================================================================

#ifndef JBIG2STREAM_H
#define JBIG2STREAM_H

#include "Object.h"
#include "Stream.h"

class JBIG2Segment;
class JBIG2Bitmap;
class JArithmeticDecoder;
class JArithmeticDecoderStats;
class JBIG2HuffmanDecoder;
struct JBIG2HuffmanTable;
class JBIG2MMRDecoder;

//------------------------------------------------------------------------

class JBIG2Stream : public FilterStream
{
public:
    JBIG2Stream(Stream *strA, Object &&globalsStreamA, Object *globalsStreamRefA);
    ~JBIG2Stream() override;
    StreamKind getKind() const override { return strJBIG2; }
    void reset() override;
    void close() override;
    Goffset getPos() override;
    int getChar() override;
    int lookChar() override;
    GooString *getPSFilter(int psLevel, const char *indent) override;
    bool isBinary(bool last = true) const override;
    virtual Object *getGlobalsStream() { return &globalsStream; }
    virtual Ref getGlobalsStreamRef() { return globalsStreamRef; }

private:
    bool hasGetChars() override { return true; }
    int getChars(int nChars, unsigned char *buffer) override;

    void readSegments();
    bool readSymbolDictSeg(unsigned int segNum, unsigned int length, unsigned int *refSegs, unsigned int nRefSegs);
    void readTextRegionSeg(unsigned int segNum, bool imm, bool lossless, unsigned int length, unsigned int *refSegs, unsigned int nRefSegs);
    std::unique_ptr<JBIG2Bitmap> readTextRegion(bool huff, bool refine, int w, int h, unsigned int numInstances, unsigned int logStrips, int numSyms, const JBIG2HuffmanTable *symCodeTab, unsigned int symCodeLen, JBIG2Bitmap **syms,
                                                unsigned int defPixel, unsigned int combOp, unsigned int transposed, unsigned int refCorner, int sOffset, const JBIG2HuffmanTable *huffFSTable, const JBIG2HuffmanTable *huffDSTable,
                                                const JBIG2HuffmanTable *huffDTTable, const JBIG2HuffmanTable *huffRDWTable, const JBIG2HuffmanTable *huffRDHTable, const JBIG2HuffmanTable *huffRDXTable,
                                                const JBIG2HuffmanTable *huffRDYTable, const JBIG2HuffmanTable *huffRSizeTable, unsigned int templ, int *atx, int *aty);
    void readPatternDictSeg(unsigned int segNum, unsigned int length);
    void readHalftoneRegionSeg(unsigned int segNum, bool imm, bool lossless, unsigned int length, unsigned int *refSegs, unsigned int nRefSegs);
    void readGenericRegionSeg(unsigned int segNum, bool imm, bool lossless, unsigned int length);
    void mmrAddPixels(int a1, int blackPixels, int *codingLine, int *a0i, int w);
    void mmrAddPixelsNeg(int a1, int blackPixels, int *codingLine, int *a0i, int w);
    std::unique_ptr<JBIG2Bitmap> readGenericBitmap(bool mmr, int w, int h, int templ, bool tpgdOn, bool useSkip, JBIG2Bitmap *skip, int *atx, int *aty, int mmrDataLength);
    void readGenericRefinementRegionSeg(unsigned int segNum, bool imm, bool lossless, unsigned int length, unsigned int *refSegs, unsigned int nRefSegs);
    std::unique_ptr<JBIG2Bitmap> readGenericRefinementRegion(int w, int h, int templ, bool tpgrOn, JBIG2Bitmap *refBitmap, int refDX, int refDY, int *atx, int *aty);
    void readPageInfoSeg(unsigned int length);
    void readEndOfStripeSeg(unsigned int length);
    void readProfilesSeg(unsigned int length);
    void readCodeTableSeg(unsigned int segNum, unsigned int length);
    void readExtensionSeg(unsigned int length);
    JBIG2Segment *findSegment(unsigned int segNum);
    void discardSegment(unsigned int segNum);
    void resetGenericStats(unsigned int templ, JArithmeticDecoderStats *prevStats);
    void resetRefinementStats(unsigned int templ, JArithmeticDecoderStats *prevStats);
    bool resetIntStats(int symCodeLen);
    bool readUByte(unsigned int *x);
    bool readByte(int *x);
    bool readUWord(unsigned int *x);
    bool readULong(unsigned int *x);
    bool readLong(int *x);

    Object globalsStream;
    Ref globalsStreamRef;
    unsigned int pageW, pageH, curPageH;
    unsigned int pageDefPixel;
    JBIG2Bitmap *pageBitmap;
    unsigned int defCombOp;
    std::vector<std::unique_ptr<JBIG2Segment>> segments;
    std::vector<std::unique_ptr<JBIG2Segment>> globalSegments;
    Stream *curStr;
    unsigned char *dataPtr;
    unsigned char *dataEnd;
    unsigned int byteCounter;

    JArithmeticDecoder *arithDecoder;
    JArithmeticDecoderStats *genericRegionStats;
    JArithmeticDecoderStats *refinementRegionStats;
    JArithmeticDecoderStats *iadhStats;
    JArithmeticDecoderStats *iadwStats;
    JArithmeticDecoderStats *iaexStats;
    JArithmeticDecoderStats *iaaiStats;
    JArithmeticDecoderStats *iadtStats;
    JArithmeticDecoderStats *iaitStats;
    JArithmeticDecoderStats *iafsStats;
    JArithmeticDecoderStats *iadsStats;
    JArithmeticDecoderStats *iardxStats;
    JArithmeticDecoderStats *iardyStats;
    JArithmeticDecoderStats *iardwStats;
    JArithmeticDecoderStats *iardhStats;
    JArithmeticDecoderStats *iariStats;
    JArithmeticDecoderStats *iaidStats;
    JBIG2HuffmanDecoder *huffDecoder;
    JBIG2MMRDecoder *mmrDecoder;
};

#endif
