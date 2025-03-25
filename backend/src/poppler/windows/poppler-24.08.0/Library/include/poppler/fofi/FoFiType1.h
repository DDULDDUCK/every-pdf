//========================================================================
//
// FoFiType1.h
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
// Copyright (C) 2018, 2022, 2023 Albert Astals Cid <aacid@kde.org>
// Copyright (C) 2022 Oliver Sander <oliver.sander@tu-dresden.de>
//
// To see a description of the changes please see the Changelog file that
// came with your tarball or type make ChangeLog if you are building from git
//
//========================================================================

#ifndef FOFITYPE1_H
#define FOFITYPE1_H

#include "FoFiBase.h"

#include <string>

//------------------------------------------------------------------------
// FoFiType1
//------------------------------------------------------------------------

class FoFiType1 : public FoFiBase
{
public:
    // Create a FoFiType1 object from a memory buffer.
    static FoFiType1 *make(const unsigned char *fileA, int lenA);

    ~FoFiType1() override;

    // Return the font name.
    std::string getName();

    // Return the encoding, as an array of 256 names (any of which may
    // be NULL).
    char **getEncoding();

    // Write a version of the Type 1 font file with a new encoding.
    void writeEncoded(const char **newEncoding, FoFiOutputFunc outputFunc, void *outputStream) const;

private:
    FoFiType1(const unsigned char *fileA, int lenA, bool freeFileDataA);

    char *getNextLine(char *line) const;
    void parse();
    void undoPFB();

    std::string name;
    char **encoding;
    bool parsed;
};

#endif
