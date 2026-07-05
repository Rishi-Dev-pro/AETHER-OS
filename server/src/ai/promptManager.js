export const SYSTEM_PROMPTS = {
  DEFAULT_ASSISTANT: `You are the AetherOS central nervous assistant. Your goal is to guide the user in local tasks, visual feedback, and automation controls.`,
  VISION_DETECTOR: `Given visual detection counts, explain potential next steps or alerts.`,
};

export const buildUserContextPrompt = (user, osState) => {
  return `User: ${user.username}
Active OS state:
- Camera Enabled: ${osState.isCameraEnabled}
- Voice Control: ${osState.isVoiceListening}
- Vision Mode: ${osState.visionMode}`;
};
