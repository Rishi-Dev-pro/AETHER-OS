# AETHER OS — Face Mesh Module (Phase 3.7)
# Independent vision module — detects 468 facial landmarks per face.
# Does NOT draw anything. Does NOT know about React.
# Returns structured landmark data only.

import os
import time
import urllib.request
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from utils import log_success, log_info, log_error

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "face_landmarker.task")


class FaceMeshModule:
    """
    MediaPipe Face Landmarker module.

    - Initialized once, reused across all frames.
    - Receives the current frame + detected face list from FaceDetectorModule.
    - Enriches each face dict with a 'landmarks' array of {x, y, z}.
    - Coordinates remain normalized exactly as returned by MediaPipe.
    """

    def __init__(self):
        self.landmarker = None
        self.is_initialized = False
        self._detection_times = []

    def initialize(self):
        """Initialize the FaceLandmarker once. Returns True on success."""
        if self.is_initialized:
            return True

        # Ensure model is downloaded
        if not os.path.exists(MODEL_PATH):
            log_info(f"Downloading MediaPipe Face Landmarker model to {MODEL_PATH}...")
            try:
                urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
                log_success("Face Landmarker model downloaded successfully.")
            except Exception as e:
                log_error(f"Failed to download Face Landmarker model: {str(e)}")
                return False

        try:
            base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                num_faces=4,
                min_face_detection_confidence=0.5,
                min_face_presence_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            self.landmarker = vision.FaceLandmarker.create_from_options(options)
            self.is_initialized = True
            log_success("✓ Face Mesh Initialized")
            return True
        except Exception as e:
            log_error(f"Error initializing Face Mesh: {str(e)}")
            self.is_initialized = False
            return False

    def process(self, cv_image, faces):
        """
        Processes the full frame and enriches each detected face dict with landmarks.

        Args:
            cv_image: OpenCV BGR image (numpy array).
            faces: List of face dicts from FaceDetectorModule, each containing
                   {id, bbox: {x, y, width, height}, center: {x, y}, confidence}.

        Returns:
            The same faces list, with each face dict enriched with a 'landmarks' key.
        """
        if not self.is_initialized or self.landmarker is None:
            # Attach empty landmarks to each face and return
            for face in faces:
                face["landmarks"] = []
            return faces

        if not faces:
            return faces

        try:
            start_time = time.time()

            # Convert BGR to RGB for MediaPipe
            rgb_image = cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)

            # Run face landmarker on the full frame
            result = self.landmarker.detect(mp_image)

            detection_time = time.time() - start_time
            self._track_detection_time(detection_time)

            # Match landmarker results to detected faces by center proximity
            self._match_landmarks_to_faces(faces, result, cv_image.shape)

            face_count = sum(1 for f in faces if len(f.get("landmarks", [])) > 0)
            if face_count > 0:
                print(f"✓ Face Mesh Running", flush=True)
                print(f"✓ Landmarks Generated: {face_count} face(s)", flush=True)
                print(f"✓ Face Count: {face_count}", flush=True)

            return faces

        except Exception as e:
            # Graceful degradation — attach empty landmarks, never crash the loop
            for face in faces:
                if "landmarks" not in face:
                    face["landmarks"] = []
            return faces

    def _match_landmarks_to_faces(self, faces, landmarker_result, frame_shape):
        """
        Match FaceLandmarker results to FaceDetector faces by bounding box center proximity.
        Each face dict gets a 'landmarks' array appended.
        """
        frame_h, frame_w = frame_shape[:2]

        # Pre-compute landmarker face centers from their landmark sets
        landmarker_faces = []
        for face_landmarks in landmarker_result.face_landmarks:
            # Compute center from the nose tip (landmark 1) as a reliable proxy
            # Landmarks are normalized [0, 1]
            if len(face_landmarks) > 1:
                nose = face_landmarks[1]
                center_x = nose.x * frame_w
                center_y = nose.y * frame_h
            else:
                # Fallback: average all landmarks
                avg_x = sum(lm.x for lm in face_landmarks) / len(face_landmarks)
                avg_y = sum(lm.y for lm in face_landmarks) / len(face_landmarks)
                center_x = avg_x * frame_w
                center_y = avg_y * frame_h

            landmarks_data = [
                {"x": round(lm.x, 6), "y": round(lm.y, 6), "z": round(lm.z, 6)}
                for lm in face_landmarks
            ]
            landmarker_faces.append({
                "center_x": center_x,
                "center_y": center_y,
                "landmarks": landmarks_data,
            })

        # Track which landmarker results have been claimed
        claimed = set()

        for face in faces:
            face_cx = face["center"]["x"]
            face_cy = face["center"]["y"]

            best_idx = -1
            best_dist = float("inf")

            for idx, lf in enumerate(landmarker_faces):
                if idx in claimed:
                    continue
                dx = face_cx - lf["center_x"]
                dy = face_cy - lf["center_y"]
                dist = dx * dx + dy * dy  # squared distance (no sqrt needed for comparison)
                if dist < best_dist:
                    best_dist = dist
                    best_idx = idx

            # Accept match if within a reasonable distance (half the frame diagonal squared)
            max_dist_sq = (frame_w * 0.3) ** 2 + (frame_h * 0.3) ** 2
            if best_idx >= 0 and best_dist < max_dist_sq:
                face["landmarks"] = landmarker_faces[best_idx]["landmarks"]
                claimed.add(best_idx)
            else:
                face["landmarks"] = []

    def _track_detection_time(self, duration):
        """Track detection times and log average periodically."""
        self._detection_times.append(duration)
        if len(self._detection_times) >= 30:
            avg_ms = (sum(self._detection_times) / len(self._detection_times)) * 1000
            print(f"✓ Average Detection Time: {avg_ms:.1f}ms", flush=True)
            self._detection_times.clear()

    def close(self):
        """Release FaceLandmarker resources."""
        if self.landmarker is not None:
            self.landmarker.close()
            self.landmarker = None
        self.is_initialized = False
        self._detection_times.clear()
        log_info("Face Mesh resources released.")
