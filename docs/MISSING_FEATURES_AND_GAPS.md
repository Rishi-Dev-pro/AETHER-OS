# AETHER OS — Missing Features, Gaps & Incomplete Modules

> **Target**: Roadmap Planning, Technical Debt Analysis, Agent Backlog  
> **Status**: Comprehensive Codebase Audit  

---

## 1. Executive Summary of Unfinished Areas

While AETHER OS possesses a mature vision pipeline, high-performance canvas visualizer, and complete AI runtime test suite, several components remain as **empty files (0-byte stubs)**, **mock implementations**, or **unconnected features**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      UNFINISHED / GAP INVENTORY                          │
├────────────────────────────────┬────────────────────────────────────────┤
│ Frontend Stubbed Files         │ 20 empty (0-byte) files in client/src/ │
│ Vision Engine Stubs            │ 4 placeholder modules in vision/modules│
│ Backend Service Stubs          │ REST frame processor, AI, Automation   │
│ Architectural Mismatch         │ Provider Runtime in Client vs Backend  │
│ Multimodal LLM Vision Feed     │ Images not forwarded to Vision LLMs    │
│ Desktop OS Automation Hooks    │ OS mouse/keyboard actions are mock data│
└────────────────────────────────┴────────────────────────────────────────┘
```

---

## 2. Complete Inventory of Frontend 0-Byte Stub Files

The following 20 files in `client/src/` are currently **0 bytes** (empty placeholders created during initial scaffolding):

### 2.1 Pages & Routing
1. `client/src/pages/Home.tsx` (0 bytes): Intended for a standalone landing/dashboard page.
2. `client/src/pages/NotFound.tsx` (0 bytes): Intended for 404 routing.
3. `client/src/pages/Settings.tsx` (0 bytes): Intended for user preference configuration (model selection, API keys, camera device ID, audio devices).
4. `client/src/routes/AppRouter.tsx` (0 bytes): Multi-page router configuration (the app currently renders `MainLayout.tsx` directly in `App.tsx`).

### 2.2 Core Utilities
5. `client/src/utils/cn.ts` (0 bytes): Utility for merging Tailwind classes (using `clsx` and `tailwind-merge`).
6. `client/src/utils/constants.ts` (0 bytes): Shared frontend system constants.
7. `client/src/utils/format.ts` (0 bytes): Number and date formatters.
8. `client/src/utils/helpers.ts` (0 bytes): Generic helper functions.

### 2.3 Services & Hooks
9. `client/src/services/api.ts` (0 bytes): REST API Axios client (backend auth endpoints are currently unconnected to the UI).
10. `client/src/services/camera.ts` (0 bytes): WebRTC browser camera fallback service.
11. `client/src/services/speech.ts` (0 bytes): Replaced by `client/src/runtime/frontend/speech-runtime.ts` and `useVoice.ts`, leaving this stub unused.
12. `client/src/hooks/useCamera.ts` (0 bytes): Standalone camera hook (state is currently read directly from `useCameraStore`).
13. `client/src/hooks/useFPS.ts` (0 bytes): Browser render FPS counter hook.
14. `client/src/hooks/useSpeech.ts` (0 bytes): Redundant stub superseded by `useVoice.ts`.

### 2.4 HUD & Camera UI Components
15. `client/src/components/camera/DetectionLabel.tsx` (0 bytes): Replaced by inline HTML5 Canvas label rendering in `CameraViewport.tsx`.
16. `client/src/components/camera/TargetBox.tsx` (0 bytes): Replaced by inline HTML5 Canvas bounding box rendering in `CameraViewport.tsx`.
17. `client/src/components/hud/BoundingBox.tsx` (0 bytes): Unused legacy HUD component.
18. `client/src/components/hud/CameraView.tsx` (0 bytes): Unused legacy HUD component.
19. `client/src/components/hud/FPSCounter.tsx` (0 bytes): Unused legacy HUD component.
20. `client/src/components/hud/GridOverlay.tsx` (0 bytes): Unused legacy HUD component.
21. `client/src/components/hud/VisionOverlay.tsx` (0 bytes): Unused legacy HUD component.

---

## 3. Vision Subsystem Gaps & Stubs (`vision/modules/`)

The Python vision engine contains 4 stubbed or empty module files:

1. **`vision/modules/gesture_detection.py` (44 bytes)**:
   - Contains only a header comment. It was superseded by `vision/modules/gesture_recognition.py`.
   - *Action required*: Delete or alias to `gesture_recognition.py`.
2. **`vision/modules/object_detection.py` (43 bytes)**:
   - Contains only a header comment.
   - *Missing implementation*: Integration with MediaPipe Object Detector or YOLOv8-nano to detect spatial objects (phones, cups, laptops, books).
3. **`vision/modules/ocr.py` (30 bytes)**:
   - Contains only a header comment.
   - *Missing implementation*: Integration with Tesseract OCR or EasyOCR to extract text from physical documents or screens held up to the camera.
4. **`vision/modules/pose_detection.py` (41 bytes)**:
   - Contains only a header comment.
   - *Missing implementation*: Integration with MediaPipe Pose Landmarker (33 body landmarks) for full upper-body posture, shoulder shrugs, and torso tracking.

---

## 4. Backend Server Gaps & Mock Implementations (`server/src/`)

1. **REST Vision Frame Processing (`server/src/services/vision.service.js`)**:
   - `processFrame(frameData)` returns a hardcoded mock object: `{ success: true, detections: [], timestamp: Date.now() }`.
   - Does not pipe uploaded image buffers to the Python vision engine for static image analysis.
2. **Backend AI Manager (`server/src/ai/aiManager.js`)**:
   - `generateCompletion()` returns a static mock string: `"Aether OS AI Core: Online and responding. This is a stubbed response."`.
   - The real LLM execution was implemented inside the frontend client AI runtime rather than on the server.
3. **Desktop OS Automation Engine (`server/src/automation/`)**:
   - `commandManager.js` and `desktopActions.js` return static simulated objects (`{ success: true, action: "click", coordinates: ... }`).
   - Does not have real native OS driver bindings (e.g. RobotJS, nut.js, or PyAutoGUI) to execute real mouse clicks, keystrokes, or window focus changes on Windows/macOS.

---

## 5. Architectural Inconsistencies & Structural Gaps

### 5.1 Provider Runtime Layer Placement (Frontend vs Backend)
- **Original Architecture Specification (`PHASE_9.9_EDD_v1.1.md`)**:
  - Specified `@aether/provider-runtime` as an isolated Node.js hardware and software driver abstraction layer running server-side with zero secret leakage.
- **Current Codebase Implementation**:
  - The entire Provider Runtime (Phase 9.9 - 9.11) was built inside `client/src/types/` and `client/src/runtime/`.
  - As a consequence, API keys (such as `VITE_GROQ_API_KEY`) reside in the browser client environment rather than staying securely inside the Node.js backend.

### 5.2 Multimodal Visual Context Injection into LLMs
- `snapshotManager.ts` and `contextBuilder.ts` capture vision metrics (emotions, faces, gestures, looking direction) and convert them into text prompts.
- However, the actual **raw camera frame image (JPEG / Base64)** is not forwarded as a multimodal image block to Vision-capable models (e.g., `gpt-4o` or `llama-3.2-11b-vision`).

### 5.3 Speech Recognition Portability
- Speech recognition relies on the browser's native `webkitSpeechRecognition` API.
- This limits voice control to Chromium-based browsers (Chrome, Edge, Brave, Opera) and causes failures or silent fallbacks in Firefox or Safari. A server-side or WebAssembly Whisper model (e.g. Whisper.cpp / Transformers.js) is required for true cross-browser support.
