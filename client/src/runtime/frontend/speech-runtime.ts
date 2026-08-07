/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 3 Component: Speech Integration Layer (`speech-runtime.ts`)
 *
 * @file speech-runtime.ts
 * @description Bridges browser SpeechRecognition to ConversationRuntime.sendMessage() and
 * manages browser SpeechSynthesis (TTS) playback queue for assistant responses.
 *
 * @module @aether/runtime/frontend/speech-runtime
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 3
 */

import { useVoiceStore } from "../../store/voiceStore";
import { cognitiveTrigger } from "../../services/cognitiveTrigger";
import type { ConversationRuntime } from "../conversation/conversation-runtime";
import { useConversationStore } from "./conversation-store";

export interface SpeechSynthesisOptions {
  readonly voiceName?: string;
  readonly rate?: number; // 0.1 to 10
  readonly pitch?: number; // 0 to 2
  readonly lang?: string;
}

let ttsEnabled = true;
let activeSpeechRuntime: ConversationRuntime | null = null;
let cognitiveUnsubscribe: (() => void) | null = null;
let voiceStoreUnsubscribe: (() => void) | null = null;
let lastProcessedTranscript = "";

/**
 * Enables or disables automatic SpeechSynthesis for assistant responses.
 */
export function setTTSEnabled(enabled: boolean): void {
  ttsEnabled = enabled;
  if (!enabled) {
    cancelSpeech();
  }
}

/**
 * Checks if TTS is currently enabled.
 */
export function isTTSEnabled(): boolean {
  return ttsEnabled;
}

/**
 * Connects speech recognition trigger events to ConversationRuntime.sendMessage().
 */
export function bindSpeechRecognition(runtime: ConversationRuntime): () => void {
  activeSpeechRuntime = runtime;

  // Subscribe to cognitive trigger 'speech_final'
  cognitiveUnsubscribe = cognitiveTrigger.subscribe((type) => {
    if (type === "speech_final") {
      const state = useVoiceStore.getState();
      const transcript = state.transcript.trim();
      if (transcript && transcript !== lastProcessedTranscript && activeSpeechRuntime) {
        lastProcessedTranscript = transcript;
        activeSpeechRuntime.sendMessage(transcript).catch((err) => {
          console.error("SpeechRuntime sendMessage failed:", err);
          useConversationStore.getState().addError({
            code: "SPEECH_SEND_FAILED",
            message: `Speech dispatch error: ${err.message || err}`,
          });
        });
      }


    }
  });

  // Backup listener on voice store isFinal transition
  voiceStoreUnsubscribe = useVoiceStore.subscribe((state, prevState) => {
    if (state.isFinal && (!prevState || !prevState.isFinal)) {
      const transcript = state.transcript.trim();
      if (transcript && transcript !== lastProcessedTranscript && activeSpeechRuntime) {
        lastProcessedTranscript = transcript;
        activeSpeechRuntime.sendMessage(transcript).catch((err) => {
          console.error("SpeechRuntime sendMessage fallback failed:", err);
        });
      }
    }
  });


  return () => {
    if (cognitiveUnsubscribe) {
      cognitiveUnsubscribe();
      cognitiveUnsubscribe = null;
    }
    if (voiceStoreUnsubscribe) {
      voiceStoreUnsubscribe();
      voiceStoreUnsubscribe = null;
    }
    activeSpeechRuntime = null;
    lastProcessedTranscript = "";
  };
}

/**
 * Speaks text using browser SpeechSynthesis API.
 */
export function speak(text: string, options?: SpeechSynthesisOptions): boolean {
  if (!ttsEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  try {
    const synth = window.speechSynthesis;
    // Cancel ongoing speech before queuing new utterance
    synth.cancel();

    if (!text.trim()) {
      useConversationStore.getState().setIsSpeaking(false);
      useVoiceStore.getState().updateVoiceTelemetry({ isSpeaking: false });
      return false;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (options?.rate !== undefined) utterance.rate = options.rate;
    if (options?.pitch !== undefined) utterance.pitch = options.pitch;
    if (options?.lang !== undefined) utterance.lang = options.lang;

    if (options?.voiceName) {
      const voices = synth.getVoices();
      const targetVoice = voices.find((v) => v.name === options.voiceName);
      if (targetVoice) utterance.voice = targetVoice;
    }

    utterance.onstart = () => {
      useConversationStore.getState().setIsSpeaking(true);
      useVoiceStore.getState().updateVoiceTelemetry({ isSpeaking: true });
    };

    utterance.onend = () => {
      useConversationStore.getState().setIsSpeaking(false);
      useVoiceStore.getState().updateVoiceTelemetry({ isSpeaking: false });
    };

    utterance.onerror = (event) => {
      console.warn("SpeechSynthesis error event:", event);
      useConversationStore.getState().setIsSpeaking(false);
      useVoiceStore.getState().updateVoiceTelemetry({ isSpeaking: false });
    };

    synth.speak(utterance);
    return true;
  } catch (err) {
    console.error("SpeechSynthesis speak exception:", err);
    useConversationStore.getState().setIsSpeaking(false);
    useVoiceStore.getState().updateVoiceTelemetry({ isSpeaking: false });
    return false;
  }
}

/**
 * Cancels active browser speech playback.
 */
export function cancelSpeech(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore cancellation errors
    }
  }
  useConversationStore.getState().setIsSpeaking(false);
  useVoiceStore.getState().updateVoiceTelemetry({ isSpeaking: false });
}

/**
 * Automatically speaks the latest assistant message if TTS is enabled.
 */
export function speakLatestAssistantMessage(text: string): void {
  if (ttsEnabled && text) {
    speak(text);
  }
}
