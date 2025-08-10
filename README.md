# Every PDF

<p align="right">
  <a href="./README.md"><img alt="Language-English" src="https://img.shields.io/badge/Language-English-blue?style=for-the-badge"></a>
  <a href="./README.ko.md"><img alt="Language-Korean" src="https://img.shields.io/badge/언어-한국어-blue?style=for-the-badge"></a>
</p>

<p align="center">
  <!-- 프로젝트 로고를 여기에 추가할 수 있습니다. -->
  <!-- <img src="path/to/your/logo.png" alt="Every PDF Logo" width="150"> -->
  <br>
  <h1>Every PDF</h1>
  <strong>A powerful and intuitive all-in-one desktop PDF editing tool.</strong>
</p>

<p align="center">
  <!-- 소셜 및 커뮤니티 배지 -->
  <a href="https://github.com/DDULDDUCK/every-pdf/stargazers"><img alt="GitHub Stars" src="https://img.shields.io/github/stars/DDULDDUCK/every-pdf?style=for-the-badge&logo=github&color=gold"></a>
  <a href="https://github.com/DDULDDUCK/every-pdf/network/members"><img alt="GitHub Forks" src="https://img.shields.io/github/forks/DDULDDUCK/every-pdf?style=for-the-badge&logo=github&color=blueviolet"></a>
  <a href="https://github.com/DDULDDUCK/every-pdf/graphs/contributors"><img alt="All Contributors" src="https://img.shields.io/github/all-contributors/DDULDDUCK/every-pdf?style=for-the-badge&color=orange"></a>
  <br>
  <!-- 상태 및 릴리즈 배지 -->
  <a href="https://github.com/DDULDDUCK/every-pdf/releases"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/DDULDDUCK/every-pdf?style=for-the-badge&color=brightgreen"></a>
  <a href="https://github.com/DDULDDUCK/every-pdf/releases"><img alt="GitHub Downloads" src="https://img.shields.io/github/downloads/DDULDDUCK/every-pdf/total?style=for-the-badge&logo=github&color=success"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/github/license/DDULDDUCK/every-pdf?style=for-the-badge&color=informational"></a>
  <br>
  <!-- 개발 활동 배지 -->
  <!--<a href="https://github.com/DDULDDUCK/every-pdf/actions/workflows/release.yml"><img alt="Build Status" src="https://img.shields.io/github/actions/workflow/status/DDULDDUCK/every-pdf/release.yml?branch=main&style=for-the-badge&logo=githubactions"></a>-->
  <a href="https://github.com/DDULDDUCK/every-pdf/issues"><img alt="GitHub Issues" src="https://img.shields.io/github/issues/DDULDDUCK/every-pdf?style=for-the-badge&logo=github&color=red"></a>
  <a href="https://github.com/DDULDDUCK/every-pdf/pulls"><img alt="GitHub Pull Requests" src="https://img.shields.io/github/issues-pr/DDULDDUCK/every-pdf?style=for-the-badge&logo=github&color=yellow"></a>
</p>

---

## ✨ Key Features

Every PDF is a powerful desktop application packed with all the features you need, from everyday document tasks to professional-level editing.

*   **✍️ PDF Editor (New!)**: Add text, signatures, images, and checkboxes to complete your documents.
*   **🔄 Convert PDF**: Converting PDFs to different formats and converting different formats to PDFs .
*   **📄 Split Pages**: Easily split large PDF files by a specific page range or individual page numbers.
*   **➕ Merge Files**: Effortlessly combine multiple PDF documents into a single file with a simple drag-and-drop.
*   **💧 Watermark**: Protect your documents by adding custom text or image watermarks.
*   **🔄 Manage Pages**: Rotate or reorder pages to take full control of your document's flow.
*   **🔐 Encrypt/Decrypt**: Secure your PDF documents by adding or removing password protection.
---

## 📥 Download

Get the latest version of Every PDF for your operating system.

