//========================================================================
//
// FoFiBase.h
//
// Copyright 1999-2003 Glyph & Cog, LLC
//
//========================================================================

//========================================================================
//
// Modified under the Poppler project - http://poppler.freedesktop.org
//
// All changes made under the Poppler project to this file are licensed
// under GPL version 2 or later
//
// Copyright (C) 2018, 2022 Albert Astals Cid <aacid@kde.org>
// Copyright (C) 2022 Oliver Sander <oliver.sander@tu-dresden.de>
//
// To see a description of the changes please see the Changelog file that
// came with your tarball or type make ChangeLog if you are building from git
//
//========================================================================

#ifndef FOFIBASE_H
#define FOFIBASE_H

//------------------------------------------------------------------------

using FoFiOutputFunc = void (*)(void *stream, const char *data, size_t len);

//------------------------------------------------------------------------
// FoFiBase
//------------------------------------------------------------------------

class POPPLER_PRIVATE_EXPORT FoFiBase
{
public:
    FoFiBase(const FoFiBase &) = delete;
    FoFiBase &operator=(const FoFiBase &other) = delete;

    virtual ~FoFiBase();

protected:
    FoFiBase(const unsigned char *fileA, int lenA, bool freeFileDataA);
    static char *readFile(const char *fileName, int *fileLen);

    // S = signed / U = unsigned
    // 8/16/32/Var = word length, in bytes
    // BE = big endian
    int getS8(int pos, bool *ok) const;
    int getU8(int pos, bool *ok) const;
    int getS16BE(int pos, bool *ok) const;
    int getU16BE(int pos, bool *ok) const;
    int getS32BE(int pos, bool *ok) const;
    unsigned int getU32BE(int pos, bool *ok) const;
    unsigned int getU32LE(int pos, bool *ok) const;
    unsigned int getUVarBE(int pos, int size, bool *ok) const;

    bool checkRegion(int pos, int size) const;

    const unsigned char *file;
    int len;
    bool freeFileData;
};

#endif
