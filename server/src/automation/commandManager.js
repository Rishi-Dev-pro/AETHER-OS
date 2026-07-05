import { logger } from "../utils/logger.js";
import { executeAction } from "./desktopActions.js";

class CommandManager {
  async handleCommand(voiceCommandText) {
    logger.info(`Processing automation instruction: "${voiceCommandText}"`);
    const cleanCommand = voiceCommandText.toLowerCase().trim();

    if (cleanCommand.includes("click") || cleanCommand.includes("press")) {
      return await executeAction("click_target", { label: "ui_element" });
    }
    if (cleanCommand.includes("type") || cleanCommand.includes("write")) {
      return await executeAction("type_text", { text: "AetherOS Input" });
    }

    return {
      success: false,
      message: `Command action matches no triggers: "${voiceCommandText}"`,
    };
  }
}

export const commandManager = new CommandManager();
