# Contributing to Every PDF

First off, thank you for considering contributing to Every PDF! Your help is essential for keeping it great.

This document provides a set of guidelines for contributing to the project. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

All participants are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## 🤝 How Can I Contribute?

-   [🐛 Reporting Bugs](#-reporting-bugs)
-   [🚀 Suggesting Enhancements](#-suggesting-enhancements)
-   [💻 Your First Code Contribution](#-your-first-code-contribution)
-   [🔃 Pull Request Process](#-pull-request-process)

---

## 🐛 Reporting Bugs

Bugs are tracked as [GitHub issues](https://github.com/DDULDDUCK/every-pdf/issues). Before creating a bug report, please check the existing issues to see if the problem has already been reported.

When you are creating a bug report, please include as many details as possible. Fill out the required template, which will help us resolve issues faster.

-   **A clear and descriptive title** to identify the issue.
-   **Steps to reproduce** the behavior.
-   **Expected behavior**: What you expected to happen.
-   **Actual behavior**: What actually happened.
-   **Screenshots or videos** are extremely helpful for visual bugs.
-   **System information**:
    -   Operating System (e.g., Windows 11, macOS Sonoma)
    -   Every PDF Version (e.g., v2.0.1)

---

## 🚀 Suggesting Enhancements

We'd love to hear your ideas for improving Every PDF! If you have an idea for a new feature or an enhancement, please create an issue.

-   Use a **clear and descriptive title**.
-   Provide a **step-by-step description of the suggested enhancement** in as much detail as possible.
-   **Explain why this enhancement would be useful** to most Every PDF users.
-   If you've considered **alternatives**, let us know what they are.

---

## 💻 Your First Code Contribution

Unsure where to begin contributing? You can start by looking through these `good first issue` and `help wanted` issues:

-   **Good first issue** - issues which should only require a few lines of code, and a test or two.
-   **Help wanted** - issues which should be a bit more involved than `good first issue` issues.

### Development Setup

1.  **Fork & Clone the Repository**
    -   Fork this repository to your own GitHub account.
    -   Clone your forked repository to your local machine:
      ```bash
      git clone https://github.com/YOUR_USERNAME/every-pdf.git
      cd every-pdf
      ```

2.  **Add the `upstream` Remote**
    -   Add the original repository as a remote called `upstream` to keep your fork in sync.
      ```bash
      git remote add upstream https://github.com/DDULDDUCK/every-pdf.git
      ```

3.  **Install Dependencies & Set Up**
    -   Install all necessary packages and set up the environment.
      ```bash
      # Install Node.js dependencies
      npm install

      # Set up the Python backend environment
      npm run setup-backend
      ```

4.  **Run the App in Development Mode**
    -   This will start both the frontend and backend servers.
      ```bash
      npm run dev
      ```

---

## 🔃 Pull Request Process

1.  **Create a New Branch**
    -   Before making any changes, create a new branch from `main`.
      ```bash
      # For a bug fix
      git checkout -b fix/brief-description-of-fix

      # For a new feature
      git checkout -b feat/brief-description-of-feature
      ```

2.  **Make Your Changes**
    -   Now, you can make your changes to the code.

3.  **Commit Your Changes**
    -   We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. This helps in generating automated changelogs.
        -   `feat`: A new feature.
        -   `fix`: A bug fix.
        -   `docs`: Documentation only changes.
        -   `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc).
        -   `refactor`: A code change that neither fixes a bug nor adds a feature.
        -   `test`: Adding missing tests or correcting existing tests.

      **Example:** `fix: Prevent crash when opening corrupted PDF file`

4.  **Push to Your Fork**
    -   Push your changes to your forked repository.
      ```bash
      git push origin fix/your-branch-name
      ```

5.  **Open a Pull Request**
    -   Go to your repository on GitHub and click the "Compare & pull request" button.
    -   Fill out the PR template.
        -   Link the issue that your PR is resolving (e.g., `Closes #123`).
        -   Provide a detailed description of the changes.

Once your PR is submitted, a project maintainer will review your code and provide feedback. Once all feedback is addressed, your contribution will be merged. Thank you for your hard work!
