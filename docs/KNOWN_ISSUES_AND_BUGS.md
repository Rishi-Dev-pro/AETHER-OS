# AETHER OS — Known Issues, Runtime Bugs & Failure Modes

> **Audience**: Core Developers, QA Engineers, AI Agents  
> **Status**: Verified Bug Registry  

---

## 1. Summary of Identified Issues

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          KNOWN BUG INVENTORY                             │
├────┬──────────────────────────────────┬──────────┬───────────────────────┤
│ ID │ Issue Description                │ Severity │ Component / File      │
├────┼──────────────────────────────────┼──────────┼───────────────────────┤
│ 01 │ Live Execution Audit Test Failure│ Medium   │ live-execution-audit  │
│ 02 │ Browser Speech API Incompatibility│ High    │ useVoice.ts           │
│ 03 │ Hardware Camera Contention Lock  │ High     │ vision/camera.py      │
│ 04 │ Base64 Memory Allocation GC Lag  │ Medium   │ pythonBridge.js / CV  │
│ 05 │ Unhandled MongoDB Down Scenario  │ Medium   │ server/src/config/db  │
│ 06 │ Windows PowerShell Execution Lock│ Low      │ npm/npx scripts       │
│ 07 │ Stale Frame Queue Accumulation   │ Medium   │ socket.ts / bridge    │
└────┴──────────────────────────────────┴──────────┴───────────────────────┘
```

---

## 2. Deep Dive: Known Bugs & Error Scenarios

### 2.1 Issue #1: Live Execution Audit Test Failure (`live-execution-audit.test.ts`)
- **Symptoms**: Running `npx vitest run` yields 1 failed test out of 759 tests:
  ```
  FAIL src/runtime/__tests__/live-execution-audit.test.ts > AETHER OS — Live Credential & Provider Execution Audit
  AssertionError: expected 404 to be 200 // Object.is equality
  - Expected: 200
  + Received: 404
  ```
- **Root Cause**:
  - In `client/src/runtime/__tests__/live-execution-audit.test.ts` (lines 96–105), the test checks if an active `VITE_GROQ_API_KEY` exists in `client/.env`.
  - Because `client/.env` contains a hardcoded Groq key (`gsk_Uatw...`), the test attempts a real live HTTP `fetch()` to `https://api.groq.com/openai/v1/chat/completions`.
  - If that key is revoked, expired, or the network is blocked, Groq returns HTTP 401 or 404, causing the test assertion to fail.
- **Remediation**:
  - Mock the fetch interceptor in unit test suites or provide a mock environment flag (`VITE_MOCK_PROVIDERS=true`) so tests run deterministically offline without depending on external cloud API validity.

---

### 2.2 Issue #2: Web Speech API Browser Incompatibility
- **Symptoms**: Clicking the voice activation button on Mozilla Firefox, Safari, or mobile browsers fails with `SpeechRecognition is not defined` or fails to transcribe audio.
- **Root Cause**:
  - `client/src/hooks/useVoice.ts` uses `window.SpeechRecognition || window.webkitSpeechRecognition`.
  - `webkitSpeechRecognition` is a non-standard proprietary Google Webkit API only natively supported in Chromium-based browsers (Chrome, Edge, Brave, Opera).
- **Remediation**:
  - Integrate a WebAssembly or client-side Whisper model (e.g. `@xenova/transformers` with `whisper-tiny` or `whisper.cpp` via Web Workers) to provide 100% universal offline speech-to-text across all browsers.

---

### 2.3 Issue #3: Exclusive Hardware Webcam Contention (Windows DirectShow / MSMF)
- **Symptoms**: Python vision process starts, but outputs `Camera capture failed or offline` and streams black frames, or crashes with `cv2.error`.
- **Root Cause**:
  - On Windows, OpenCV uses DirectShow (`cv2.CAP_DSHOW`) or Media Foundation (`cv2.CAP_MSMF`).
  - Webcams are hardware single-tenant resources. If another application (Zoom, Microsoft Teams, Discord, OBS, or another browser tab) is holding the webcam handle, `cv2.VideoCapture(0).isOpened()` returns `False`.
- **Remediation**:
  - Implement a hardware probing loop in `vision/camera.py` that cycles through camera indices $0 \dots 4$ and reports descriptive error payloads over JSON (`{"status": "error", "error_code": "CAMERA_DEVICE_BUSY"}`) instead of silently failing.

---

### 2.4 Issue #4: High Memory & V8 Garbage Collection Pressure from Base64 Image Strings
- **Symptoms**: After running the camera stream for 10–20 minutes, the browser tab memory climbs to 1.5GB–2.5GB and begins experiencing periodic 100–300ms frame drops (GC pauses).
- **Root Cause**:
  - The Python engine encodes 30 frames/sec into 150KB Base64 data URLs.
  - Node.js receives 4.5MB/sec of raw text, creates new string allocations, parses JSON, and emits it over WebSocket.
  - The browser allocates new string objects, creates an `Image()` object, and decodes the image. This generates ~270MB/minute of ephemeral string garbage for the V8 engine to collect.
- **Remediation**:
  - Replace Base64 string transport with binary streaming (WebRTC MediaStream, raw H.264 video chunks, or binary TypedArray ArrayBuffers) directly to an HTML5 `<video>` or canvas `createImageBitmap()` pipeline.

---

### 2.5 Issue #5: Unhandled MongoDB Connection Failures
- **Symptoms**: Starting `server.js` without a local MongoDB instance running logs `MongoDB connection error`, but Express continues running. Subsequent calls to `/api/v1/auth/login` or `/api/v1/auth/register` hang until timing out after 30 seconds.
- **Root Cause**:
  - In `server/src/server.js`, `connectDB()` is called asynchronously without blocking startup or setting a health readiness flag.
  - Mongoose buffers operations by default when disconnected (`bufferCommands: true`), causing incoming HTTP requests to hang instead of failing fast.
- **Remediation**:
  - Disable Mongoose command buffering in development or return a fast 503 Service Unavailable when `mongoose.connection.readyState !== 1`.

---

### 2.6 Issue #6: Windows PowerShell Execution Policy Restrictions
- **Symptoms**: Running `npx vitest run` in PowerShell produces:
  ```
  npx : File C:\Program Files\nodejs\npx.ps1 cannot be loaded because running scripts is disabled on this system.
  ```
- **Root Cause**: Windows PowerShell default security policy blocks un-signed `.ps1` wrapper scripts.
- **Remediation**: Use `cmd /c npx vitest run` or `npx.cmd vitest run`.
