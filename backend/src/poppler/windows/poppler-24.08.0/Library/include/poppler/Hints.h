//========================================================================
//
// Hints.h
//
// This file is licensed under the GPLv2 or later
//
// Copyright 2010 Hib Eris <hib@hiberis.nl>
// Copyright 2010, 2013, 2016, 2018 Albert Astals Cid <aacid@kde.org>
// Copyright 2013 Adrian Johnson <ajohnson@redneon.com>
//
//========================================================================

#ifndef HINTS_H
#define HINTS_H

#include <cstring>
#include <vector>
#include "PDFDoc.h"

class Stream;
class BaseStream;
class Linearization;
class XRef;

//------------------------------------------------------------------------
// Hints
//------------------------------------------------------------------------

class Hints
{
public:
    Hints(BaseStream *str, Linearization *linearization, XRef *xref, SecurityHandler *secHdlr);
    ~Hints();

    Hints(const Hints &) = delete;
    Hints &operator=(const Hints &) = delete;

    bool isOk() const;

    int getPageObjectNum(int page);
    Goffset getPageOffset(int page);

private:
    void readTables(BaseStream *str, Linearization *linearization, XRef *xref, SecurityHandler *secHdlr);
    bool readPageOffsetTable(Stream *str);
    bool readSharedObjectsTable(Stream *str);

    unsigned int hintsOffset;
    unsigned int hintsLength;
    unsigned int hintsOffset2;
    unsigned int hintsLength2;
    unsigned int mainXRefEntriesOffset;

    int nPages;
    int pageFirst;
    int pageObjectFirst;
    Goffset pageOffsetFirst;
    unsigned int pageEndFirst;

    unsigned int nObjectLeast;
    unsigned int objectOffsetFirst;
    unsigned int nBitsDiffObjects;
    unsigned int pageLengthLeast;
    unsigned int nBitsDiffPageLength;
    unsigned int OffsetStreamLeast;
    unsigned int nBitsOffsetStream;
    unsigned int lengthStreamLeast;
    unsigned int nBitsLengthStream;
    unsigned int nBitsNumShared;
    unsigned int nBitsShared;
    unsigned int nBitsNumerator;
    unsigned int denominator;

    unsigned int *nObjects;
    int *pageObjectNum;
    unsigned int *xRefOffset;
    unsigned int *pageLength;
    Goffset *pageOffset;
    unsigned int *numSharedObject;
    unsigned int **sharedObjectId;

    unsigned int *groupLength;
    unsigned int *groupOffset;
    unsigned int *groupHasSignature;
    unsigned int *groupNumObjects;
    unsigned int *groupXRefOffset;
    bool ok;
};

#endif
