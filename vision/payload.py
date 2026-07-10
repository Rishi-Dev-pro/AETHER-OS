from utils import get_iso_timestamp

class VisionPayload:
    def __init__(self, camera_active=False, fps=0, width=0, height=0, faces=None, hands=None, gestures=None, pinches=None, pointer=None, status="standby", warnings=None, metrics=None):
        self.timestamp = get_iso_timestamp()
        self.camera = camera_active
        self.fps = fps
        self.frameWidth = width
        self.frameHeight = height
        
        # Ingest array inputs
        self.faces = faces if faces is not None else []
        self.hands = hands if hands is not None else []
        self.gestures = gestures if gestures is not None else []
        self.pinches = pinches if pinches is not None else []
        self.pointer = pointer if pointer is not None else {"x": 0.0, "y": 0.0, "visible": False, "pinching": False}
        self.pose = []
        self.objects = []
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
            "gestures": self.gestures,
            "pinches": self.pinches,
            "pointer": self.pointer,
            "pose": self.pose,
            "objects": self.objects,
            "ocr": self.ocr,
            "status": self.status,
            "warnings": self.warnings,
            "metrics": self.metrics
        }
