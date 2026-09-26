// ── Mock Data ──────────────────────────────────────────────────
// All data is simulated. No connections to any backend.

export const MOCK_SYSTEM = {
  osVersion: "4.2.0",
  uptime: 14523, // seconds
  cpu: 34,
  memory: 62,
  temperature: 42,
  network: { up: true, latency: 12, bandwidth: 847 },
  processes: 284,
  threads: 1847,
};

export const MOCK_VISION = {
  mode: "NEURAL" as const,
  fps: 60,
  faces: 2,
  hands: 1,
  objects: 7,
  emotions: ["Focus", "Curiosity"],
  primaryFace: {
    blink: false,
    smile: 0.72,
    looking: "forward",
    headYaw: -3,
    headPitch: 2,
    headRoll: 0,
    eyeOpenness: { left: 0.94, right: 0.91 },
  },
  pipeline: [
    { stage: "Capture", ms: 4.2 },
    { stage: "Detect", ms: 8.7 },
    { stage: "Mesh", ms: 12.1 },
    { stage: "Encode", ms: 3.8 },
    { stage: "Transmit", ms: 2.1 },
    { stage: "Parse", ms: 1.4 },
    { stage: "Render", ms: 6.3 },
  ],
};

export const MOCK_STATS = {
  fps: 58,
  latency: 12,
  cpu: 34,
  memory: 62,
  gpu: 48,
  disk: 21,
  networkIn: 2.4,
  networkOut: 1.1,
  threads: 1847,
  handles: 42103,
};

export const MOCK_CONVERSATION = {
  provider: "Groq",
  model: "Llama 3.3 70B",
  totalTokens: 24831,
  cost: 0.00342,
  latency: 89,
  messages: [
    {
      id: 1,
      role: "user" as const,
      content: "Analyze the current scene and identify all human subjects.",
      timestamp: Date.now() - 30000,
    },
    {
      id: 2,
      role: "assistant" as const,
      content:
        "Scanning viewport — detected 2 human subjects. Subject A: frontal view, neutral expression, eye contact confirmed. Subject B: profile view, 45° rotation, appears to be gesturing. Both subjects are within optimal recognition range. Confidence: 97.3%.",
      timestamp: Date.now() - 28000,
    },
    {
      id: 3,
      role: "user" as const,
      content: "What are they doing?",
      timestamp: Date.now() - 15000,
    },
    {
      id: 4,
      role: "assistant" as const,
      content:
        "Based on gesture analysis and spatial positioning: Subject A appears stationary, possibly engaged in observation. Subject B is performing a pointing gesture directed toward a spatial reference outside the viewport. Motion trajectory suggests active communication. Estimated intent: collaborative task coordination.",
      timestamp: Date.now() - 12000,
    },
  ],
};

export const MOCK_EVENTS = [
  { id: 1, type: "SUCCESS" as const, text: "Camera sensor initialized", time: "14:32:01" },
  { id: 2, type: "INFO" as const, text: "Neural vision pipeline active", time: "14:32:01" },
  { id: 3, type: "SUCCESS" as const, text: "Voice core online — listening", time: "14:32:03" },
  { id: 4, type: "INFO" as const, text: "Provider: Groq LPU Cloud connected", time: "14:32:04" },
  { id: 5, type: "WARN" as const, text: "High memory allocation on thread pool", time: "14:32:12" },
  { id: 6, type: "SUCCESS" as const, text: "Face mesh lock acquired — 2 subjects", time: "14:32:15" },
  { id: 7, type: "INFO" as const, text: "Hand tracking: 1 skeleton detected", time: "14:32:18" },
  { id: 8, type: "SUCCESS" as const, text: "Object detection: 7 items classified", time: "14:32:20" },
  { id: 9, type: "AI" as const, text: "Generating scene analysis response", time: "14:32:22" },
  { id: 10, type: "INFO" as const, text: "Stream completed — 847 tokens", time: "14:32:25" },
];

export const MOCK_PROVIDERS = [
  { name: "Groq", model: "Llama 3.3 70B", status: "active" as const, latency: 89, tokens: 12400 },
  { name: "OpenAI", model: "GPT-4o", status: "standby" as const, latency: 145, tokens: 0 },
  { name: "Ollama", model: "Mistral 7B", status: "standby" as const, latency: 210, tokens: 0 },
  { name: "NVIDIA", model: "Llama 3.1 405B", status: "error" as const, latency: 0, tokens: 0 },
];
