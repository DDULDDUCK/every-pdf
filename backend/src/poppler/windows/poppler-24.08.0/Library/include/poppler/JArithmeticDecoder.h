//========================================================================
//
// JArithmeticDecoder.h
//
// Arithmetic decoder used by the JBIG2 and JPEG2000 decoders.
//
// Copyright 2002-2004 Glyph & Cog, LLC
//
//========================================================================

//========================================================================
//
// Modified under the Poppler project - http://poppler.freedesktop.org
//
// All changes made under the Poppler project to this file are licensed
// under GPL version 2 or later
//
// Copyright (C) 2018, 2021 Albert Astals Cid <aacid@kde.org>
// Copyright (C) 2019 Volker Krause <vkrause@kde.org>
// Copyright (C) 2020 Even Rouault <even.rouault@spatialys.com>
//
// To see a description of the changes please see the Changelog file that
// came with your tarball or type make ChangeLog if you are building from git
//
//========================================================================

#ifndef JARITHMETICDECODER_H
#define JARITHMETICDECODER_H

class Stream;

//------------------------------------------------------------------------
// JArithmeticDecoderStats
//------------------------------------------------------------------------

class JArithmeticDecoderStats
{
public:
    explicit JArithmeticDecoderStats(int contextSizeA);
    ~JArithmeticDecoderStats();
    JArithmeticDecoderStats(const JArithmeticDecoderStats &) = delete;
    JArithmeticDecoderStats &operator=(const JArithmeticDecoderStats &) = delete;
    JArithmeticDecoderStats *copy();
    void reset();
    int getContextSize() { return contextSize; }
    void copyFrom(JArithmeticDecoderStats *stats);
    void setEntry(unsigned int cx, int i, int mps);
    bool isValid() const { return cxTab != nullptr; }

private:
    unsigned char *cxTab; // cxTab[cx] = (i[cx] << 1) + mps[cx]
    int contextSize;

    friend class JArithmeticDecoder;
};

//------------------------------------------------------------------------
// JArithmeticDecoder
//------------------------------------------------------------------------

class JArithmeticDecoder
{
public:
    JArithmeticDecoder();
    ~JArithmeticDecoder();
    JArithmeticDecoder(const JArithmeticDecoder &) = delete;
    JArithmeticDecoder &operator=(const JArithmeticDecoder &) = delete;

    void setStream(Stream *strA)
    {
        str = strA;
        dataLen = 0;
        limitStream = false;
    }
    void setStream(Stream *strA, int dataLenA)
    {
        str = strA;
        dataLen = dataLenA;
        limitStream = true;
    }

    // Start decoding on a new stream.  This fills the byte buffers and
    // runs INITDEC.
    void start();

    // Restart decoding on an interrupted stream.  This refills the
    // buffers if needed, but does not run INITDEC.  (This is used in
    // JPEG 2000 streams when codeblock data is split across multiple
    // packets/layers.)
    void restart(int dataLenA);

    // Read any leftover data in the stream.
    void cleanup();

    // Decode one bit.
    int decodeBit(unsigned int context, JArithmeticDecoderStats *stats);

    // Decode eight bits.
    int decodeByte(unsigned int context, JArithmeticDecoderStats *stats);

    // Returns false for OOB, otherwise sets *<x> and returns true.
    bool decodeInt(int *x, JArithmeticDecoderStats *stats);

    unsigned int decodeIAID(unsigned int codeLen, JArithmeticDecoderStats *stats);

    void resetByteCounter() { nBytesRead = 0; }
    unsigned int getByteCounter() { return nBytesRead; }

private:
    unsigned int readByte();
    int decodeIntBit(JArithmeticDecoderStats *stats);
    void byteIn();

    static const unsigned int qeTab[47];
    static const int nmpsTab[47];
    static const int nlpsTab[47];
    static const int switchTab[47];

    unsigned int buf0, buf1;
    unsigned int c, a;
    int ct;

    unsigned int prev; // for the integer decoder

    Stream *str;
    unsigned int nBytesRead;
    int dataLen;
    bool limitStream;
};

#endif
