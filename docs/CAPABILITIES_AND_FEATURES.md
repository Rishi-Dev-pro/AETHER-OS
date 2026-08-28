# AETHER OS — Capabilities & Feature Matrix

> **Scope**: Multimodal AI, Spatial Computing, Vision Intelligence, and Real-Time HUD Systems  

---

## 1. Feature & Capability Overview

AETHER OS functions as an advanced spatial human-machine interface. Below is an exhaustive breakdown of everything the system is capable of executing.

```
                                  ┌───────────────────────────────┐
                                  │       AETHER OS PLATFORM       │
                                  └───────────────┬───────────────┘
          ┌───────────────────────┼───────────────────────────────┼──────────────────────┐
          ▼                       ▼                               ▼                      ▼
┌──────────────────┐    ┌──────────────────┐            ┌──────────────────┐   ┌──────────────────┐
│ Spatial Pointer  │    │  Facial / Mesh   │            │   Multimodal     │   │   Multimodal     │
│ & Gesture Engine │    │   Intelligence   │            │ Perception Core  │   │  Conversational  │
├──────────────────┤    ├──────────────────┤            ├──────────────────┤   ├──────────────────┤
│• 1€ Filtered Ptr │    │• 468 Face Mesh   │            │• Unified Snapshot│   │• Groq Llama 3.3  │
│• Pinch Click/Lock│    │• Blink / EAR     │            │• Context Builder │   │• NVIDIA NIM LLM  │
│• Hover Magnetism │    │• MAR / Speaking  │            │• Rule Classifier │   │• OpenAI GPT-4o   │
│• 5 Gesture Poses │    │• Smile % & Gaze  │            │• Web Audio VAD   │   │• Ollama Local    │
│• Zero-Lag rAF    │    │• 7-Class Emotion │            │• Speech Recog/TTS│   │• Token Profiler  │
└──────────────────┘    └──────────────────┘            └──────────────────┘   └──────────────────┘
```

---

## 2. Spatial Pointer & Gesture Interaction Capabilities

### 2.1 Virtual Pointer & 1€ Adaptive Filtering
- **Fingertip Tracking**: Maps the index fingertip (Landmark 8) of the primary detected hand to normalized viewport coordinates $(x, y) \in [0.0, 1.0]$.
- **1€ (One Euro) Adaptive Low-Pass Filter**:
  - Dynamically computes velocity derivatives between frames.
  - When the hand moves slowly (e.g., aiming at a button), the filter lowers the cutoff frequency ($\text{mincutoff} = 0.8\text{ Hz}$) to eliminate high-frequency tremor and micro-jitter.
  - When the hand moves rapidly across the screen, the filter raises the cutoff frequency ($\beta = 0.03$) to eliminate tracking lag.
- **Sigmoid Acceleration**: Applies non-linear acceleration curves to virtual cursor movements, enabling micro-precision targeting in central zones while maintaining rapid reach across the viewport.

### 2.2 Pinch State Machine & Coordinate Lock
- **3D Palm-Normalized Pinch Calculation**:
  - Computes Euclidean distance between Thumb Tip (4) and Index Tip (8) in 3D space ($x, y, z$).
  - Normalizes distance against the user's hand size using reference distance from Wrist (0) to Index MCP (5).
- **Hysteresis State Machine**:
  - `inactive` $\rightarrow$ `start` (when $\text{dist} < 0.15$)
  - `start` $\rightarrow$ `hold` (sustained pinch)
  - `hold` $\rightarrow$ `release` (when $\text{dist} > 0.18$)
  - `release` $\rightarrow$ `inactive`
- **Pinch Coordinate Lock**:
  - When a user pinches, the natural motion often jerks the fingertip 5–15 pixels.
  - The `interactionEngine` catches the `start` transition and **freezes the pointer coordinates** at the exact click location for the duration of the pinch, preventing click-drift or missed targets.

### 2.3 Hover Magnetism & Hit Testing
- **DOM Element Registry**: UI elements (dock buttons, cards, controls) register their client bounding rects via `useInteractive(elementId)`.
- **Magnetic Snapping**: When the virtual cursor comes within an attraction radius (e.g., 24px) of a registered interactive element, the visual cursor smoothly interpolates toward the center of the element.
- **Synthesized Click Events**: Releasing a pinch while hovering over an interactive element dispatches click handlers and triggers system actions.

### 2.4 Hand Gesture Classifier
Computes 3D segment-sum ratios on non-thumb fingers to classify 5 distinct hand poses:
1. **Open Palm**: All 5 fingers extended.
2. **Fist**: All fingers folded into palm.
3. **Point**: Index finger extended; middle, ring, pinky folded.
4. **Thumbs Up**: Thumb extended upward; remaining fingers folded.
5. **Peace (V-Sign)**: Index and Middle fingers extended; ring and pinky folded.

---

## 3. Face Mesh & Facial Intelligence Capabilities

