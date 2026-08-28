# AETHER OS — UI/UX Design System & Spatial HUD Specification

> **Subsystem**: Design System, Visual Tokens, Spatial Cursor, Canvas Shaders, and Layout Architecture  
> **Status**: Comprehensive Design Specification  

---

## 1. Design Philosophy & Aesthetic Identity

**AETHER OS** embodies a next-generation **ambient spatial HUD operating system**, heavily inspired by cyberpunk aesthetics, macOS Vision Pro glassmorphism, and Tony Stark's JARVIS/FRIDAY holographic interface.

### Core Visual Principles
1. **Ultra-Dark Depth**: Deep obsidian background (`#030407`) paired with multi-layered radial ambient glows and subtle scanline/noise overlays.
2. **Glassmorphism & Depth**: High-blur backdrops (`backdrop-blur-2xl`), ultra-thin translucent borders (`border-white/[0.06]`), and deep multi-stage drop shadows (`shadow-[0_16px_48px_rgba(0,0,0,0.7)]`).
3. **High-Precision Monospace Micro-Typography**: Crisp, uppercase, wide-tracked text (`tracking-[0.18em]`) with dedicated monospace numerical telemetry readouts.
4. **Holographic Color Accents**: Neon Cyan (`#06b6d4`), Electric Purple (`#a855f7`), Hot Pink/Rose (`#f43f5e`), and Cyber Emerald (`#10b981`).

---

## 2. Color Tokens & Palette

```
┌────────────────────────────────────────────────────────────────────────┐
│                          COLOR PALETTE SYSTEM                          │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ Token Name        │ Hex / HSL         │ Role / Usage                   │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ `bg-void`         │ `#030407`         │ Master viewport canvas base    │
│ `surface-glass`   │ `#07090f` @ 75-85%│ Floating HUD panel surfaces    │
│ `border-subtle`   │ `rgba(255,255,255, 0.06)` │ Panel containment borders  │
│ `border-hover`    │ `rgba(255,255,255, 0.15)` │ Focused/hovered elements   │
│ `accent-cyan`     │ `#06b6d4` (Cyan-500)      │ Vision targets, cursor dot │
│ `accent-purple`   │ `#a855f7` (Purple-500)    │ AI runtime, neural matrix  │
│ `accent-emerald`  │ `#10b981` (Emerald-500)   │ System online, FPS stable  │
│ `accent-pink`     │ `#f43f5e` (Rose-500)      │ Voice active, mic trigger  │
│ `accent-amber`    │ `#f59e0b` (Amber-500)     │ Latency warning, dropped frames │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

---

## 3. Viewport Layout & Spatial Geometry

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             TopBar (HUD Status)                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐         ┌────────────────────────┐      ┌───────────┐  │
│  │ SystemWidget │         │                        │      │VisionWidg.│  │
│  │ (OS Health)  │         │                        │      │(Telemetry)│  │
│  └──────────────┘         │                        │      └───────────┘  │
│                           │     CameraViewport     │                     │
│                           │   (Canvas Overlays &   │      ┌───────────┐  │
│                           │    Active Vision Feed) │      │Conversat. │  │
│  ┌──────────────┐         │                        │      │(AI Chat)  │  │
│  │ StatsWidget  │         │                        │      └───────────┘  │
│  │ (Telemetry)  │         │                        │                     │
│  └──────────────┘         └────────────────────────┘      ┌───────────┐  │
│                                                           │ThoughtWidg│  │
│                                                           └───────────┘  │
├──────────────────────────────────────────────────────────────────────────┤
│                       BottomDock (Floating Command Pill)                 │
└──────────────────────────────────────────────────────────────────────────┘
```

### Layout Offsets
- **TopBar**: Fixed header (`h-[72px] xl:h-[76px]`) containing the system title, latency indicator, and current time.
- **CameraViewport**: Centered responsive viewport offset by `top-[72px] bottom-[92px] left-8 right-8`.
- **Floating HUD Columns**: Positioned symmetrically at `left-[52px]` and `right-[52px]` over the background grid with hover scaling (`hover:scale-[1.01]`).
- **BottomDock**: Centered floating pill dock offset at `bottom-8` with backdrop blur, rounded-full border, and tactile spring animations.

---

## 4. Spatial Cursor & Virtual Pointer Design (`GlobalPointer.tsx`)

The spatial cursor is a browser-wide pointer overlay positioned at `z-[9999]` with zero pointer-events. It provides continuous visual feedback for spatial hand interactions:

```
                  ┌─────────┐
                  │ ┌─────┐ │
             ───  │ │  •  │ │  ───
                  │ └─────┘ │
                  └─────────┘
```

### Cursor Anatomy
1. **Target Center Dot**: 6px solid neon cyan circle (`bg-cyan-500`) marking the exact interactive point.
2. **Glowing Inner Ring**: 28px circular boundary with a subtle radial cyan glow (`boxShadow: 0 0 10px rgba(6,182,212,0.2)`).
3. **Dashed Outer Ring**: 38px rotating dashed border (`border-dashed border-cyan-400/90`).
4. **Crosshair Ticks**: 4 directional ticks extending outwards (top, bottom, left, right).
5. **Dynamic Visual States**:
   - **Idle State**: Translucent cyan, gentle pulsing.
   - **Hover State**: Outer ring expands to 46px, color turns vibrant, ticks illuminate, cursor magnetically snaps to element center.
   - **Pinch Lock State**: Inner ring contracts tightly around the target dot, border turns solid magenta/pink (`#f43f5e`), coordinates freeze to prevent click slippage.

---

## 5. Canvas Neural Overlays & Visual Shaders (`CameraViewport.tsx`)

The video viewport renders multiple hardware-accelerated canvas overlay layers directly on top of the camera stream:

### 5.1 Bounding Box Layer
- High-tech corner brackets (`#67e8f9`) with 10px bracket arms.
- Semi-transparent bounding box outline (`rgba(6, 182, 212, 0.5)`).
- Crosshair at box center with 15% opacity.
- Dark frosted label badge at top-left with a status LED dot and confidence percentage.

### 5.2 468-Point Face Mesh Layer
- **Tessellation Grid**: Delicate cyan lines (`rgba(6, 182, 212, 0.3)`) connecting 468 dense 3D facial landmarks.
- **Lip Contours**: Outlined in electric pink/magenta (`rgba(244, 63, 94, 0.6)`).
- **Iris Tracking**: High-contrast tracking circles on left and right pupils to visualize gaze focus.

### 5.3 21-Point Skeletal Hand Layer
- Connected bone lines (`lineWidth = 2`) between joints.
- Color-coded joint dots: Cyan for fingers, Purple for wrist, Pink for index fingertip.
- Handedness badge (`LEFT` / `RIGHT`) hovering above the palm center.

### 5.4 Sensory Filter Shaders
1. **Standard Mode**: Clean BGR camera feed with standard HUD overlays.
2. **Cyber Mode**: High-contrast desaturated blue-cyan tint with animated scanlines.
3. **Thermal Mode**: Pseudocolor heatmap mapping brightness values to a blue $\rightarrow$ green $\rightarrow$ yellow $\rightarrow$ red $\rightarrow$ white color gradient.
4. **Sonar Mode**: Deep monochrome blue-green feed with an expanding radar wave effect centered on detected targets.