| Operating System | File Format | Download Link |
| :---: | :---: | :---: |
| 💻 **Windows** | `.exe` | <a href="https://github.com/DDULDDUCK/every-pdf/releases/latest"><img src="https://img.shields.io/badge/Latest_Release-Download-brightgreen?style=flat-square" /></a> |
| 🍏 **macOS** | `.dmg` | <a href="https://github.com/DDULDDUCK/every-pdf/releases/latest"><img src="https://img.shields.io/badge/Latest_Release-Download-brightgreen?style=flat-square" /></a> |
| 🐧 **Linux** | `.AppImage` | <a href="https://github.com/DDULDDUCK/every-pdf/releases/latest"><img src="https://img.shields.io/badge/Latest_Release-Download-brightgreen?style=flat-square" /></a> |

---

## 📺 Demos in Action

<details open>
<summary><strong>New Editing Features Demo (v2.0.0)</strong></summary>

![Edit Demo](https://github.com/user-attachments/assets/e3ec427a-5a43-4d23-840b-9fbc73e1a8cb)
</details>

<details open>
<summary><strong>Split Feature Demo</strong></summary>

![Split Demo](https://github.com/user-attachments/assets/bcf83b87-b04a-436b-9e7f-f585f4c78faa)
</details>

---

## 👨‍💻 For Developers

Interested in contributing? Follow this guide to set up the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (v3.9 or higher)
- [Git](https://git-scm.com/)

### Installation & Run

```bash
# 1. Clone the project
git clone https://github.com/DDULDDUCK/every-pdf.git
cd every-pdf

# 2. Install Node.js dependencies
npm install

# 3. Set up the Python backend environment (automatic)
# This script creates a virtual environment and installs dependencies.
npm run setup-backend

# 4. Run in development mode (starts both frontend and backend)
npm run dev
```

### Project Structure
```
every-pdf/
├── app/          # Final Electron app resources (built by Nextron)
├── backend/      # Python backend source and virtual environment (venv)
├── main/         # Electron main process source (TypeScript)
├── public/       # Static assets (images, etc.)
├── renderer/     # Next.js frontend source (React, TypeScript)
├── resources/    # Resources used during build (e.g., app icons)
├── scripts/      # Build/development automation scripts
└── ...
```

---

## 🛠️ Tech Stack

-   **Framework**: Nextron (Next.js + Electron)
-   **Frontend**: React, TypeScript, Tailwind CSS
-   **Backend**: Python, FastAPI
-   **Build/Deployment**: Electron Builder

---

## 🤝 Contributing

Contributions are always welcome! Whether it's bug reports, feature suggestions, or code contributions, we appreciate your help. Please check out our [Contributing Guidelines](CONTRIBUTING.md) for more details.

---

## ✨ Contributors

Thanks to these wonderful people for making this project better! ([emoji key](https://allcontributors.org/docs/en/emoji-key))

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/DDULDDUCK"><img src="https://avatars.githubusercontent.com/u/126528992?v=4?s=100" width="100px;" alt="Jaeseok Song"/><br /><sub><b>Jaeseok Song</b></sub></a><br /><a href="https://github.com/DDULDDUK/every-pdf/commits?author=DDULDDUCK" title="Code">💻</a> <a href="#maintenance-DDULDDUCK" title="Maintenance">🚧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Luo-YaFei"><img src="https://avatars.githubusercontent.com/u/37431486?v=4?s=100" width="100px;" alt="Luo"/><br /><sub><b>Luo</b></sub></a><br /><a href="https://github.com/DDULDDUK/every-pdf/issues?q=author%3ALuo-YaFei" title="Bug reports">🐛</a></td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td align="center" size="13px" colspan="7">
        <img src="https://raw.githubusercontent.com/all-contributors/all-contributors-cli/1b8533af435da9854653492b1327a23a4dbd0a10/assets/logo-small.svg">
          <a href="https://all-contributors.js.org/docs/en/bot/usage">Add your contributions</a>
        </img>
      </td>
    </tr>
  </tfoot>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
