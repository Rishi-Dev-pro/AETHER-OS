# AETHER OS — Face Intelligence Module (Phase 3.7.5)
# Receives landmarks and calculates geometric relations like EAR, MAR, Smile, Yaw, Pitch, Roll.

import math
from utils import log_success, log_info, log_error

class FaceIntelligenceModule:
    """
    Computes geometric metrics from facial landmarks:
    - Eye Aspect Ratio (EAR) & Eye Status (open/closed)
    - Blink detection (both eyes closed)
    - Mouth Aspect Ratio (MAR) & Mouth Status (open/closed)
    - Smile Ratio (smile intensity)
    - Head Orientation (yaw, pitch, roll)
    - Looking Direction (left, right, center, up, down)
    """

    def __init__(self):
        log_success("✓ Face Intelligence Initialized")

    def calculate(self, faces):
        """
        Extends each face object with calculated intelligence values.
        """
        for face in faces:
            landmarks = face.get("landmarks", [])
            if not landmarks or len(landmarks) < 468:
                # Set default fallbacks if landmarks are missing
                face["eyes"] = {"leftOpen": True, "rightOpen": True}
                face["blink"] = False
                face["mouth"] = {"open": False, "ratio": 0.0}
                face["smile"] = 0.0
                face["head"] = {"yaw": 0, "pitch": 0, "roll": 0}
                face["looking"] = "center"
                continue

            try:
                # 2D distance helper
                def dist2d(idx1, idx2):
                    p1 = landmarks[idx1]
                    p2 = landmarks[idx2]
                    return math.sqrt((p1["x"] - p2["x"])**2 + (p1["y"] - p2["y"])**2)

                # 1. EAR Calculations
                # Left Eye (MediaPipe standard indexes: 33, 160, 158, 133, 153, 144)
                d_v1_l = dist2d(160, 144)
                d_v2_l = dist2d(158, 153)
                d_h_l = dist2d(33, 133)
                left_ear = (d_v1_l + d_v2_l) / (2.0 * max(1e-6, d_h_l))

                # Right Eye (MediaPipe standard indexes: 362, 385, 387, 263, 373, 380)
                d_v1_r = dist2d(385, 380)
                d_v2_r = dist2d(387, 373)
                d_h_r = dist2d(362, 263)
                right_ear = (d_v1_r + d_v2_r) / (2.0 * max(1e-6, d_h_r))

                # EAR thresholds (typically around 0.18 - 0.20)
                left_open = left_ear > 0.18
                right_open = right_ear > 0.18

                # 2. Blink Detection (both eyes closed)
                blink = not left_open and not right_open

                # 3. MAR Calculation (mouth open/closed)
                # Outer lips top/bottom center (13, 14) and corners (78, 308)
                d_v_mouth = dist2d(13, 14)
                d_h_mouth = dist2d(78, 308)
                mar = d_v_mouth / max(1e-6, d_h_mouth)
                mouth_open = mar > 0.15

                # 4. Smile Intensity (mouth width vs outer eye distance)
                mouth_width = d_h_mouth
                eye_dist = dist2d(33, 263)
                smile_ratio = mouth_width / max(1e-6, eye_dist)
                # Neutral smile_ratio is roughly 0.44-0.46, smiling widens it to 0.58+
                smile_score = float(max(0.0, min(1.0, (smile_ratio - 0.45) / 0.14)))
                smile_score = round(smile_score, 2)

                # 5. Head Orientation
                # Roll: Angle between eyes
                dx = landmarks[263]["x"] - landmarks[33]["x"]
                dy = landmarks[263]["y"] - landmarks[33]["y"]
                roll = int(round(math.degrees(math.atan2(dy, dx))))

                # Yaw: Nose horizontal offset relative to eyes
                nose_x = landmarks[1]["x"]
                left_eye_x = landmarks[33]["x"]
                right_eye_x = landmarks[263]["x"]
                eye_center_x = (left_eye_x + right_eye_x) / 2.0
                eye_width = max(1e-6, right_eye_x - left_eye_x)
                yaw_offset = (nose_x - eye_center_x) / eye_width
                yaw = int(round(yaw_offset * 120.0))

                # Pitch: Nose vertical offset relative to eyes/chin
                nose_y = landmarks[1]["y"]
                left_eye_y = landmarks[33]["y"]
                right_eye_y = landmarks[263]["y"]
                eye_center_y = (left_eye_y + right_eye_y) / 2.0
                chin_y = landmarks[152]["y"]
                face_height = max(1e-6, chin_y - eye_center_y)
                pitch_offset = (nose_y - eye_center_y) / face_height
                # Standard offset is about 0.35 at neutral pitch
                pitch = int(round((pitch_offset - 0.35) * -160.0))

                # Clamp to boundaries
                yaw = max(-90, min(90, yaw))
                pitch = max(-90, min(90, pitch))
                roll = max(-90, min(90, roll))

                # 6. Looking Direction
                if yaw < -12:
                    looking = "left"
                elif yaw > 12:
                    looking = "right"
                elif pitch > 12:
                    looking = "up"
                elif pitch < -12:
                    looking = "down"
                else:
                    looking = "center"

                # Update face dictionary
                face["eyes"] = {"leftOpen": left_open, "rightOpen": right_open}
                face["blink"] = blink
                face["mouth"] = {"open": mouth_open, "ratio": round(mar, 2)}
                face["smile"] = smile_score
                face["head"] = {"yaw": yaw, "pitch": pitch, "roll": roll}
                face["looking"] = looking

            except Exception as e:
                # Fallback to prevent loop failure
                face["eyes"] = {"leftOpen": True, "rightOpen": True}
                face["blink"] = False
                face["mouth"] = {"open": False, "ratio": 0.0}
                face["smile"] = 0.0
                face["head"] = {"yaw": 0, "pitch": 0, "roll": 0}
                face["looking"] = "center"

        return faces
