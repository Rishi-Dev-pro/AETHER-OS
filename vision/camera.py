import cv2
import threading
import time
import os
from utils import log_success, log_error, log_info

class CameraManager:
    def __init__(self, index=0, width=640, height=480):
        self.index = index
        self.width = width
        self.height = height
        self.cap = None
        self.is_active = False
        self.lock = threading.Lock()
        self.ret = False
        self.frame = None
        self.thread = None

    def start(self):
        log_info(f"Initializing camera index {self.index}...")
        try:
            if os.name == 'nt':
                # Try DirectShow for fast startup on Windows
                self.cap = cv2.VideoCapture(self.index, cv2.CAP_DSHOW)
                if not self.cap or not self.cap.isOpened():
                    self.cap = cv2.VideoCapture(self.index)
            else:
                self.cap = cv2.VideoCapture(self.index)

            if not self.cap or not self.cap.isOpened():
                log_error(f"Could not open camera at index {self.index}.")
                self.is_active = False
                return False
            
            # Limit OpenCV internal buffer size to 1
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

            # Set resolution properties
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
            
            # Read back actual resolution
            self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            self.is_active = True
            
            # Read first frame synchronously
            ret, frame = self.cap.read()
            if ret:
                self.ret = ret
                self.frame = frame
            
            # Start background grabber thread to drain buffer continuously
            self.thread = threading.Thread(target=self._grab_frames, daemon=True)
            self.thread.start()

            log_success("✓ Camera Opened")
            log_info(f"Resolution: {self.width}x{self.height}")
            log_info(f"Camera Index: {self.index}")
            return True
        except Exception as e:
            log_error(f"Error starting camera: {str(e)}")
            self.is_active = False
            return False

    def _grab_frames(self):
        while self.is_active and self.cap and self.cap.isOpened():
            ret, frame = self.cap.read()
            if ret:
                with self.lock:
                    self.ret = ret
                    self.frame = frame
            else:
                # Idle slightly if capture fails/waits
                time.sleep(0.001)

    def read_frame(self):
        with self.lock:
            return self.ret, self.frame

    def release(self):
        self.is_active = False
        if self.thread:
            self.thread.join(timeout=1.0)
            self.thread = None
        if self.cap is not None:
            log_info("Releasing camera hardware...")
            self.cap.release()
            self.cap = None
            cv2.destroyAllWindows()
            log_success("✓ Camera Released")
