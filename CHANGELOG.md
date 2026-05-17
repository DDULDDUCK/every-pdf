# Changelog

All notable changes to Every-PDF are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For human-friendly bilingual (English/Korean) release notes with screenshots
and acknowledgements, see the [GitHub Releases page](https://github.com/DDULDDUCK/every-pdf/releases).

## [2.1.0] - 2026-05-17

### Changed
- **License compliance**: Replaced Poppler (GPL-2/3) with [pypdfium2](https://github.com/pypdfium2-team/pypdfium2) (Apache-2.0 OR BSD-3-Clause) in the PDF→image conversion path. The app no longer ships GPL-licensed binaries and is fully MIT-compatible.
- Switched `pdf2image.convert_from_path()` to `pypdfium2.PdfDocument.render()`.
- PyInstaller build now uses `--collect-all pypdfium2 / pypdfium2_raw` so the native `libpdfium` library and `version.json` data files are correctly bundled.
- CI release workflow now uses `npm install` instead of `npm ci` to tolerate minor lockfile drift between local and runner npm versions.
- README files now declare Python 3.10+ as the minimum requirement (was 3.9; the codebase already used 3.10+ syntax).
- License dialog updated to reference pypdfium2 instead of pdf2image; LICENSE copyright year bumped to 2025-2026.

### Removed
- Approximately 98 MB of bundled Poppler binaries from `backend/src/poppler/`.
- `pdf2image` dependency from `backend/requirements.txt`.
- Stale `backend/pdf_processor.spec` (PyInstaller regenerates this on build).
- Tracking of build artifacts (`__pycache__/`, `*.pyc`, `backend/build/`, `.DS_Store`); they are now in `.gitignore`.

### Notes
- Pre-v2.1.0 releases bundled Poppler (GPL) inside an MIT-licensed app, which created a license conflict. v2.1.0 resolves this. See issue [#15](https://github.com/DDULDDUCK/every-pdf/issues/15).
- Thanks to [@xinyu-391](https://github.com/xinyu-391) for reporting the license conflict.

## [2.0.8] - 2026-03-17

### Added
- German (`de`) translation across the app: welcome, home, actions, theme, tools, security, watermark, and editor flows.
- `Deutsch` option in the welcome-flow language selector.

### Fixed
- Registered the `de` locale in the app's i18n resources so the German translation files are loaded at runtime.
- Regenerated lockfile to restore the dependency state required by `npm ci` in GitHub Actions.

### Notes
- Issued as a fresh patch (instead of reusing the failed `v2.0.7` tag) to keep release history clean.
- Thanks to [@MkMunich](https://github.com/MkMunich) for the German translation ([#14](https://github.com/DDULDDUCK/every-pdf/pull/14)).

## [2.0.6] - 2026-03-04

### Improved
- Faster drag response in the PDF Editor by optimizing overlay update flow and editor state synchronization.
- Smoother watermark preview updates; reduced unnecessary remount/repaint during option changes.

### Fixed
- Standardized delete labels to use translation keys consistently.
- Updated delete color tokens for proper contrast in Light theme.
- Removed the Buy Me a Coffee CTA from the app UI.

### Changed
- Updated compatible dependencies and aligned worker-copy handling.
- Synced lockfile state and updated release workflow Node runtime to prevent `npm ci` failures.

## [2.0.5] - 2026-03-04

### Fixed
- Independent scrolling restored between the properties panel and the PDF viewer.
- New text boxes now remember the last font size used.
- Korean characters in saved PDFs no longer render as square boxes; backend font resolution corrected so NotoSansKR is applied during PDF overlay rendering.

### Changed
- Updated macOS release runner configuration and workflow permissions for current GitHub Actions runner support.
- Strengthened editor panel height/overflow constraints to prevent parent-level scroll leakage.

## [2.0.4] - 2025-08-12

### Fixed
- Restored PDF processing logic (split, merge, rotate, convert, security) that had been disconnected from the UI during refactoring.
- Restored and improved single/multiple file upload handling so each tool receives the correct files.

### Changed
- Introduced a specific `PdfAction` type for better type safety.
- Re-integrated backend-calling handler functions into UI components.

## [2.0.3] - 2025-08-12

### Fixed
- Tool panels for Split, Merge, Rotate, and Convert no longer fail to appear after selection (rendering logic was accidentally commented out during the prior refactoring).

### Changed
- Minor cleanup of component rendering logic for clarity and maintainability.

## [2.0.2] - 2025-08-11

### Added
- Live preview for text watermarks; users can see the effect update in real time as they change parameters. (Closes #7)

### Security
- macOS application is now officially notarized by Apple.

### Notes
- Required switching to a new official distribution certificate; users on older versions must manually download and install this release because the auto-updater rejects the new signature. All later updates flow automatically.
- Thanks to [@meichiny](https://github.com/meichiny) for suggesting the live watermark preview.

## [2.0.1] - 2025-08-10

### Fixed
- Windows: Application no longer fails to launch when the user's profile path contains a space (e.g. `C:\Users\Test User`). The previous behaviour produced a `Failed to start backend service!` error. (Closes #4)

### Notes
- Thanks to [@Luo-YaFei](https://github.com/Luo-YaFei) for the detailed reproducible bug report.

## [2.0.0] - 2025-08-06

### Added
- **PDF Editor**: a full editing experience integrated into the app.
  - Add Text: place text boxes anywhere on a PDF page (forms, annotations).
  - Add Signature: draw a signature directly on screen or upload an image.
  - Add Image: insert logos, stamps, or other images.
  - Add Checkbox: place checkmarks (✓) on the document.

### Changed
- Application renamed from "PDF Studio" to **"Every PDF"**.
- UI now loads instantly while the Python backend is still initializing, with a backend status indicator (`Initializing…`, `Ready`).

### Fixed
- General stability improvements and minor bug fixes.

## [1.1.1] - 2025-07-18

### Fixed
- Resolved `HttpError: 401 (Bad credentials)` from `electron-updater` when checking for updates on a public repository. Caused by missing `publish` provider information (`owner`, `repo`); fixed by adding the GitHub `publish` configuration to `electron-builder`.

## [1.1.0] - 2025-07-16

Initial public release as **PDF Studio**.

### Added
- **Split**: split large PDFs by page range or specific page numbers.
- **Merge**: combine multiple PDFs with drag-and-drop.
- **Watermark**: add text/image watermarks with adjustable opacity, position, and size.
- **Rotate & Reorder**: fix scanned pages or rearrange pages in any order.

### Stack
- Frontend built with Nextron (Next.js + Electron).
- PDF processing powered by a Python backend.
