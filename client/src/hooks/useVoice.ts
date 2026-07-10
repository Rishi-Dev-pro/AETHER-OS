import { useEffect, useRef } from "react";
import { useVoiceStore } from "../store/voiceStore";
import { emitVoiceTelemetry } from "../services/socket";

export function useVoice() {
  const hasMicOwnership = useVoiceStore((state) => state.hasMicOwnership);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Tracking refs to stabilize asynchronous processes and prevent race loops
  const captureSessionIdRef = useRef<number>(0);
  const hasCriticalErrorRef = useRef<boolean>(false);
  const lastTranscriptRef = useRef<string>("");

  useEffect(() => {
    if (hasMicOwnership) {
      captureSessionIdRef.current += 1;
      const sessionId = captureSessionIdRef.current;
      startVoiceCapture(sessionId);
    } else {
      captureSessionIdRef.current += 1;
      stopVoiceCapture();
    }

    return () => {
      // CRITICAL LIFECYCLE RESTORATION:
      // Cleanup return blocks must ONLY release browser resources.
      // They must NEVER mutate Zustand ownership/listening state directly.
      captureSessionIdRef.current += 1;
      cleanupResources();
    };
  }, [hasMicOwnership]);

  const startVoiceCapture = async (sessionId: number) => {
    useVoiceStore.getState().setVoiceStatus("LISTENING");
    hasCriticalErrorRef.current = false;
    lastTranscriptRef.current = "";

    // 1. Initialize Web Audio API Analyser
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.error("Web Audio API not supported in this browser");
      useVoiceStore.getState().setVoiceStatus("OFFLINE");
      return;
    }

    try {
      // Prompt mic permissions explicitly via getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // CRITICAL RACE CHECK:
      // If the session was cancelled or toggled off while permission was pending,
      // release the microphone hardware immediately and halt initialization.
      if (sessionId !== captureSessionIdRef.current || !useVoiceStore.getState().hasMicOwnership) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // 2. Setup Audio Level Polling & VAD (Voice Activity Detection)
      const dataArray = new Float32Array(analyser.fftSize);
      let lastEmitTime = 0;
      let VADActive = false;
      let silenceStart = Date.now();
      let suspendedFramesCount = 0;

      const pollAudio = () => {
        // Halt if session was terminated or invalidated
        if (!analyserRef.current || 
            !useVoiceStore.getState().hasMicOwnership || 
            sessionId !== captureSessionIdRef.current) {
          return;
        }

        // AUTO-RESUME SUSPENDED AUDIOCONTEXT (Sleep/Resume or tab backgrounding)
        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume().catch((err) => console.error("Auto-resume failed:", err));
          suspendedFramesCount += 1;
          
          // If suspended for too long (e.g. ~5 seconds), trigger auto-recovery to reset device locks
          if (suspendedFramesCount > 50) {
            console.warn("AudioContext suspended indefinitely. Initiating recovery...");
            suspendedFramesCount = 0;
            triggerRecovery();
            return;
          }
        } else {
          suspendedFramesCount = 0;
        }

        analyserRef.current.getFloatTimeDomainData(dataArray);

        // RMS calculations for volume
        let sumSquares = 0.0;
        for (let i = 0; i < dataArray.length; i++) {
          sumSquares += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        const audioLevel = Math.min(1.0, rms * 4.0); // Sensitive scaling factor

        const isAboveThreshold = audioLevel > 0.02;
        const now = Date.now();

        // Heuristic VAD state toggles
        if (isAboveThreshold) {
          if (!VADActive) {
            VADActive = true;
            useVoiceStore.getState().updateVoiceTelemetry({ isSpeaking: true });
            emitVoiceTelemetry({
              status: "LISTENING",
              isListening: true,
              isSpeaking: true,
              audioLevel: parseFloat(audioLevel.toFixed(3)),
              transcript: useVoiceStore.getState().transcript,
              isFinal: useVoiceStore.getState().isFinal,
              confidence: useVoiceStore.getState().confidence,
              timestamp: new Date().toISOString(),
            });
          }
          silenceStart = now;
        } else {
          // Release VAD speaking state only after 1 second of silence to avoid mid-utterance clips
          if (VADActive && now - silenceStart > 1000) {
            VADActive = false;
            useVoiceStore.getState().updateVoiceTelemetry({ isSpeaking: false });
            emitVoiceTelemetry({
              status: "LISTENING",
              isListening: true,
              isSpeaking: false,
              audioLevel: parseFloat(audioLevel.toFixed(3)),
              transcript: useVoiceStore.getState().transcript,
              isFinal: useVoiceStore.getState().isFinal,
              confidence: useVoiceStore.getState().confidence,
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Throttle volume telemetry to ~10Hz (100ms interval) to keep Socket.IO clean
        if (now - lastEmitTime > 100) {
          useVoiceStore.getState().updateVoiceTelemetry({ audioLevel: parseFloat(audioLevel.toFixed(3)) });
          emitVoiceTelemetry({
            status: "LISTENING",
            isListening: true,
            isSpeaking: VADActive,
            audioLevel: parseFloat(audioLevel.toFixed(3)),
            transcript: useVoiceStore.getState().transcript,
            isFinal: useVoiceStore.getState().isFinal,
            confidence: useVoiceStore.getState().confidence,
            timestamp: new Date().toISOString(),
          });
          lastEmitTime = now;
        }

        animationFrameRef.current = requestAnimationFrame(pollAudio);
      };

      animationFrameRef.current = requestAnimationFrame(pollAudio);

      // 3. Initialize Speech Recognition (webkitSpeechRecognition fallback)
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          if (sessionId !== captureSessionIdRef.current) return;

          let interimTranscript = "";
          let finalTranscript = "";
          let confidence = 1.0;
          let isFinal = false;

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
              confidence = result[0].confidence;
              isFinal = true;
            } else {
              interimTranscript += result[0].transcript;
              confidence = result[0].confidence;
            }
          }

          const activeTranscript = finalTranscript || interimTranscript;
          
          // DUPLICATE PREVENTER: Emit when the transcript changes OR when it is finalized.
          // A finalized text block must always emit to commit the segment and reset the duplicate cache.
          const isTextNew = activeTranscript !== lastTranscriptRef.current;
          if (activeTranscript.trim() && (isTextNew || isFinal)) {
            lastTranscriptRef.current = activeTranscript;

            useVoiceStore.getState().updateVoiceTelemetry({
              transcript: activeTranscript,
              isFinal: isFinal,
              confidence: parseFloat(confidence.toFixed(2)),
            });

            emitVoiceTelemetry({
              status: "LISTENING",
              isListening: true,
              isSpeaking: VADActive,
              audioLevel: parseFloat(useVoiceStore.getState().audioLevel.toFixed(3)),
              transcript: activeTranscript,
              isFinal: isFinal,
              confidence: parseFloat(confidence.toFixed(2)),
              timestamp: new Date().toISOString(),
            });

            if (isFinal) {
              lastTranscriptRef.current = "";
            }
          }
        };

        recognition.onerror = (event: any) => {
          if (sessionId !== captureSessionIdRef.current) return;
          console.error("Speech Recognition error event:", event.error);
          
          // PREVENT CRITICAL LOOPING:
          // Immediately set hasCriticalErrorRef = true and toggle hasMicOwnership = false
          // to abort restart chains and sync the UI button state.
          const criticalErrors = ["not-allowed", "service-not-allowed", "audio-capture", "aborted"];
          if (criticalErrors.includes(event.error)) {
            hasCriticalErrorRef.current = true;
            useVoiceStore.getState().setVoiceStatus("OFFLINE");
            useVoiceStore.setState({ hasMicOwnership: false, isListening: false });
            emitVoiceTelemetry({
              status: "OFFLINE",
              isListening: false,
              isSpeaking: false,
              audioLevel: 0,
              transcript: "",
              isFinal: false,
              confidence: 1.0,
              timestamp: new Date().toISOString()
            });
          }
        };

        recognition.onend = () => {
          // Restart loop only if session is active and no critical error occurred
          if (useVoiceStore.getState().hasMicOwnership && 
              !hasCriticalErrorRef.current && 
              recognitionRef.current === recognition &&
              sessionId === captureSessionIdRef.current) {
            try {
              recognition.start();
            } catch (err) {
              // Ignore restart conflicts
            }
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        console.warn("Speech Recognition not supported in this client browser.");
      }

    } catch (err) {
      console.error("Error accessing client microphone device:", err);
      useVoiceStore.getState().setVoiceStatus("OFFLINE");
      useVoiceStore.setState({ hasMicOwnership: false, isListening: false });
      emitVoiceTelemetry({
        status: "OFFLINE",
        isListening: false,
        isSpeaking: false,
        audioLevel: 0,
        transcript: "",
        isFinal: false,
        confidence: 1.0,
        timestamp: new Date().toISOString()
      });
    }
  };

  const cleanupResources = () => {
    // 1. Cancel volume analyser loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // 2. Tear down Speech Recognition
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onresult = null;
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    // 3. Close AudioContext
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }

    // 4. Release Media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const stopVoiceCapture = () => {
    // Release physical resources
    cleanupResources();

    // Reset store values
    useVoiceStore.getState().resetVoiceTelemetry();
    useVoiceStore.setState({
      hasMicOwnership: false,
      isListening: false,
      voiceStatus: "ONLINE"
    });

    // Broadcast final release event to passive clients
    emitVoiceTelemetry({
      status: "ONLINE",
      isListening: false,
      isSpeaking: false,
      audioLevel: 0,
      transcript: "",
      isFinal: false,
      confidence: 1.0,
      timestamp: new Date().toISOString()
    });
  };

  const triggerRecovery = () => {
    stopVoiceCapture();
    setTimeout(() => {
      // Recheck if ownership is still active before restarting
      if (useVoiceStore.getState().hasMicOwnership) {
        captureSessionIdRef.current += 1;
        startVoiceCapture(captureSessionIdRef.current);
      }
    }, 1000);
  };
}
