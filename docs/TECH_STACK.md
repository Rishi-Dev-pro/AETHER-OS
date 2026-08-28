# AETHER OS — Complete Technology Stack Specification

> **Target Audience**: Core Engineers, System Architects, AI Agents  
> **Status**: Verified Production Specification  

---

## 1. Complete Tier Matrix

```
┌────────────────────────────────────────────────────────────────────────┐
│                       TIER 1: FRONTEND (BROWSER CLIENT)                 │
│  React 19.2.7 • TypeScript 6.0 • Vite 8.1 • Tailwind CSS 4.3 • Zustand 5│
│  Framer Motion 12.4 • Lucide React • Socket.IO Client 4.8 • Vitest 4.1 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ WebSockets (Socket.IO) / HTTP
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       TIER 2: BACKEND (NODE.JS RUNTIME)                │
│  Node.js (ESM) • Express 4.19 • Socket.IO 4.7 • Mongoose 8.3 • MongoDB │
│  Helmet 7.1 • Compression • Cookie-Parser • Multer • Bcrypt 5.1 • JWT  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ IPC: Stdin / Stdout (Line-Delimited JSON)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   TIER 3: VISION ENGINE (PYTHON SUBPROCESS)            │
│  Python 3.10+ • OpenCV 4.8+ • Google MediaPipe 0.10.x • NumPy          │
│  BlazeFace TFLite • FaceLandmarker 468 • HandLandmarker 21 • 1€ Filter │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Multi-Provider Inference
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      AI PROVIDERS & COGNITIVE SERVICES                 │
│  Groq (Llama 3.3 70B) • NVIDIA NIM (Llama 3.1 70B/405B) • OpenAI GPT-4o│
│  Ollama (Local LLMs) • Web Speech API • Web Audio VAD • SpeechSynthesis│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tier 1: Frontend Client Stack

| Category | Technology | Version | Purpose | Location in Codebase |
| :--- | :--- | :--- | :--- | :--- |
| **Framework** | [React](https://react.dev) | `^19.2.7` | Reactive component tree, concurrent rendering | `client/src/main.tsx`, `client/src/app/App.tsx` |
| **Language** | [TypeScript](https://www.typescriptlang.org) | `~6.0.2` | Strict end-to-end type safety, domain contracts | `client/tsconfig.json`, `client/src/types/` |
| **Bundler & Dev Server** | [Vite](https://vitejs.dev) | `^8.1.1` | Ultra-fast HMR, ESM bundling, dynamic chunking | `client/vite.config.ts` |
| **Styling Engine** | [Tailwind CSS](https://tailwindcss.com) | `^4.3.2` | Utility-first CSS, modern responsive design | `client/src/index.css`, `client/src/styles/` |
| **Tailwind Vite Plugin** | `@tailwindcss/vite` | `^4.3.2` | First-party Vite integration for Tailwind v4 | `client/vite.config.ts` |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) | `^5.0.14` | High-frequency decoupled store state without re-render cascades | `client/src/store/*` |
| **Motion & Animation** | [Framer Motion](https://www.framer.com/motion/) | `^12.42.2` | HUD panel transitions, micro-animations, glassmorphism | `client/src/components/layout/*` |
| **Icons** | [Lucide React](https://lucide.dev) | `^1.23.0` | Minimalist HUD iconography | `client/src/components/*` |
| **Realtime Transport** | [Socket.IO Client](https://socket.io) | `^4.8.3` | Bi-directional frame & telemetry communication | `client/src/services/socket.ts` |
| **HTTP Client** | [Axios](https://axios-http.com) | `^1.18.1` | REST API communication | `client/src/services/api.ts` |
| **Unit Testing** | [Vitest](https://vitest.dev) | `^4.1.10` | 750+ unit/integration test suites | `client/src/**/__tests__/*` |

---

## 3. Tier 2: Backend Server Stack

| Package | Version | Purpose | Configuration / Code Location |
| :--- | :--- | :--- | :--- |
| **Runtime** | `Node.js 20+ (ESM)` | Native ES Modules, Async I/O, Perf Hooks | `server/package.json` (`"type": "module"`) |
| **HTTP Framework** | `express ^4.19.2` | REST API routing, middleware chaining | `server/src/app.js` |
| **WebSockets** | `socket.io ^4.7.5` | High-throughput telemetry streaming | `server/src/socket/socketManager.js` |
| **Database ODM** | `mongoose ^8.3.1` | MongoDB schemas for users, sessions, settings | `server/src/config/db.js`, `server/src/models/*` |
| **Security Headers** | `helmet ^7.1.0` | CSP, XSS protection, MIME type sniff prevention | `server/src/app.js` |
| **Compression** | `compression ^1.7.4` | Gzip stream compression for HTTP payloads | `server/src/app.js` |
| **Authentication** | `jsonwebtoken ^9.0.2` | JWT generation & verification for auth middleware | `server/src/controllers/auth.controller.js` |
| **Password Hashing** | `bcrypt ^5.1.1` | Salted hashing for database passwords | `server/src/models/User.js` |
| **File Multipart** | `multer ^1.4.5-lts.1` | Memory-buffered frame uploads for REST analysis | `server/src/routes/vision.routes.js` |
| **Process Spawner** | `child_process (Native)` | Python vision subprocess management & IPC | `server/src/vision/pythonBridge.js` |

---

## 4. Tier 3: Computer Vision Stack

| Technology / Model | Specification / Version | Role in Pipeline | Source File |
| :--- | :--- | :--- | :--- |
| **Python** | `3.10+ / 3.11+ / 3.12+` | Subprocess runtime environment | `vision/main.py` |
| **OpenCV (`cv2`)** | `opencv-python >= 4.8.0` | Camera capture, BGR-RGB conversion, JPEG encode | `vision/camera.py`, `vision/vision_manager.py` |
| **MediaPipe** | `mediapipe >= 0.10.0` | Google ML vision tasks pipeline | `vision/modules/*` |
| **BlazeFace Model** | `blaze_face_short_range.tflite` (230 KB) | Ultrafast frontal face detection & bounding boxes | `vision/modules/face_detection.py` |
| **Face Landmarker** | `face_landmarker.task` (3.75 MB) | 468 3D dense facial landmarks | `vision/modules/face_mesh.py` |
| **Hand Landmarker** | `hand_landmarker.task` (7.82 MB) | 21 3D landmarks per hand with left/right classification | `vision/modules/hand_tracking.py` |
| **Filter Algorithm** | `1€ (One Euro) Filter` | Velocity-adaptive low-pass pointer stabilization | `vision/modules/pointer_stabilizer.py` |

---

## 5. AI Providers & Model Zoo

| Provider | Endpoint Format | Default Model | Fallback Models | Supported Modalities |
| :--- | :--- | :--- | :--- | :--- |
| **Groq Cloud** | OpenAI-Compatible REST | `llama-3.3-70b-versatile` | `llama-3.1-8b-instant`, `mixtral-8x7b-32768` | Streaming Text, High-Speed Tokens (500+ tok/s) |
| **NVIDIA NIM** | OpenAI-Compatible REST | `meta/llama-3.1-70b-instruct` | `meta/llama-3.1-405b-instruct` | Streaming Text, Enterprise Inference |
| **OpenAI** | Official REST API | `gpt-4o` | `gpt-4o-mini`, `gpt-4-turbo` | Streaming Text, Multimodal Vision, Function Calling |
| **Ollama** | Local Host (`127.0.0.1:11434`) | `llama3.2:latest` | `mistral:latest`, `phi3:latest` | Zero-Cloud Local Private Inference |

---

## 6. Protocols, Formats & Encoding Specifications

- **Vision IPC**: Newline-delimited JSON (`\n`) over standard I/O (`stdin`/`stdout`) with buffered streams (`-u` unbuffered Python execution).
- **Image Transport**: JPEG compressed at 80% quality, base64-encoded with standard data URL prefix (`data:image/jpeg;base64,...`).
- **Telemetry Packets**: JSON payloads containing absolute bounding boxes, normalized coordinates ($0.0 \dots 1.0$), 3D landmark arrays, and epoch microsecond profiler timestamps.
- **WebSocket Protocol**: Socket.IO binary & JSON event protocol supporting room isolation, heartbeat ping-pong, and automatic reconnection.
- **Audio Telemetry**: 10Hz throttled RMS audio level updates + continuous Web Speech API transcripts.
