import type { PerceptionSnapshot, StructuredContext } from "../types/cognitive";
import { COGNITIVE_CONFIG } from "../config/cognitiveConfig";

/**
 * Pure, deterministic builder that translates a raw PerceptionSnapshot into
 * a highly semantic, structured, noise-filtered Context object.
 */
export const buildCognitiveContext = (snapshot: PerceptionSnapshot): StructuredContext => {
  const { metadata, vision, voice, interaction, environment } = snapshot;

  // 1. Build System State Summary
  const cameraMode = vision.cameraActive ? `ACTIVE (${vision.fps} FPS)` : "OFFLINE";
  const latencyStr = environment.latency !== null ? `${environment.latency}ms RTT` : "unknown";
  const systemStateSummary = `Camera: ${cameraMode} | Latency: ${latencyStr} | Browser: ${environment.systemFps} FPS | Screen: ${environment.resolution}`;

  let visualFocusText: string;
  const xPct = (interaction.virtualPointer.x * 100).toFixed(1);
  const yPct = (interaction.virtualPointer.y * 100).toFixed(1);
  
  if (interaction.hoveredElementId) {
    visualFocusText = `Focusing on target element '${interaction.hoveredElementId}' at viewport coordinates (${xPct}%, ${yPct}%).`;
  } else {
    visualFocusText = `Pointer coordinates: (${xPct}%, ${yPct}%) - hovering on viewport canvas.`;
  }
  if (interaction.pressedElementId) {
    visualFocusText += ` Pressed element: '${interaction.pressedElementId}'.`;
  }

  // 3. Build User Expression summary (alphabetically sorted faces)
  let userExpression = "No faces detected.";
  if (vision.faceCount > 0 && Array.isArray(vision.faces)) {
    const sortedFaces = [...vision.faces].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const faceStats = sortedFaces
      .map((f) => `Face [${f.id}] (Looking: ${f.looking || "unknown"}, Emotion: ${f.dominantEmotion || "None"})`)
      .join(", ");
    userExpression = `Detected ${vision.faceCount} face(s): ${faceStats}. Global Emotion Summary: ${vision.emotionSummary}.`;
  }

  // 4. Build User Hands Text (alphabetically sorted hands)
  let userHandsText = "No hands detected.";
  if (vision.handCount > 0 && Array.isArray(vision.hands)) {
    const sortedHands = [...vision.hands].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const handStats = sortedHands
      .map((h) => {
        const pinchStr = h.pinchActive ? `pinching (strength: ${h.pinchStrength.toFixed(2)})` : "not pinching";
        return `${h.handedness.toUpperCase()} hand [${h.id}] showing gesture '${h.gesture || "none"}' and is ${pinchStr}`;
      })
      .join(", ");
    userHandsText = `Detected ${vision.handCount} hand(s): ${handStats}.`;
  }

  // 5. Build Voice Input Text
  let voiceInputText = "Microphone inactive / quiet.";
  if (voice.isListening) {
    if (voice.transcript.trim()) {
      const status = voice.isFinal ? "final" : "interim";
      voiceInputText = `Speaking: "${voice.transcript}" (${status}, confidence: ${voice.confidence.toFixed(2)})`;
    } else {
      voiceInputText = "Quiet, listening for speech input...";
    }
  }

  return {
    snapshotId: metadata.snapshotId,
    timestamp: metadata.timestamp,
    triggerType: metadata.triggerType,
    systemStateSummary,
    visualFocusText,
    userExpression,
    userHandsText,
    voiceInputText,
    voice: {
      transcript: voice.transcript,
      isListening: voice.isListening,
      isSpeaking: voice.isSpeaking,
      isFinal: voice.isFinal,
      confidence: voice.confidence,
    },
    contextMetadata: {
      builderVersion: COGNITIVE_CONFIG.builderVersion,
      schemaVersion: COGNITIVE_CONFIG.schemaVersion,
      timeOffsetMs: 0, // Supplemented by SnapshotManager relative to initialization baseline
    },
  };
};
