//========================================================================
//
// LocalPDFDocBuilder.h
//
// This file is licensed under the GPLv2 or later
//
// Copyright 2010 Hib Eris <hib@hiberis.nl>
// Copyright 2010, 2018, 2022 Albert Astals Cid <aacid@kde.org>
// Copyright 2021 Oliver Sander <oliver.sander@tu-dresden.de>
//
//========================================================================

#ifndef LOCALPDFDOCBUILDER_H
#define LOCALPDFDOCBUILDER_H

#include "PDFDocBuilder.h"

//------------------------------------------------------------------------
// LocalPDFDocBuilder
//
// The LocalPDFDocBuilder implements a PDFDocBuilder for local files.
//------------------------------------------------------------------------

class LocalPDFDocBuilder : public PDFDocBuilder
{

public:
    std::unique_ptr<PDFDoc> buildPDFDoc(const GooString &uri, const std::optional<GooString> &ownerPassword = {}, const std::optional<GooString> &userPassword = {}, void *guiDataA = nullptr) override;
    bool supports(const GooString &uri) override;
};

#endif /* LOCALPDFDOCBUILDER_H */
