# AETHER OS — Pinch Detection Module (Phase 4.1)
import math
from utils import log_success, log_info, log_error

class PinchDetectorModule:
    """
    Computes pinch states and strength from hand landmarks deterministically.
    Uses normalized distances relative to palm dimensions.
    Supports state machine: start, hold, release, inactive.
    """

    def __init__(self):
        self.prev_states = {}  # Keys: "left", "right" -> values: "start", "hold", "release", "inactive"
        log_success("✓ Pinch Detector Initialized")

    def detect(self, hands):
        """
        Analyzes hand landmarks and computes pinch states across frames.

        Args:
            hands: List of hand dictionaries returned by HandTrackingModule.

        Returns:
            A list of pinch dictionaries:
            [{"handId": hand_id, "active": is_active, "state": state, "strength": strength, "distance": norm_dist}]
        """
        pinches = []
        current_handedness = {hand["handedness"] for hand in hands if "handedness" in hand}

        # Reset states of hands that are no longer present
        for handedness in list(self.prev_states.keys()):
            if handedness not in current_handedness:
                self.prev_states[handedness] = "inactive"

        for hand in hands:
            landmarks = hand.get("landmarks", [])
            handedness = hand.get("handedness", "unknown")
            hand_id = hand.get("id", 1)

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

                # 1. Compute fingertips distance (Thumb Tip 4 to Index Tip 8)
                tip_distance = dist3d(landmarks[4], landmarks[8])

                # 2. Compute reference base distance (Wrist 0 to Index MCP 5) for normalization
                ref_distance = dist3d(landmarks[5], landmarks[0])
                norm_dist = tip_distance / max(1e-6, ref_distance)

                # 3. Evaluate active state using stateful hysteresis
                prev_state = self.prev_states.get(handedness, "inactive")
                
                # Stateful hysteresis thresholds:
                # - Lower threshold (0.15) to start a pinch (requires deliberate finger closure)
                # - Higher threshold (0.18) to release (prevents early release due to tracking noise)
                if prev_state in ("start", "hold"):
                    is_pinching = norm_dist < 0.18
                else:
                    is_pinching = norm_dist < 0.15
                
                # Strength ranges from 1.0 (fully closed) to 0.0 (fully open)
                # Max pinch threshold 0.15, fully open starts at 0.3
                strength = max(0.0, min(1.0, (0.3 - norm_dist) / 0.15))

                # 4. State transitions
                state = "inactive"
                active = False

                if is_pinching:
                    active = True
                    if prev_state in ("inactive", "release"):
                        state = "start"
                    else:
                        state = "hold"
                else:
                    active = False
                    if prev_state in ("start", "hold"):
                        state = "release"
                    else:
                        state = "inactive"

                self.prev_states[handedness] = state



                pinches.append({
                    "handId": hand_id,
                    "active": active,
                    "state": state,
                    "strength": round(strength, 2),
                    "distance": round(norm_dist, 4)
                })

            except Exception as e:
                # Graceful degradation
                pass

        return pinches
