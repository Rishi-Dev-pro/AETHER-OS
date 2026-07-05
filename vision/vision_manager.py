import time
import json
import os
import sys
import threading

# Add modules directory to path to support standard imports
sys.path.append(os.path.join(os.path.dirname(__file__), "modules"))

from camera import CameraManager
from payload import VisionPayload
from utils import log_info, log_error, log_success
from face_detection import FaceDetectorModule

class VisionManager:
    def __init__(self, camera_index=0, width=640, height=480, target_fps=30):
        self.camera_manager = CameraManager(index=camera_index, width=width, height=height)
        self.target_fps = target_fps
        self._stop_event = threading.Event()
        self.face_detector = FaceDetectorModule()
        self.face_detector_active = False

    @property
    def running(self):
        return not self._stop_event.is_set()

    def run(self):
        # Graceful startup
        camera_ok = self.camera_manager.start()
        
        # Initialize detector once
        self.face_detector_active = self.face_detector.initialize()
        
        self._stop_event.clear()
        last_time = time.time()
        frame_count = 0
        current_fps = 0.0

        log_info(f"Target FPS: {self.target_fps}")
        log_success("✓ Streaming Started")

        while not self._stop_event.is_set():
            start_frame_time = time.time()
            
            # Capture frame
            ret, frame = self.camera_manager.read_frame()
            
            # Calculate live FPS every second
            frame_count += 1
            now = time.time()
            elapsed = now - last_time
            if elapsed >= 1.0:
                current_fps = round(frame_count / elapsed, 1)
                frame_count = 0
                last_time = now

            # Process frame with face detector
            faces = []
            if ret and frame is not None:
                if self.face_detector_active:
                    start_detect_time = time.time()
                    faces = self.face_detector.detect_faces(frame)
                    detect_duration = time.time() - start_detect_time
                    
                    if len(faces) > 0:
                        print("✓ Face Detected", flush=True)
                        print(f"✓ Faces Count: {len(faces)}", flush=True)
                    
                    detection_fps = round(1.0 / max(0.001, detect_duration), 1)
                    print(f"✓ Detection FPS: {detection_fps}", flush=True)

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
                status=status,
                warnings=warnings
            )

            # Compress frame to JPEG and encode to base64
            frame_data_url = None
            if ret and frame is not None:
                try:
                    import cv2
                    import base64
                    success, buffer = cv2.imencode('.jpg', frame)
                    if success:
                        base64_str = base64.b64encode(buffer).decode('utf-8')
                        frame_data_url = f"data:image/jpeg;base64,{base64_str}"
                except Exception as e:
                    log_error(f"Error encoding frame: {str(e)}")

            # Print compound payload (frame + metadata) in JSON format to stdout
            output_data = {
                "frame": frame_data_url,
                "payload": payload.to_dict()
            }
            print(json.dumps(output_data), flush=True)

            # Enforce target FPS frame pacing
            time_spent = time.time() - start_frame_time
            delay = max(0.001, (1.0 / self.target_fps) - time_spent)
            time.sleep(delay)

        log_success("✓ Processing Loop Stopped")

    def stop(self):
        log_info("Stopping vision manager loop...")
        self._stop_event.set()
        self.face_detector.close()
        self.camera_manager.release()
