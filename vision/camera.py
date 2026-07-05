import cv2
from utils import log_success, log_error, log_info

class CameraManager:
    def __init__(self, index=0, width=640, height=480):
        self.index = index
        self.width = width
        self.height = height
        self.cap = None
        self.is_active = False

    def start(self):
        log_info(f"Initializing camera index {self.index}...")
        try:
            self.cap = cv2.VideoCapture(self.index)
            if not self.cap or not self.cap.isOpened():
                log_error(f"Could not open camera at index {self.index}.")
                self.is_active = False
                return False
            
            # Set resolution properties
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
            
            # Read back actual resolution in case camera doesn't support the requested one
            self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            self.is_active = True
            log_success("✓ Camera Opened")
            log_info(f"Resolution: {self.width}x{self.height}")
            log_info(f"Camera Index: {self.index}")
            return True
        except Exception as e:
            log_error(f"Error starting camera: {str(e)}")
            self.is_active = False
            return False

    def read_frame(self):
        if not self.is_active or self.cap is None:
            return False, None
        try:
            ret, frame = self.cap.read()
            if not ret:
                log_error("Failed to capture frame from camera.")
                return False, None
            return True, frame
        except Exception as e:
            log_error(f"Error reading frame: {str(e)}")
            return False, None

    def release(self):
        if self.cap is not None:
            log_info("Releasing camera hardware...")
            self.cap.release()
            self.cap = None
            cv2.destroyAllWindows()
            log_success("✓ Camera Released")
        self.is_active = False
