# AETHER OS Standalone Python Vision Engine

This is a standalone Python Vision Engine using OpenCV, implementing the unified **Vision Data Protocol** for frame telemetry, face coordinates, hand landmarks, pose locations, OCR extraction, and classifications.

## Architecture

*   `config.py`: Local configuration settings (camera index, frame dimensions, target loop rate).
*   `utils.py`: High-performance logging outputs and date utility functions.
*   `payload.py`: Standard dictionary serializer output matching the expected Node/Socket schema.
*   `camera.py`: Manages raw device hardware index capture feeds safely.
*   `vision_manager.py`: Core processing loop, monitoring and computing frame FPS pacing.
*   `main.py`: Main engine entrypoint registering interruption signals.

## Running Standalone

1. Ensure Python 3.8+ is installed on the device.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the engine:
   ```bash
   python main.py
   ```
