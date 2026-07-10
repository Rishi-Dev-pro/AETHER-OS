# AETHER OS — Emotion Detection Module (Phase 7)
import math

class EmotionDetectionModule:
    """
    Deterministic facial emotion classifier based on 2D coordinates from FaceMesh landmarks
    and metrics computed in FaceIntelligence (smile, mouth status).
    Uses Exponential Moving Average (EMA) and a rolling history window to stabilize predictions.
    """

    def __init__(self, history_len=10, alpha=0.25):
        self.history_len = history_len
        self.alpha = alpha
        self.smoothed_scores = {}  # face_id -> dict of emotion -> score
        self.label_history = {}     # face_id -> list of dominant labels
        self.emotions = ["Neutral", "Happy", "Sad", "Angry", "Surprised", "Fear", "Disgust"]

    def calculate(self, faces):
        active_ids = set()

        for face in faces:
            face_id = face.get("id", 1)
            active_ids.add(face_id)
            landmarks = face.get("landmarks", [])

            # Safe fallback if landmarks are missing
            if not landmarks or len(landmarks) < 468:
                face["emotion"] = {
                    "dominant": "Neutral",
                    "confidence": 1.0,
                    "scores": {e: 1.0 if e == "Neutral" else 0.0 for e in self.emotions},
                    "stability": 1.0
                }
                continue

            try:
                # Helper to calculate 2D distance
                def dist2d(idx1, idx2):
                    p1 = landmarks[idx1]
                    p2 = landmarks[idx2]
                    return math.sqrt((p1["x"] - p2["x"])**2 + (p1["y"] - p2["y"])**2)

                # Eye distance for normalization
                # Landmark 33: Left eye inner corner, Landmark 263: Right eye inner corner
                eye_dist = max(1e-6, dist2d(33, 263))

                # 1. Eyebrow Furrow: Horizontal distance between inner eyebrows (landmarks 55 and 285)
                brow_furrow_dist = dist2d(55, 285)
                furrow_ratio = brow_furrow_dist / eye_dist

                # 2. Eyebrow Raise: Vertical distance from eyebrows (55, 285) to eye corners (133, 362)
                left_brow_height = dist2d(55, 133)
                right_brow_height = dist2d(285, 362)
                brow_height_ratio = ((left_brow_height + right_brow_height) / 2.0) / eye_dist

                # 3. Smile and Mouth Geometry
                smile_score = face.get("smile", 0.0)
                mar = face.get("mouth", {}).get("ratio", 0.0)

                # 4. Frown: Lip corners height relative to upper/lower lip center
                # Mouth center: Landmark 13 (upper lip center) & 14 (lower lip center)
                mouth_center_y = (landmarks[13]["y"] + landmarks[14]["y"]) / 2.0
                # Left corner 78, Right corner 308
                left_corner_y = landmarks[78]["y"]
                right_corner_y = landmarks[308]["y"]
                avg_corner_y = (left_corner_y + right_corner_y) / 2.0
                # In screen space y goes down, so a frown pulls corners below mouth center (avg_corner_y > mouth_center_y)
                frown_score = (avg_corner_y - mouth_center_y) / eye_dist

                # 5. Nose Sneer: Vertical distance from nose tip (1) to mouth center
                nose_tip_y = landmarks[1]["y"]
                nose_mouth_dist = (mouth_center_y - nose_tip_y) / eye_dist

                # Score mappings
                raw_scores = {e: 0.0 for e in self.emotions}

                # --- HEURISTIC ACTIVATIONS ---
                
                # Happy: Direct mapping from FaceIntelligence smile score
                raw_scores["Happy"] = float(smile_score)

                # Surprised: Raised eyebrows and open mouth
                if mar > 0.25 and brow_height_ratio > 0.22:
                    raw_scores["Surprised"] = float(min(1.0, (mar - 0.25) * 2.0 + (brow_height_ratio - 0.22) * 3.0))

                # Sad: Furrowed eyebrows + frowning lip corners + no smile
                sad_activation = 0.0
                if frown_score > 0.015:
                    sad_activation += min(1.0, (frown_score - 0.015) * 10.0)
                if furrow_ratio < 0.18:
                    sad_activation += min(1.0, (0.18 - furrow_ratio) * 5.0)
                raw_scores["Sad"] = float(max(0.0, min(1.0, sad_activation / 2.0))) * (1.0 - smile_score)

                # Angry: Furrowed and lowered eyebrows + frown
                angry_activation = 0.0
                if furrow_ratio < 0.16:
                    angry_activation += min(1.0, (0.16 - furrow_ratio) * 15.0)
                if brow_height_ratio < 0.19:
                    angry_activation += min(1.0, (0.19 - brow_height_ratio) * 10.0)
                if frown_score > 0.01:
                    angry_activation += min(1.0, (frown_score - 0.01) * 8.0)
                raw_scores["Angry"] = float(max(0.0, min(1.0, angry_activation / 3.0))) * (1.0 - smile_score)

                # Fear: Raised and furrowed eyebrows + open mouth
                fear_activation = 0.0
                if brow_height_ratio > 0.21 and furrow_ratio < 0.17:
                    fear_activation += 0.5
                if mar > 0.18:
                    fear_activation += 0.5
                raw_scores["Fear"] = float(max(0.0, min(1.0, fear_activation))) * (1.0 - smile_score)

                # Disgust: Wrinkled nose (compressed nose-to-mouth distance) + furrowed brows
                disgust_activation = 0.0
                if nose_mouth_dist < 0.28:
                    disgust_activation += min(1.0, (0.28 - nose_mouth_dist) * 10.0)
                if furrow_ratio < 0.17:
                    disgust_activation += 0.5
                raw_scores["Disgust"] = float(max(0.0, min(1.0, disgust_activation / 1.5))) * (1.0 - smile_score)

                # Neutral: Dominates if no other emotion is highly active
                max_other = max(raw_scores[e] for e in self.emotions if e != "Neutral")
                raw_scores["Neutral"] = float(max(0.0, 1.0 - max_other))

                # Normalize raw scores to sum to 1.0
                total_sum = sum(raw_scores.values())
                if total_sum > 0:
                    raw_scores = {e: round(raw_scores[e] / total_sum, 2) for e in self.emotions}
                else:
                    raw_scores = {e: 1.0 if e == "Neutral" else 0.0 for e in self.emotions}

                # --- TEMPORAL SMOOTHING ---
                if face_id not in self.smoothed_scores:
                    self.smoothed_scores[face_id] = raw_scores.copy()
                    self.label_history[face_id] = []
                else:
                    # Apply EMA to smooth scores
                    prev_scores = self.smoothed_scores[face_id]
                    for e in self.emotions:
                        prev_scores[e] = self.alpha * raw_scores[e] + (1.0 - self.alpha) * prev_scores[e]
                    
                    # Normalize smoothed scores
                    smooth_sum = sum(prev_scores.values())
                    if smooth_sum > 0:
                        self.smoothed_scores[face_id] = {e: round(prev_scores[e] / smooth_sum, 2) for e in self.emotions}

                smoothed = self.smoothed_scores[face_id]
                dominant_emotion = max(smoothed, key=smoothed.get)
                confidence = float(smoothed[dominant_emotion])

                # --- STABILITY METRIC ---
                hist = self.label_history[face_id]
                hist.append(dominant_emotion)
                if len(hist) > self.history_len:
                    hist.pop(0)

                match_count = hist.count(dominant_emotion)
                stability = round(float(match_count) / len(hist), 2)

                # Enrich face object with emotion data
                face["emotion"] = {
                    "dominant": dominant_emotion,
                    "confidence": confidence,
                    "scores": smoothed,
                    "stability": stability
                }

            except Exception as e:
                # Safe degradation on error
                face["emotion"] = {
                    "dominant": "Neutral",
                    "confidence": 1.0,
                    "scores": {e: 1.0 if e == "Neutral" else 0.0 for e in self.emotions},
                    "stability": 1.0
                }

        # Cleanup memory for inactive faces
        inactive_ids = set(self.smoothed_scores.keys()) - active_ids
        for fid in inactive_ids:
            self.smoothed_scores.pop(fid, None)
            self.label_history.pop(fid, None)

        return faces
