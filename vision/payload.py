from utils import get_iso_timestamp

class VisionPayload:
    def __init__(self, camera_active=False, fps=0, width=0, height=0, faces=None, status="standby", warnings=None, metrics=None):
        self.timestamp = get_iso_timestamp()
        self.camera = camera_active
        self.fps = fps
        self.frameWidth = width
        self.frameHeight = height
        
        # Ingest array inputs
        self.faces = faces if faces is not None else []
        self.hands = []
        self.pose = []
        self.objects = []
        self.emotions = []
        self.ocr = []
        
        self.status = status
        self.warnings = warnings if warnings is not None else []
        self.metrics = metrics if metrics is not None else {}

    def to_dict(self):
        return {
            "timestamp": self.timestamp,
            "camera": self.camera,
            "fps": self.fps,
            "frameWidth": self.frameWidth,
            "frameHeight": self.frameHeight,
            "faces": self.faces,
            "hands": self.hands,
            "pose": self.pose,
            "objects": self.objects,
            "emotions": self.emotions,
            "ocr": self.ocr,
            "status": self.status,
            "warnings": self.warnings,
            "metrics": self.metrics
        }
