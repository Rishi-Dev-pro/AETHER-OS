import time
import json
import os
import sys
import threading
import cv2
import base64

# Add modules directory to path to support standard imports
sys.path.append(os.path.join(os.path.dirname(__file__), "modules"))

from camera import CameraManager
from payload import VisionPayload
from utils import log_info, log_error, log_success
from face_detection import FaceDetectorModule
from face_mesh import FaceMeshModule
from face_intelligence import FaceIntelligenceModule
from hand_tracking import HandTrackingModule
from gesture_recognition import GestureRecognizerModule
from pinch_detection import PinchDetectorModule
from pointer_engine import PointerEngineModule
from pointer_stabilizer import PointerStabilizerModule
from emotion_detection import EmotionDetectionModule

class VisionManager:
    def __init__(self, camera_index=0, width=640, height=480, target_fps=30):
        self.camera_manager = CameraManager(index=camera_index, width=width, height=height)
        self.target_fps = target_fps
        self._stop_event = threading.Event()
        
        self.face_detector = FaceDetectorModule()
        self.face_detector_active = False
        self.face_mesh = FaceMeshModule()
        self.face_mesh_active = False
        self.face_intelligence = FaceIntelligenceModule()
        self.emotion_detector = EmotionDetectionModule()
        self.hand_tracker = HandTrackingModule()
        self.hand_tracker_active = False
        self.gesture_recognizer = GestureRecognizerModule()
        self.pinch_detector = PinchDetectorModule()
        self.pointer_engine = PointerEngineModule()
        self.pointer_stabilizer = PointerStabilizerModule()
        
        # Profiler variables
        self.last_write_duration = 0.0

    @property
    def running(self):
        return not self._stop_event.is_set()

    def run(self):
        # Graceful startup
        camera_ok = self.camera_manager.start()
        
        # Initialize detectors once on start
        self.face_detector_active = self.face_detector.initialize()
        self.face_mesh_active = self.face_mesh.initialize()
        self.hand_tracker_active = self.hand_tracker.initialize()
        
        self._stop_event.clear()
        last_time = time.time()
        frame_count = 0
        current_fps = 0.0

        log_info(f"Target FPS: {self.target_fps}")
        log_success("✓ Streaming Started")

        while not self._stop_event.is_set():
            t_python_start = time.time() * 1000.0  # epoch millisecond timestamp
            
            # 1. Camera Capture Time
            start_cap = time.perf_counter()
            ret, frame = self.camera_manager.read_frame()
            t_cap = (time.perf_counter() - start_cap) * 1000.0
            
            # Calculate live FPS every second
            frame_count += 1
            now = time.time()
            elapsed = now - last_time
            if elapsed >= 1.0:
                current_fps = round(frame_count / elapsed, 1)
                frame_count = 0
                last_time = now

            # Process frame through detection stages
            faces = []
            hands = []
            gestures = []
            pinches = []
            pointer = {"x": 0.0, "y": 0.0, "visible": False, "pinching": False}
            t_det = 0.0
            t_mesh = 0.0
            t_intel = 0.0
            t_emotion = 0.0
            t_hand = 0.0
            t_gesture = 0.0
            t_pinch = 0.0
            t_pointer = 0.0
            t_stabilize = 0.0
            
            if ret and frame is not None:
                # 2. Face Detection Time
                if self.face_detector_active:
                    start_det = time.perf_counter()
                    faces = self.face_detector.detect_faces(frame)
                    t_det = (time.perf_counter() - start_det) * 1000.0
                    
                    if len(faces) > 0:
                        print("✓ Face Detected", flush=True)
                        print(f"✓ Faces Count: {len(faces)}", flush=True)
                
                # 3. Face Mesh Time
                if self.face_mesh_active and len(faces) > 0:
                    start_mesh = time.perf_counter()
                    faces = self.face_mesh.process(frame, faces)
                    t_mesh = (time.perf_counter() - start_mesh) * 1000.0
                
                # 4. Face Intelligence Time
                if len(faces) > 0:
                    start_intel = time.perf_counter()
                    faces = self.face_intelligence.calculate(faces)
                    t_intel = (time.perf_counter() - start_intel) * 1000.0

                # 4.5. Emotion Intelligence Time
                if len(faces) > 0:
                    start_emotion = time.perf_counter()
                    faces = self.emotion_detector.calculate(faces)
                    t_emotion = (time.perf_counter() - start_emotion) * 1000.0

                # 5. Hand Tracking Time
                if self.hand_tracker_active:
                    start_hand = time.perf_counter()
                    hands = self.hand_tracker.process(frame)
                    t_hand = (time.perf_counter() - start_hand) * 1000.0

                # 6. Gesture Recognition Time
                if len(hands) > 0:
                    start_gesture = time.perf_counter()
                    gestures = self.gesture_recognizer.recognize(hands)
                    t_gesture = (time.perf_counter() - start_gesture) * 1000.0

                # 7. Pinch Detection Time
                if len(hands) > 0:
                    start_pinch = time.perf_counter()
                    pinches = self.pinch_detector.detect(hands)
                    t_pinch = (time.perf_counter() - start_pinch) * 1000.0

                # 8. Pointer Engine Time
                if len(hands) > 0:
                    start_pointer = time.perf_counter()
                    pointer = self.pointer_engine.process(hands, pinches)
                    t_pointer = (time.perf_counter() - start_pointer) * 1000.0

                # 9. Pointer Stabilization Time
                start_stabilize = time.perf_counter()
                pointer = self.pointer_stabilizer.stabilize(pointer)
                t_stabilize = (time.perf_counter() - start_stabilize) * 1000.0

            # Create protocol-compliant payload
            camera_active = ret and self.camera_manager.is_active
            status = "detecting" if self.face_detector_active else ("active" if camera_active else "offline")
            warnings = []
            if not ret:
                warnings.append("Camera capture failed or offline")

            payload = VisionPayload(
                camera_active=camera_active,
                fps=int(current_fps) if current_fps > 0 else self.target_fps,
                width=self.camera_manager.width if camera_active else 0,
                height=self.camera_manager.height if camera_active else 0,
                faces=faces,
                hands=hands,
                gestures=gestures,
                pinches=pinches,
                pointer=pointer,
                status=status,
                warnings=warnings
            )

            # Compress frame to JPEG and encode to base64
            frame_data_url = None
            t_jpeg = 0.0
            t_b64 = 0.0
            
            if ret and frame is not None:
                try:
                    # 5. JPEG Encoding Time (Quality 80)
                    start_jpeg = time.perf_counter()
                    success, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                    t_jpeg = (time.perf_counter() - start_jpeg) * 1000.0
                    
                    if success:
                        # 6. Base64 Encoding Time
                        start_b64 = time.perf_counter()
                        base64_str = base64.b64encode(buffer).decode('utf-8')
                        frame_data_url = f"data:image/jpeg;base64,{base64_str}"
                        t_b64 = (time.perf_counter() - start_b64) * 1000.0
                except Exception as e:
                    log_error(f"Error encoding frame: {str(e)}")

            t_python_end = time.time() * 1000.0  # epoch millisecond timestamp

            # Construct profile payload
            profile = {
                "tPythonStart": t_python_start,
                "tCameraCapture": t_cap,
                "tFaceDetect": t_det,
                "tFaceMesh": t_mesh,
                "tFaceIntel": t_intel,
                "tEmotionIntel": t_emotion,
                "tHandTrack": t_hand,
                "tGestureRec": t_gesture,
                "tPinchDetect": t_pinch,
                "tPointerEng": t_pointer,
                "tPointerStab": t_stabilize,
                "tJpegEncode": t_jpeg,
                "tBase64Encode": t_b64,
                "tPythonWrite": self.last_write_duration,
                "tPythonEnd": t_python_end
            }

            output_data = {
                "frame": frame_data_url,
                "payload": payload.to_dict(),
                "profile": profile
            }

            # 7. Python stdout Write Time
            start_write = time.perf_counter()
            print(json.dumps(output_data), flush=True)
            self.last_write_duration = (time.perf_counter() - start_write) * 1000.0

            # Enforce target FPS frame pacing
            time_spent = (time.time() * 1000.0 - t_python_start) / 1000.0
            delay = max(0.001, (1.0 / self.target_fps) - time_spent)
            time.sleep(delay)

        log_success("✓ Processing Loop Stopped")

    def stop(self):
        log_info("Stopping vision manager loop...")
        self._stop_event.set()
        self.face_detector.close()
        self.face_mesh.close()
        self.hand_tracker.close()
        self.camera_manager.release()
