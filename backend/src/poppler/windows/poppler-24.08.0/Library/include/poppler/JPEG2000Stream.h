//========================================================================
//
// JPEG2000Stream.h
//
// A JPX stream decoder using OpenJPEG
//
// Copyright 2008, 2010, 2019, 2021 Albert Astals Cid <aacid@kde.org>
// Copyright 2011 Daniel Glöckner <daniel-gl@gmx.net>
// Copyright 2013, 2014 Adrian Johnson <ajohnson@redneon.com>
// Copyright 2015 Adam Reichold <adam.reichold@t-online.de>
//
// Licensed under GPLv2 or later
//
//========================================================================

#ifndef JPEG2000STREAM_H
#define JPEG2000STREAM_H

#include "config.h"
#include "Object.h"
#include "Stream.h"

struct JPXStreamPrivate;

class JPXStream : public FilterStream
{
public:
    explicit JPXStream(Stream *strA);
    ~JPXStream() override;

    JPXStream(const JPXStream &other) = delete;
    JPXStream &operator=(const JPXStream &other) = delete;

    StreamKind getKind() const override { return strJPX; }
    void reset() override;
    void close() override;
    Goffset getPos() override;
    int getChar() override;
    int lookChar() override;
    GooString *getPSFilter(int psLevel, const char *indent) override;
    bool isBinary(bool last = true) const override;
    void getImageParams(int *bitsPerComponent, StreamColorSpaceMode *csMode) override;

    int readStream(int nChars, unsigned char *buffer) { return str->doGetChars(nChars, buffer); }

private:
    JPXStreamPrivate *priv;

    void init();
    bool hasGetChars() override { return true; }
    int getChars(int nChars, unsigned char *buffer) override;
};

#endif
