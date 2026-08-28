# AETHER OS — AI Agent & Developer Onboarding Guide

> **Audience**: Autonomous AI Agents, Core Contributors, Developers  
> **Purpose**: Complete Developer Manual, Workflow Protocols, and System Quickstart  

---

## 1. Project Directory Map

```
d:\projects 2.0\main\AETHER-OS\
├── client/                     # Tier 1: React 19 Frontend Client
│   ├── src/
│   │   ├── app/                # Main application component & service bootstrapping
│   │   ├── components/         # HUD widgets, Canvas viewport, cursor renderer, layout
│   │   │   ├── camera/         # CameraViewport.tsx, GlobalPointer.tsx, useCursorRenderer.ts
│   │   │   ├── layout/         # MainLayout.tsx, TopBar.tsx, BottomDock.tsx
│   │   │   ├── widgets/        # VisionWidget, ConversationWidget, SystemWidget, StatsWidget
│   │   │   ├── ui/             # GlowPanel, ModuleCard, GridBackground
│   │   │   └── decorations/    # AmbientGlow, NoiseOverlay
│   │   ├── interaction/        # Spatial pointer engine, hit testing, registry, useInteractive
│   │   ├── runtime/            # AI Runtime layer, Conversation runtime, Speech runtime
│   │   ├── services/           # Socket service, Snapshot manager, Context builder, Intent classifier
│   │   ├── store/              # Zustand state stores (camera, vision, voice, socket, system, etc.)
│   │   ├── types/              # Comprehensive TypeScript domain interfaces & adapter contracts
│   │   └── hooks/              # Custom React hooks (useSocket, useVoice, etc.)
│   ├── .env                    # Frontend environment variables (API keys)
│   ├── package.json            # Frontend dependencies & build scripts
│   └── vite.config.ts          # Vite build configuration
│
├── server/                     # Tier 2: Node.js Backend Server
│   ├── src/
│   │   ├── config/             # Environment, Database, Socket configurations
│   │   ├── controllers/        # Express request controllers (auth, vision, health)
│   │   ├── middleware/         # Auth, validation, logging, error handling middleware
│   │   ├── models/             # Mongoose schemas (User, Session)
│   │   ├── routes/             # Express API routes (/api/v1/auth, /api/v1/vision, /health)
│   │   ├── services/           # Backend business logic services (auth, socket, vision)
│   │   ├── socket/             # Socket.IO event handlers & room manager
│   │   ├── utils/              # Logger, ApiError, ApiResponse, visionValidator
│   │   └── vision/             # Python child process bridge (pythonBridge.js, detectionManager.js)
│   ├── .env                    # Backend environment configuration
│   ├── package.json            # Server dependencies & nodemon scripts
│   └── server.js               # Main HTTP & Socket.IO server entry point
│
├── vision/                     # Tier 3: Python Computer Vision Engine
│   ├── modules/                # MediaPipe vision modules (Face, Mesh, Hands, Gestures, Pointer)
│   │   ├── face_detection.py   # BlazeFace short range face detector
│   │   ├── face_mesh.py        # 468-point 3D facial landmarker
│   │   ├── face_intelligence.py# EAR, MAR, smile ratio, head pose yaw/pitch/roll
│   │   ├── emotion_detection.py# 7-class heuristic emotion classifier with EMA
│   │   ├── hand_tracking.py    # MediaPipe 21-point hand landmarker
│   │   ├── gesture_recognition.py # Segment-sum ratio 5-gesture classifier
│   │   ├── pinch_detection.py  # 3D palm-normalized pinch state machine
│   │   ├── pointer_engine.py   # Normalized virtual pointer coordinate calculator
│   │   └── pointer_stabilizer.py # 1€ (One Euro) adaptive low-pass filter
│   ├── camera.py               # OpenCV VideoCapture wrapper with auto-reconnect
│   ├── config.py               # Resolution (640x480) & Target FPS (30) constants
│   ├── payload.py              # Vision protocol dataclass & serialization schema
│   ├── utils.py                # Console logger utilities
│   ├── vision_manager.py       # Main synchronous 30fps perception pipeline loop
│   ├── main.py                 # Multi-threaded stdin listener & process entry point
│   ├── blaze_face_short_range.tflite # Downloaded BlazeFace model
│   ├── face_landmarker.task    # Downloaded MediaPipe Face Mesh model
│   ├── hand_landmarker.task    # Downloaded MediaPipe Hand Landmarker model
│   └── requirements.txt        # Python dependencies (opencv-python, mediapipe)
│
└── docs/                       # Complete System Documentation
    ├── ARCHITECTURE_OVERVIEW.md# Tri-tier architecture, IPC, and data flows
    ├── TECH_STACK.md           # Exhaustive package matrix & model specifications
    ├── CURRENT_IMPLEMENTATION_STATUS.md # Current implementation audit
    ├── CAPABILITIES_AND_FEATURES.md     # Feature matrix & spatial interaction manual
    ├── MISSING_FEATURES_AND_GAPS.md     # Inventory of stubbed files & missing features
    ├── DESIGN.md               # Visual design tokens, HUD canvas rendering, cursor math
    ├── KNOWN_ISSUES_AND_BUGS.md# Known bug registry & failure modes
    ├── PRODUCTION_SECURITY_AND_SCALABILITY_RISKS.md # Security audit & production roadmap
    └── AGENT_DEVELOPER_GUIDE.md# This onboarding & developer guide
```