### 3.1 468-Point 3D Face Mesh
- Detects 468 dense 3D facial landmarks on up to 4 simultaneous faces.
- Renders real-time tessellation mesh, eye contours, irises, and lips onto the HTML5 camera canvas.

### 3.2 Quantitative Facial Metrics
- **Eye Aspect Ratio (EAR) & Blink Detection**:
  - Measures vertical eye opening relative to horizontal eye width for both left and right eyes.
  - Automatically identifies whether left and right eyes are open or closed, and flags active blinks.
- **Mouth Aspect Ratio (MAR) & Speech Detection**:
  - Measures lip separation distance relative to mouth width.
  - Accurately determines if the user's mouth is open or closed, detecting speech movement visually.
- **Smile Ratio**:
  - Computes lip corner elevation relative to resting lip center.
  - Outputs a continuous smile intensity score from $0\%$ to $100\%$.
- **Head Pose Estimation (Yaw, Pitch, Roll)**:
  - Solves 3D projection from nose tip, chin, eye corners, and temple landmarks.
  - Outputs head orientation angles in degrees: Yaw (left/right turn), Pitch (up/down tilt), and Roll (side tilt).
- **Gaze Direction**:
  - Evaluates iris landmark offset relative to eye corners to determine gaze vector: `CENTER`, `LEFT`, `RIGHT`, `UP`, `DOWN`.

### 3.3 7-Class Emotion Heuristic Intelligence
- Real-time geometric classifier calculating confidence scores across 7 emotions:
  1. **Neutral**: Baseline relaxed geometry.
  2. **Happy**: High smile ratio + cheek raise.
  3. **Surprised**: High MAR (open mouth) + elevated eyebrows.
  4. **Sad**: Lip corners downturned + inner eyebrow furrow.
  5. **Angry**: Lowered, furrowed eyebrows + compressed lips.
  6. **Fear**: Wide eyes (high EAR) + raised furrowed eyebrows.
  7. **Disgust**: Raised upper lip + nose bridge wrinkle.
- **EMA Smoothing**: Applies Exponential Moving Average ($\alpha = 0.25$) over rolling historical frames to produce stable, flicker-free emotional telemetry.

---

## 4. Multimodal Perception & Context Fusion

### 4.1 Perception Snapshot Architecture (`snapshotManager.ts`)
Creates an immutable, consolidated state snapshot of the entire human-computer interface at any moment in time:
- **Vision State**: Face count, primary face metrics, dominant emotion, gaze vector, hand count, gestures, pinch states.
- **Voice State**: Audio volume level, Voice Activity Detection (VAD) status, speech transcript, confidence.
- **Interaction State**: Hovered element ID, pressed element ID, virtual pointer position, last interaction type.
- **Environment State**: System latency, dropped frames, rendering FPS.

### 4.2 Structured Context & Semantic Prompt Synthesis (`contextBuilder.ts`)
Converts raw snapshot numbers into human-readable semantic context for LLMs:
- *"User is smiling (85% happiness), looking directly at the center of the display with their right hand in a Point gesture targeting the Voice Toggle button."*

### 4.3 Deterministic Intent Classification (`intentClassifier.ts`)
- Evaluates spoken transcripts and multimodal gestures against compiled regex patterns and keyword dictionaries.
- Instantaneously identifies system commands (`TOGGLE_CAMERA`, `MUTE_VOICE`, `SYSTEM_DIAGNOSTICS`, `SWITCH_FILTER`, `AI_ASSISTANT_QUERY`) without waiting for slow cloud LLM roundtrips.

---

## 5. Conversational AI & Provider Runtime

### 5.1 Multi-Provider Inference
- Seamlessly connects to **Groq**, **NVIDIA NIM**, **OpenAI**, and local **Ollama** backends.
- Real-time Server-Sent Events (SSE) stream parsing delivers streaming assistant responses word-by-word into the HUD.

### 5.2 Real-Time Voice Pipeline
- **Web Audio API VAD**: Detects when the user begins and ceases speaking based on RMS thresholding.
- **Speech Recognition**: Continuously streams speech-to-text in the background.
- **Automatic TTS (Text-to-Speech)**: Automatically speaks LLM assistant responses out loud using browser `SpeechSynthesis`.

### 5.3 Hardware Diagnostics & Live Profiler
- The `VisionWidget` displays a live telemetry table measuring microsecond runtimes across all 13 pipeline stages:
  `tCameraCapture`, `tFaceDetect`, `tFaceMesh`, `tFaceIntel`, `tEmotionIntel`, `tHandTrack`, `tGestureRec`, `tPinchDetect`, `tPointerEng`, `tPointerStab`, `tJpegEncode`, `tBase64Encode`, `tPythonWrite`, `tNodeReceive`, `tJsonParse`, `tNodeEmit`, `tBrowserReceive`, `tImageDecode`, and `tEndToEnd`.
