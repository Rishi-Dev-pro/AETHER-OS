# AETHER OS — Gesture Recognition Module (Phase 4.0)
import math
from utils import log_success, log_info, log_error

class GestureRecognizerModule:
    """
    Computes hand gestures from hand landmarks deterministically.
    Does NOT use machine learning or MediaPipe tasks.
    Supports: Open Palm, Fist, Point, Thumbs Up, Peace.
    """

    def __init__(self):
        log_success("✓ Gesture Recognizer Initialized")

    def recognize(self, hands):
        """
        Analyzes the landmarks of each detected hand and returns a list of recognized gestures.

        Args:
            hands: List of hand dictionaries returned by HandTrackingModule.

        Returns:
            A list of recognized gesture dictionaries:
            [{"handId": hand_id, "gesture": gesture_name, "confidence": hand_confidence}]
        """
        gestures = []
        for idx, hand in enumerate(hands):
            landmarks = hand.get("landmarks", [])
            if not landmarks or len(landmarks) < 21:
                continue

            try:
                # Helper for 3D distance
                def dist3d(p1, p2):
                    return math.sqrt(
                        (p1["x"] - p2["x"])**2 +
                        (p1["y"] - p2["y"])**2 +
                        (p1["z"] - p2["z"])**2
                    )

                # Check extension for non-thumb fingers (Index, Middle, Ring, Pinky)
                # Using rotation-invariant Segment-Sum Ratio test: straight line MCP->Tip vs segment-by-segment length sum.
                # A finger is straight if the straight line is > 90% of the actual segment sum.
                is_index_extended = dist3d(landmarks[8], landmarks[5]) > 0.90 * (dist3d(landmarks[6], landmarks[5]) + dist3d(landmarks[8], landmarks[6]))
                is_middle_extended = dist3d(landmarks[12], landmarks[9]) > 0.90 * (dist3d(landmarks[10], landmarks[9]) + dist3d(landmarks[12], landmarks[10]))
                is_ring_extended = dist3d(landmarks[16], landmarks[13]) > 0.90 * (dist3d(landmarks[14], landmarks[13]) + dist3d(landmarks[16], landmarks[14]))
                is_pinky_extended = dist3d(landmarks[20], landmarks[17]) > 0.90 * (dist3d(landmarks[18], landmarks[17]) + dist3d(landmarks[20], landmarks[18]))

                # Check thumb extension: distance between thumb tip (4) and middle MCP (9)
                # compared to thumb IP (3) and middle MCP (9)
                is_thumb_extended = dist3d(landmarks[4], landmarks[9]) > dist3d(landmarks[3], landmarks[9])

                # Determine gesture
                detected_gesture = "Unknown"

                # 1. Open Palm: All fingers extended
                if is_thumb_extended and is_index_extended and is_middle_extended and is_ring_extended and is_pinky_extended:
                    detected_gesture = "Open Palm"
                
                # 2. Fist: All fingers folded (or at least index, middle, ring, pinky folded)
                elif not is_index_extended and not is_middle_extended and not is_ring_extended and not is_pinky_extended:
                    # Thumbs Up check: thumb is extended, other fingers folded
                    if is_thumb_extended:
                        detected_gesture = "Thumbs Up"
                    else:
                        detected_gesture = "Fist"
                
                # 3. Point: Only Index extended
                elif is_index_extended and not is_middle_extended and not is_ring_extended and not is_pinky_extended:
                    detected_gesture = "Point"
                
                # 4. Peace: Index and Middle extended, Ring and Pinky folded
                elif is_index_extended and is_middle_extended and not is_ring_extended and not is_pinky_extended:
                    detected_gesture = "Peace"

                if detected_gesture != "Unknown":
                    gestures.append({
                        "handId": hand["id"],
                        "gesture": detected_gesture,
                        "confidence": hand["confidence"]
                    })



            except Exception as e:
                # Graceful degradation - never let mathematical computation crash the loop
                pass

        return gestures
