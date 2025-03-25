Poppler, a PDF rendering library
================================

This is Poppler, a library for rendering PDF files, and examining or
modifying their structure.  Poppler originally came from the XPDF
sources; please see the file [README-XPDF](README-XPDF) for the
original xpdf-3.03 README.

Note that **Poppler is licensed under the GPL**, not the LGPL, so
programs which call Poppler must be licensed under the GPL as well.
See the section [History and GPL
licensing](#history-and-gpl-licensing) for more information.

# Source code

Poppler's source code is maintained as a Git repository in
[`gitlab.freedesktop.org`][gitlab].  You can fork that repository and
submit merge requests.

[gitlab]: https://gitlab.freedesktop.org/poppler/poppler

# Reporting bugs

Please report bugs at
https://gitlab.freedesktop.org/poppler/poppler/issues

If you want to report a rendering or parsing bug, or a missing PDF
feature, please provide an example PDF file as an attachment to your
bug report.  It really helps if you can minimize the PDF to only the
items required to reproduce the bug or the missing feature, but it is
not absolutely required.  **Please be careful** of publishing PDF
files that you don't want other people to see, or files whose
copyright does not allow redistribution; the bug tracker is a public
resource and attachments are visible to everyone.

# Security

Poppler is highly sensitive to security bugs, since it deals mainly
with untrusted files downloaded from the Internet.

If you find a crash in Poppler, or if a tool like
Valgrind/asan/ubsan/msan detect a problem, please report a bug at
https://gitlab.freedesktop.org/poppler/poppler/issues

# Stable and unstable APIs

Poppler provides stable, public APIs for its various front-ends, and
an unstable API for Poppler's own internal use.  The following
directories in Poppler's source tree have the **stable APIs**:

* [cpp](cpp) - Stable C++ API for examining the structure of a PDF
  file and rendering it to a raster image.

* [glib](glib) - Stable C API with Glib/GObject idioms, to examine the
  structure of a PDF file, and to render its pages to [Cairo]
  contexts.

* [qt5](qt5) - Stable C++ API with [Qt5] idioms, to examine the
  structure of a PDF file, and to render its pages to `QPainter` or
  `QImage` objects.

**WARNING:** Poppler also provides direct access to its internals,
since various tools historically use the C++ header files that came
from XPDF and which became the basis for Poppler.

* [poppler](poppler) - **UNSTABLE, INTERNAL C++ API** to operate
  directly on Poppler's internal representation of PDF files.  *If you
  use this API, you are on your own*.  This API may change at any
  time, even among minor versions of Poppler!

[Cairo]: https://www.cairographics.org/
[Qt5]: https://www.qt.io/

# History and GPL licensing

Poppler is a fork of the xpdf PDF viewer developed by Derek Noonburg
of Glyph and Cog, LLC.  The purpose of forking xpdf is twofold.
First, we want to provide PDF rendering functionality as a shared
library, to centralize the maintenance effort.  Today a number of
applications incorporate the xpdf code base, and whenever a security
issue is discovered, all these applications exchange patches and put
out new releases.  In turn, all distributions must package and release
new version of these xpdf based viewers.  It's safe to say that
there's a lot of duplicated effort with the current situation.  Even if
poppler in the short term introduces yet another xpdf derived code
base to the world, we hope that over time these applications will
adopt poppler.  After all, we only need one application to use poppler
to break even.

Second, we would like to move libpoppler forward in a number of areas
that don't fit within the goals of xpdf.  By design, xpdf depends on
very few libraries and runs a wide range of X based platforms.  This
is a strong feature and reasonable design goal.  However, with poppler
we would like to replace parts of xpdf that are now available as
standard components of modern Unix desktop environments.  One such
example is fontconfig, which solves the problem of matching and
locating fonts on the system, in a standardized and well understood
way.  Another example is cairo, which provides high quality 2D
rendering.

Please note that xpdf, and thus poppler, is licensed under the GPL,
not the LGPL.  Consequently, any application using poppler must also
be licensed under the GPL.  If you want to incorporate Xpdf based PDF
rendering in a closed source product, please contact Glyph & Cog
(www.glyphandcog.com) for commercial licensing options. Note that
this only allows you to use xpdf in a closed source product,
not poppler itself.
