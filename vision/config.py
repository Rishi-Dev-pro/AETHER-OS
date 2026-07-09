# Vision Engine Configuration Constants

CAMERA_INDEX = 0
FRAME_WIDTH = 640
FRAME_HEIGHT = 480
TARGET_FPS = 30

# One Euro Filter Calibration parameters (HCI Calibration v2)
STABILIZER_CALIBRATION = {
    "min_cutoff": 0.5,        # Hz (Lower = filters more tremor at rest)
    "beta": 0.04,             # Velocity factor (Higher = decreases latency at speed)
    "d_cutoff": 1.5           # Hz (Derivative cutoff frequency)
}