---

## 2. Local Environment Setup & Installation

### 2.1 Prerequisites
- **Node.js**: Version `20.x` or `22.x` LTS
- **Python**: Version `3.10`, `3.11`, or `3.12` with `pip`
- **MongoDB**: Community Server running on `localhost:27017` (Optional for vision/AI testing; mandatory for auth routes)
- **Webcam & Microphone**: Functional hardware device

### 2.2 Installing Dependencies

1. **Frontend Client**:
   ```bash
   cd client
   npm install
   ```

2. **Backend Server**:
   ```bash
   cd server
   npm install
   ```

3. **Python Vision Engine**:
   ```bash
   cd vision
   pip install -r requirements.txt
   ```

---

## 3. Running the System in Development

### 3.1 Step 1: Start Backend Server
In a dedicated terminal:
```bash
cd server
npm run dev
```
*Expected output*: Express server listening on `http://localhost:5000` with Socket.IO initialized.

### 3.2 Step 2: Start Frontend Client
In a second terminal:
```bash
cd client
npm run dev
```
*Expected output*: Vite server active at `http://localhost:5173`. Open in a Chromium-based browser (Chrome, Edge, Brave).

### 3.3 Step 3: Activate Sensors
1. In the browser HUD, click the **Camera Toggle** button on the bottom dock.
2. The browser emits `camera:start` over Socket.IO $\rightarrow$ Node spawns Python $\rightarrow$ live video feed and neural HUD overlays appear.
3. Click the **Voice Toggle** button to enable microphone listening and automatic Text-to-Speech (TTS).

---

## 4. Running the Automated Test Suite

To run the full suite of 750+ unit and integration tests across provider adapters, conversation core, memory systems, and circuit breakers:

```bash
cd client
cmd /c npx vitest run
```

*(Note: On Windows, prefix with `cmd /c` to avoid PowerShell `.ps1` execution policy restrictions).*

---

## 5. Architectural Rules & Contribution Guidelines for AI Agents

1. **Do Not Touch Working Vision Modules Without Profiling**:
   - The Python vision pipeline runs at a strict 30 FPS budget (33ms per frame).
   - Any new ML model or mathematical computation added to `vision_manager.py` must execute in $< 5\text{ms}$ or be offloaded to an asynchronous worker thread.
2. **Preserve Decoupled React State**:
   - High-frequency coordinate streams (pointer updates at 30–60Hz) must **never** trigger full React component tree re-renders.
   - Use `requestAnimationFrame` loops and direct DOM `ref` style mutations (as demonstrated in `useCursorRenderer.ts`).
3. **Never Hardcode Secrets in Frontend Code**:
   - Store all cloud LLM API keys in backend environment configurations or in the in-memory `CredentialVault`.
4. **Always Clean Up OS Subprocesses**:
   - Any child process spawned in `pythonBridge.js` must have registered shutdown hooks on `SIGINT`, `SIGTERM`, `exit`, and WebSocket disconnection events.
