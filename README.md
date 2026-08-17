# 🐍 React & Pyodide WASM Runner

[![CI / Tests](https://img.shields.io/badge/tests-26%20passed-success)](https://github.com/DevDAN09/react-pyodide)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Deployment](https://img.shields.io/badge/deployed%20on-Cloudflare-f38020)](https://main-react-pyodide.devyun09.workers.dev)

A client-side Python runtime built with **React 19**, **Pyodide (CPython 3.12)**, **WebAssembly (WASM)**, and **Web Workers**.

> **Live Demo:** [https://main-react-pyodide.devyun09.workers.dev](https://main-react-pyodide.devyun09.workers.dev)

---

## ✨ Key Features

1. **🚀 100% Client-Side In-Browser Compute (Zero Server Cost)**
   - No backend servers, API keys, or Python installations needed.
   - Code executes entirely inside the browser's 32-bit WebAssembly linear memory at near-native speed.

2. **🛡️ Sandboxed Web Worker & 10s Watchdog Protection**
   - Execution is isolated in a background Web Worker so the UI never blocks or freezes (60fps).
   - If an infinite loop or heavy task exceeds **10 seconds**, the watchdog automatically terminates the worker and spawns a fresh runtime.

3. **🎬 Interactive Claude-Artifact Style Pipeline Simulation**
   - Live visual stage depicting the 4-step execution journey:
     - `01 📝 Order Ingestion (React UI)`
     - `02 🛡️ Sandboxed Kitchen (Web Worker)`
     - `03 ⚡ Micro Engine (Pyodide WASM)`
     - `04 📊 Delivery Service (I/O Bridge)`
   - Step-by-step interactive animation mode and real-time live execution sync.

4. **🌐 Bilingual i18n Support (한국어 / English)**
   - Instant language toggle with persistent `localStorage` preference and semantic document language synchronization.

5. **💻 Developer-Grade Code Editor UX**
   - **Line Numbers Gutter**: Synchronized scrolling and unselectable line numbers.
   - **Smart Keyboard Ergonomics**: `Tab`/`Shift+Tab` 4-space indent/unindent, automatic 4-space colon (`:`) auto-indentation, auto-closing brackets and quotes (`()`, `[]`, `{}`, `""`, `''`).
   - **Execution Shortcut**: `⌘ + Enter` (Mac) or `Ctrl + Enter` (Windows/Linux) to run code immediately.
   - **Preset Library**: Hello World, Fibonacci Series, Prime Number Comprehension, Exception Handling, and Timeout Recovery test.
   - **Quick Tools**: One-click Copy (with feedback), Reset, and Clear.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8
- **Runtime**: Pyodide 0.27 (CPython WebAssembly)
- **Concurrency**: HTML5 Web Workers + PostMessage typed protocol
- **Testing**: Vitest, React Testing Library, Playwright E2E
- **Hosting**: Cloudflare Workers / Pages Static Assets

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20 or later
- npm

### Installation & Run Locally

```bash
# Clone the repository
git clone https://github.com/DevDAN09/react-pyodide.git
cd react-pyodide

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Verification & Testing

```bash
# Run unit & integration tests
npm run test:run

# Run TypeScript type check
npm run typecheck

# Build production bundle (includes Pyodide asset staging)
npm run build

# Run Playwright Chromium E2E smoke tests
npm run test:e2e
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
