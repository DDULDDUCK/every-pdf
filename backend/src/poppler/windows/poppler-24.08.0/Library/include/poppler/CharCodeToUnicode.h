//========================================================================
//
// CharCodeToUnicode.h
//
// Mapping from character codes to Unicode.
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
// Copyright (C) 2007 Julien Rebetez <julienr@svn.gnome.org>
// Copyright (C) 2007 Koji Otani <sho@bbr.jp>
// Copyright (C) 2008, 2011, 2012, 2018, 2019, 2021, 2022 Albert Astals Cid <aacid@kde.org>
// Copyright (C) 2017 Adrian Johnson <ajohnson@redneon.com>
// Copyright (C) 2018 Klarälvdalens Datakonsult AB, a KDAB Group company, <info@kdab.com>. Work sponsored by the LiMux project of the city of Munich
// Copyright (C) 2018 Adam Reichold <adam.reichold@t-online.de>
// Copyright (C) 2019 <corentinf@free.fr>
// Copyright (C) 2024 g10 Code GmbH, Author: Sune Stolborg Vuorela <sune@vuorela.dk>
//
// To see a description of the changes please see the Changelog file that
// came with your tarball or type make ChangeLog if you are building from git
//
//========================================================================

#ifndef CHARCODETOUNICODE_H
#define CHARCODETOUNICODE_H

#include <atomic>
#include <optional>
#include <vector>

#include "poppler-config.h"
#include "CharTypes.h"

class GooString;

//------------------------------------------------------------------------

class CharCodeToUnicode
{
    friend class UnicodeToCharCode;

public:
    // Create an identity mapping (Unicode = CharCode).
    static CharCodeToUnicode *makeIdentityMapping();

    // Read the CID-to-Unicode mapping for <collection> from the file
    // specified by <fileName>.  Sets the initial reference count to 1.
    // Returns NULL on failure.
    static CharCodeToUnicode *parseCIDToUnicode(const char *fileName, const GooString *collection);

    // Create the CharCode-to-Unicode mapping for an 8-bit font.
    // <toUnicode> is an array of 256 Unicode indexes.  Sets the initial
    // reference count to 1.
    static CharCodeToUnicode *make8BitToUnicode(Unicode *toUnicode);

    // Parse a ToUnicode CMap for an 8- or 16-bit font.
    static CharCodeToUnicode *parseCMap(const GooString *buf, int nBits);
    static CharCodeToUnicode *parseCMapFromFile(const GooString *fileName, int nBits);

    // Parse a ToUnicode CMap for an 8- or 16-bit font, merging it into
    // <this>.
    void mergeCMap(const GooString *buf, int nBits);

    ~CharCodeToUnicode() = default;

    CharCodeToUnicode(const CharCodeToUnicode &) = delete;
    CharCodeToUnicode &operator=(const CharCodeToUnicode &) = delete;

    void incRefCnt();
    void decRefCnt();

    // Return true if this mapping matches the specified <tagA>.
    bool match(const GooString *tagA);

    // Set the mapping for <c>.
    void setMapping(CharCode c, Unicode *u, int len);

    // Map a CharCode to Unicode. Returns a pointer in u to internal storage
    // so never store the pointers it returns, just the data, otherwise
    // your pointed values might get changed by future calls
    int mapToUnicode(CharCode c, Unicode const **u) const;

    // Map a Unicode to CharCode.
    int mapToCharCode(const Unicode *u, CharCode *c, int usize) const;

private:
    struct CharCodeToUnicodeString
    {
        CharCode c;
        std::vector<Unicode> u;
    };
    bool parseCMap1(int (*getCharFunc)(void *), void *data, int nBits);
    void addMapping(CharCode code, char *uStr, int n, int offset);
    void addMappingInt(CharCode code, Unicode u);
    CharCodeToUnicode();
    explicit CharCodeToUnicode(const std::optional<std::string> &tagA);
    CharCodeToUnicode(const std::optional<std::string> &tagA, std::vector<Unicode> &&mapA, std::vector<CharCodeToUnicodeString> &&sMapA);

    const std::optional<std::string> tag;
    std::vector<Unicode> map;
    std::vector<CharCodeToUnicodeString> sMap;
    std::atomic_int refCnt;
    bool isIdentity;
};

//------------------------------------------------------------------------

class CharCodeToUnicodeCache
{
public:
    explicit CharCodeToUnicodeCache(int sizeA);
    ~CharCodeToUnicodeCache();

    CharCodeToUnicodeCache(const CharCodeToUnicodeCache &) = delete;
    CharCodeToUnicodeCache &operator=(const CharCodeToUnicodeCache &) = delete;

    // Get the CharCodeToUnicode object for <tag>.  Increments its
    // reference count; there will be one reference for the cache plus
    // one for the caller of this function.  Returns NULL on failure.
    CharCodeToUnicode *getCharCodeToUnicode(const GooString *tag);

    // Insert <ctu> into the cache, in the most-recently-used position.
    void add(CharCodeToUnicode *ctu);

private:
    CharCodeToUnicode **cache;
    int size;
};

#endif
