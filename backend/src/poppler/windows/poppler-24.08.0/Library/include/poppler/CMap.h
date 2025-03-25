//========================================================================
//
// CMap.h
//
// Copyright 2001-2003 Glyph & Cog, LLC
//
//========================================================================

//========================================================================
//
// Modified under the Poppler project - http://poppler.freedesktop.org
//
// All changes made under the Poppler project to this file are licensed
// under GPL version 2 or later
//
// Copyright (C) 2008 Koji Otani <sho@bbr.jp>
// Copyright (C) 2009, 2018-2020, 2022 Albert Astals Cid <aacid@kde.org>
// Copyright (C) 2012, 2017 Adrian Johnson <ajohnson@redneon.com>
// Copyright (C) 2018 Adam Reichold <adam.reichold@t-online.de>
//
// To see a description of the changes please see the Changelog file that
// came with your tarball or type make ChangeLog if you are building from git
//
//========================================================================

#ifndef CMAP_H
#define CMAP_H

#include <array>
#include <atomic>
#include <memory>

#include "poppler-config.h"
#include "CharTypes.h"

class GooString;
class Object;
struct CMapVectorEntry;
class CMapCache;
class Stream;

//------------------------------------------------------------------------

class CMap
{
public:
    // Parse a CMap from <obj>, which can be a name or a stream.  Sets
    // the initial reference count to 1.  Returns NULL on failure.
    static std::shared_ptr<CMap> parse(CMapCache *cache, const GooString *collectionA, Object *obj);

    // Create the CMap specified by <collection> and <cMapName>.  Sets
    // the initial reference count to 1.  Returns NULL on failure.
    static std::shared_ptr<CMap> parse(CMapCache *cache, const GooString *collectionA, const GooString *cMapNameA);

    // Parse a CMap from <str>.  Sets the initial reference count to 1.
    // Returns NULL on failure.
    static std::shared_ptr<CMap> parse(CMapCache *cache, const GooString *collectionA, Stream *str);

    ~CMap();

    CMap(const CMap &) = delete;
    CMap &operator=(const CMap &) = delete;

    // Return collection name (<registry>-<ordering>).
    const GooString *getCollection() const { return collection; }

    const GooString *getCMapName() const { return cMapName; }

    // Return true if this CMap matches the specified <collectionA>, and
    // <cMapNameA>.
    bool match(const GooString *collectionA, const GooString *cMapNameA);

    // Return the CID corresponding to the character code starting at
    // <s>, which contains <len> bytes.  Sets *<c> to the char code, and
    // *<nUsed> to the number of bytes used by the char code.
    CID getCID(const char *s, int len, CharCode *c, int *nUsed);

    // Return the writing mode (0=horizontal, 1=vertical).
    int getWMode() const { return wMode; }

    void setReverseMap(unsigned int *rmap, unsigned int rmapSize, unsigned int ncand);

private:
    void parse2(CMapCache *cache, int (*getCharFunc)(void *), void *data);
    CMap(GooString *collectionA, GooString *cMapNameA);
    CMap(GooString *collectionA, GooString *cMapNameA, int wModeA);
    void useCMap(CMapCache *cache, const char *useName);
    void useCMap(CMapCache *cache, Object *obj);
    void copyVector(CMapVectorEntry *dest, CMapVectorEntry *src);
    void addCIDs(unsigned int start, unsigned int end, unsigned int nBytes, CID firstCID);
    void freeCMapVector(CMapVectorEntry *vec);
    void setReverseMapVector(unsigned int startCode, CMapVectorEntry *vec, unsigned int *rmap, unsigned int rmapSize, unsigned int ncand);

    GooString *collection;
    GooString *cMapName;
    bool isIdent; // true if this CMap is an identity mapping,
                  //   or is based on one (via usecmap)
    int wMode; // writing mode (0=horizontal, 1=vertical)
    CMapVectorEntry *vector; // vector for first byte (NULL for
                             //   identity CMap)
};

//------------------------------------------------------------------------

#define cMapCacheSize 4

class CMapCache
{
public:
    CMapCache();
    ~CMapCache() = default;

    CMapCache(const CMapCache &) = delete;
    CMapCache &operator=(const CMapCache &) = delete;

    // Get the <cMapName> CMap for the specified character collection.
    // Increments its reference count; there will be one reference for
    // the cache plus one for the caller of this function.
    // Stream is a stream containing the CMap, can be NULL and
    // this means the CMap will be searched in the CMap files
    // Returns NULL on failure.
    std::shared_ptr<CMap> getCMap(const GooString *collection, const GooString *cMapName);

private:
    std::array<std::shared_ptr<CMap>, cMapCacheSize> cache;
};

#endif
