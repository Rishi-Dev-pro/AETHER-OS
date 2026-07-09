# AETHER OS — Pointer Engine Module (Phase 4.2)
from utils import log_success, log_info, log_error

class PointerEngineModule:
    """
    Computes virtual pointer coordinates and pinch status from hand tracking and pinch detection.
    Does NOT use machine learning or access physical cursors.
    Supports right-hand preference fallback to left-hand.
    """

    def __init__(self):
        log_success("✓ Pointer Engine Initialized")

    def process(self, hands, pinches):
        """
        Processes hands and pinches, selecting the primary pointer hand.

        Args:
            hands: List of hand dictionaries returned by HandTrackingModule.
            pinches: List of pinch dictionaries returned by PinchDetectorModule.

        Returns:
            A pointer dictionary:
            {"x": float, "y": float, "visible": bool, "pinching": bool}
        """
        # Default pointer payload if no hand is detected
        default_pointer = {
            "x": 0.0,
            "y": 0.0,
            "visible": False,
            "pinching": False
        }

        if not hands:
            return default_pointer

        try:
            # 1. Select the primary hand (Prefer right hand, fallback to any available hand)
            selected_hand = None
            for hand in hands:
                if hand.get("handedness") == "right":
                    selected_hand = hand
                    break
            
            if selected_hand is None:
                selected_hand = hands[0]

            # 2. Extract Index Fingertip (Landmark 8)
            landmarks = selected_hand.get("landmarks", [])
            if not landmarks or len(landmarks) < 21:
                return default_pointer

            index_tip = landmarks[8]
            x = round(float(index_tip["x"]), 6)
            y = round(float(index_tip["y"]), 6)

            # 3. Check if the selected hand is pinching
            hand_id = selected_hand.get("id")
            pinching = False
            for pinch in pinches:
                if pinch.get("handId") == hand_id:
                    pinching = pinch.get("active", False)
                    break

            return {
                "x": x,
                "y": y,
                "visible": True,
                "pinching": pinching
            }

        except Exception as e:
            # Graceful degradation
            return default_pointer
