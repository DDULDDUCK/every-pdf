//========================================================================
//
// gfile.h
//
// Miscellaneous file and directory name manipulation.
//
// Copyright 1996-2003 Glyph & Cog, LLC
//
//========================================================================

//========================================================================
//
// Modified under the Poppler project - http://poppler.freedesktop.org
//
// All changes made under the Poppler project to this file are licensed
// under GPL version 2 or later
//
// Copyright (C) 2006 Kristian Høgsberg <krh@redhat.com>
// Copyright (C) 2009, 2011, 2012, 2017, 2018, 2021, 2022 Albert Astals Cid <aacid@kde.org>
// Copyright (C) 2009 Kovid Goyal <kovid@kovidgoyal.net>
// Copyright (C) 2013 Adam Reichold <adamreichold@myopera.com>
// Copyright (C) 2013, 2017 Adrian Johnson <ajohnson@redneon.com>
// Copyright (C) 2014 Bogdan Cristea <cristeab@gmail.com>
// Copyright (C) 2014 Peter Breitenlohner <peb@mppmu.mpg.de>
// Copyright (C) 2017 Christoph Cullmann <cullmann@kde.org>
// Copyright (C) 2017 Thomas Freitag <Thomas.Freitag@alfa.de>
// Copyright (C) 2018 Mojca Miklavec <mojca@macports.org>
// Copyright (C) 2019 Christian Persch <chpe@src.gnome.org>
//
// To see a description of the changes please see the Changelog file that
// came with your tarball or type make ChangeLog if you are building from git
//
//========================================================================

#ifndef GDIR_H
#define GDIR_H

#include "poppler-config.h"

#include <memory>

class GooString;

#if defined(_WIN32)
#    include <windows.h>
#else
#    include <dirent.h>
#endif

//------------------------------------------------------------------------
// GDir and GDirEntry
//------------------------------------------------------------------------

class GDirEntry
{
public:
    GDirEntry(const char *dirPath, const char *nameA, bool doStat);
    ~GDirEntry();

    GDirEntry(const GDirEntry &other) = delete;
    GDirEntry &operator=(const GDirEntry &other) = delete;

    const GooString *getName() const { return name; }
    const GooString *getFullPath() const { return fullPath; }
    bool isDir() const { return dir; }

private:
    GooString *name; // dir/file name
    GooString *fullPath;
    bool dir; // is it a directory?
};

class GDir
{
public:
    explicit GDir(const char *name, bool doStatA = true);
    ~GDir();

    GDir(const GDir &other) = delete;
    GDir &operator=(const GDir &other) = delete;

    std::unique_ptr<GDirEntry> getNextEntry();
    void rewind();

private:
    GooString *path; // directory path
    bool doStat; // call stat() for each entry?
#if defined(_WIN32)
    WIN32_FIND_DATAA ffd;
    HANDLE hnd;
#else
    DIR *dir; // the DIR structure from opendir()
#endif
};

#endif
