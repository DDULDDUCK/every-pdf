//========================================================================
//
// Linearization.h
//
// This file is licensed under the GPLv2 or later
//
// Copyright 2010 Hib Eris <hib@hiberis.nl>
// Copyright 2019, 2021 Albert Astals Cid <aacid@kde.org>
//
//========================================================================

#ifndef LINEARIZATION_H
#define LINEARIZATION_H

#include "Object.h"
class BaseStream;

//------------------------------------------------------------------------
// Linearization
//------------------------------------------------------------------------

class Linearization
{
public:
    explicit Linearization(BaseStream *str);
    ~Linearization();

    unsigned int getLength() const;
    unsigned int getHintsOffset() const;
    unsigned int getHintsLength() const;
    unsigned int getHintsOffset2() const;
    unsigned int getHintsLength2() const;
    int getObjectNumberFirst() const;
    unsigned int getEndFirst() const;
    int getNumPages() const;
    unsigned int getMainXRefEntriesOffset() const;
    int getPageFirst() const;

private:
    Object linDict;
};

#endif
