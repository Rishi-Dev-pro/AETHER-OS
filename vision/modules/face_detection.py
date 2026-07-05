import os
import urllib.request
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from utils import log_success, log_info, log_error

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "blaze_face_short_range.tflite")

class FaceDetectorModule:
    def __init__(self):
        self.detector = None
        self.is_initialized = False

    def initialize(self):
        if self.is_initialized:
            return True
            
        # Ensure model is downloaded
        if not os.path.exists(MODEL_PATH):
            log_info(f"Downloading MediaPipe Face Detection model to {MODEL_PATH}...")
            try:
                urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
                log_success("Model downloaded successfully.")
            except Exception as e:
                log_error(f"Failed to download model: {str(e)}")
                return False

        try:
            base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
            options = vision.FaceDetectorOptions(base_options=base_options)
            self.detector = vision.FaceDetector.create_from_options(options)
            self.is_initialized = True
            log_success("Face Detector Initialized")
            return True
        except Exception as e:
            log_error(f"Error initializing Face Detector: {str(e)}")
            self.is_initialized = False
            return False

    def detect_faces(self, cv_image):
        """
        Processes an OpenCV image (numpy array, BGR) and returns parsed face detections.
        """
        if not self.is_initialized or self.detector is None:
            return []

        try:
            # Convert BGR OpenCV image to RGB MediaPipe Image
            rgb_image = cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
            
            # Detect
            detection_result = self.detector.detect(mp_image)
            
            # Parse detections
            parsed_detections = []
            
            for idx, detection in enumerate(detection_result.detections):
                bbox = detection.bounding_box
                
                # Format to vision protocol bounding box (absolute pixel coordinates)
                x = max(0, int(bbox.origin_x))
                y = max(0, int(bbox.origin_y))
                w = int(bbox.width)
                h = int(bbox.height)
                
                center_x = int(x + w / 2)
                center_y = int(y + h / 2)
                
                confidence = round(float(detection.categories[0].score), 2) if detection.categories else 0.0
                
                parsed_detections.append({
                    "id": idx + 1,
                    "bbox": {
                        "x": x,
                        "y": y,
                        "width": w,
                        "height": h
                    },
                    "center": {
                        "x": center_x,
                        "y": center_y
                    },
                    "confidence": confidence
                })
                
            return parsed_detections
        except Exception as e:
            # Prevent single frame detection errors from crashing the loop
            return []

    def close(self):
        if self.detector is not None:
            self.detector.close()
            self.detector = None
        self.is_initialized = False

