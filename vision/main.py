import sys
import signal
import threading
from config import CAMERA_INDEX, FRAME_WIDTH, FRAME_HEIGHT, TARGET_FPS
from vision_manager import VisionManager
from utils import log_info, log_success

manager = None

def signal_handler(sig, frame):
    global manager
    log_info("\nShutdown signal received (Ctrl+C). Exiting...")
    if manager:
        manager.stop()
    sys.exit(0)

def stdin_listener():
    """
    Background thread that reads stdin for a STOP command from Node.js.
    When 'STOP' is received, signals the VisionManager to break its loop.
    This approach is Windows-compatible (SIGTERM is unreliable on Windows).
    """
    global manager
    try:
        for line in sys.stdin:
            command = line.strip().upper()
            if command == "STOP":
                log_info("✓ Camera Stop Requested (via stdin)")
                if manager:
                    manager.stop()
                break
    except (EOFError, OSError):
        # stdin was closed (parent process exited), stop gracefully
        log_info("stdin closed. Stopping...")
        if manager:
            manager.stop()

def main():
    global manager
    # Register Ctrl+C handler
    signal.signal(signal.SIGINT, signal_handler)

    log_success("✓ Python Started")

    # Start stdin listener thread (daemon so it dies with the process)
    listener_thread = threading.Thread(target=stdin_listener, daemon=True)
    listener_thread.start()

    # Initialize and run VisionManager
    manager = VisionManager(
        camera_index=CAMERA_INDEX,
        width=FRAME_WIDTH,
        height=FRAME_HEIGHT,
        target_fps=TARGET_FPS
    )
    
    try:
        manager.run()
    except KeyboardInterrupt:
        log_info("\nLoop interrupted. Cleaning up...")
        manager.stop()

    log_success("✓ Python Exited")

if __name__ == "__main__":
    main()
