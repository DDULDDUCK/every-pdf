//========================================================================
//
// SecurityHandler.h
//
// Copyright 2004 Glyph & Cog, LLC
//
//========================================================================

//========================================================================
//
// Modified under the Poppler project - http://poppler.freedesktop.org
//
// All changes made under the Poppler project to this file are licensed
// under GPL version 2 or later
//
// Copyright (C) 2012, 2018, 2020-2022 Albert Astals Cid <aacid@kde.org>
//
// To see a description of the changes please see the Changelog file that
// came with your tarball or type make ChangeLog if you are building from git
//
//========================================================================

#ifndef SECURITYHANDLER_H
#define SECURITYHANDLER_H

#include "poppler-config.h"

#include "Object.h"

#include <optional>

class GooString;
class PDFDoc;

//------------------------------------------------------------------------
// SecurityHandler
//------------------------------------------------------------------------

class SecurityHandler
{
public:
    static SecurityHandler *make(PDFDoc *docA, Object *encryptDictA);

    explicit SecurityHandler(PDFDoc *docA);
    virtual ~SecurityHandler();

    SecurityHandler(const SecurityHandler &) = delete;
    SecurityHandler &operator=(const SecurityHandler &) = delete;

    // Returns true if the file is actually unencrypted.
    virtual bool isUnencrypted() const { return false; }

    // Check the document's encryption.  If the document is encrypted,
    // this will first try <ownerPassword> and <userPassword> (in
    // "batch" mode), and if those fail, it will attempt to request a
    // password from the user.  This is the high-level function that
    // calls the lower level functions for the specific security handler
    // (requesting a password three times, etc.).  Returns true if the
    // document can be opened (if it's unencrypted, or if a correct
    // password is obtained); false otherwise (encrypted and no correct
    // password).
    bool checkEncryption(const std::optional<GooString> &ownerPassword, const std::optional<GooString> &userPassword);

    // Create authorization data for the specified owner and user
    // passwords.  If the security handler doesn't support "batch" mode,
    // this function should return NULL.
    virtual void *makeAuthData(const std::optional<GooString> &ownerPassword, const std::optional<GooString> &userPassword) = 0;

    // Free the authorization data returned by makeAuthData or
    // getAuthData.
    virtual void freeAuthData(void *authData) = 0;

    // Attempt to authorize the document, using the supplied
    // authorization data (which may be NULL).  Returns true if
    // successful (i.e., if at least the right to open the document was
    // granted).
    virtual bool authorize(void *authData) = 0;

    // Return the various authorization parameters.  These are only
    // valid after authorize has returned true.
    virtual int getPermissionFlags() const = 0;
    virtual bool getOwnerPasswordOk() const = 0;
    virtual const unsigned char *getFileKey() const = 0;
    virtual int getFileKeyLength() const = 0;
    virtual int getEncVersion() const = 0;
    virtual int getEncRevision() const = 0;
    virtual CryptAlgorithm getEncAlgorithm() const = 0;

protected:
    PDFDoc *doc;
};

//------------------------------------------------------------------------
// StandardSecurityHandler
//------------------------------------------------------------------------

class StandardSecurityHandler : public SecurityHandler
{
public:
    StandardSecurityHandler(PDFDoc *docA, Object *encryptDictA);
    ~StandardSecurityHandler() override;

    bool isUnencrypted() const override;
    void *makeAuthData(const std::optional<GooString> &ownerPassword, const std::optional<GooString> &userPassword) override;
    void freeAuthData(void *authData) override;
    bool authorize(void *authData) override;
    int getPermissionFlags() const override { return permFlags; }
    bool getOwnerPasswordOk() const override { return ownerPasswordOk; }
    const unsigned char *getFileKey() const override { return fileKey; }
    int getFileKeyLength() const override { return ok ? fileKeyLength : 0; }
    int getEncVersion() const override { return encVersion; }
    int getEncRevision() const override { return encRevision; }
    CryptAlgorithm getEncAlgorithm() const override { return encAlgorithm; }

private:
    int permFlags;
    bool ownerPasswordOk;
    unsigned char fileKey[32];
    int fileKeyLength;
    int encVersion;
    int encRevision;
    bool encryptMetadata;
    CryptAlgorithm encAlgorithm;

    GooString *ownerKey, *userKey;
    GooString *ownerEnc, *userEnc;
    GooString *fileID;
    bool ok;
};

#endif
