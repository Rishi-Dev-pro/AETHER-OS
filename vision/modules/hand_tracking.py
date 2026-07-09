# AETHER OS - hand_tracking module
import os
import time
import urllib.request
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from utils import log_success, log_info, log_error

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "hand_landmarker.task")

class HandTrackingModule:
    """
    MediaPipe Hand Landmarker module.
    - Initialized once, reused across all frames.
    - Receives the current frame and returns parsed hand tracking results.
    - Returns handedness, confidence, bounding box, center point, and 21 landmarks.
    """

    def __init__(self):
        self.landmarker = None
        self.is_initialized = False
        self._detection_times = []

    def initialize(self):
        """Initialize the HandLandmarker once. Returns True on success."""
        if self.is_initialized:
            return True

        # Ensure model is downloaded
        if not os.path.exists(MODEL_PATH):
            log_info(f"Downloading MediaPipe Hand Landmarker model to {MODEL_PATH}...")
            try:
                urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
                log_success("Hand Landmarker model downloaded successfully.")
            except Exception as e:
                log_error(f"Failed to download Hand Landmarker model: {str(e)}")
                return False

        try:
            base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
            options = vision.HandLandmarkerOptions(
                base_options=base_options,
                num_hands=2,
                min_hand_detection_confidence=0.5,
                min_hand_presence_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            self.landmarker = vision.HandLandmarker.create_from_options(options)
            self.is_initialized = True
            log_success("✓ Hand Tracking Initialized")
            return True
        except Exception as e:
            log_error(f"Error initializing Hand Tracking: {str(e)}")
            self.is_initialized = False
            return False

    def process(self, cv_image):
        """
        Processes an OpenCV BGR image and returns detected hands with their landmarks and metadata.

        Args:
            cv_image: OpenCV BGR image (numpy array).

        Returns:
            A list of hand dictionaries, containing:
            {id, handedness, confidence, bbox: {x, y, width, height}, center: {x, y}, landmarks: []}
        """
        if not self.is_initialized or self.landmarker is None:
            return []

        try:
            start_time = time.time()

            # Convert BGR to RGB for MediaPipe
            rgb_image = cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)

            # Detect hands in the frame
            result = self.landmarker.detect(mp_image)

            detection_time = time.time() - start_time
            self._track_detection_time(detection_time)

            parsed_hands = []
            h, w = cv_image.shape[:2]

            # Process all detected hands
            for idx, hand_landmarks in enumerate(result.hand_landmarks):
                # Retrieve handedness (MediaPipe returns a list of categories for each hand)
                if idx < len(result.handedness) and len(result.handedness[idx]) > 0:
                    handedness_category = result.handedness[idx][0]
                    handedness = handedness_category.category_name.lower()
                    confidence = round(float(handedness_category.score), 2)
                else:
                    handedness = "unknown"
                    confidence = 0.0

                # Form normalized landmarks array
                landmarks_data = [
                    {"x": round(lm.x, 6), "y": round(lm.y, 6), "z": round(lm.z, 6)}
                    for lm in hand_landmarks
                ]

                # Compute absolute pixel bounding box
                x_coords = [lm.x for lm in hand_landmarks]
                y_coords = [lm.y for lm in hand_landmarks]
                
                min_x = min(x_coords)
                max_x = max(x_coords)
                min_y = min(y_coords)
                max_y = max(y_coords)

                # Clamp and scale coordinates to pixel values
                x_px = max(0, int(min_x * w))
                y_px = max(0, int(min_y * h))
                w_px = max(0, int((max_x - min_x) * w))
                h_px = max(0, int((max_y - min_y) * h))

                center_x = int(x_px + w_px / 2)
                center_y = int(y_px + h_px / 2)

                parsed_hands.append({
                    "id": idx + 1,
                    "handedness": handedness,
                    "confidence": confidence,
                    "bbox": {
                        "x": x_px,
                        "y": y_px,
                        "width": w_px,
                        "height": h_px
                    },
                    "center": {
                        "x": center_x,
                        "y": center_y
                    },
                    "landmarks": landmarks_data
                })

            if len(parsed_hands) > 0:
                print(f"✓ Hands Detected: {len(parsed_hands)}", flush=True)

            return parsed_hands

        except Exception as e:
            # Graceful degradation - never crash the loop
            return []

    def _track_detection_time(self, duration):
        """Track detection times and log average periodically."""
        self._detection_times.append(duration)
        if len(self._detection_times) >= 30:
            avg_ms = (sum(self._detection_times) / len(self._detection_times)) * 1000
            print(f"✓ Average Hand Tracking Time: {avg_ms:.1f}ms", flush=True)
            self._detection_times.clear()

    def close(self):
        """Release HandLandmarker resources."""
        if self.landmarker is not None:
            self.landmarker.close()
            self.landmarker = None
        self.is_initialized = False
        self._detection_times.clear()
        log_info("Hand Tracking resources released.")
