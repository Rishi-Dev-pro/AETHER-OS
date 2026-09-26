/**
 * AETHER OS — Phase 10: AI Desktop Task Automation
 * Application Registry & Alias Resolver
 *
 * @file appRegistry.js
 * @description Central catalog mapping application names, common voice aliases,
 * and executable targets or Windows URI schemes for native application launching.
 */

export const APPLICATION_CATALOG = {
  vscode: {
    id: "vscode",
    displayName: "Visual Studio Code",
    aliases: ["vs code", "visual studio code", "code", "editor", "vsc"],
    type: "exec",
    target: "code",
    fallback: "cmd /c start \"\" code",
  },
  chrome: {
    id: "chrome",
    displayName: "Google Chrome",
    aliases: ["chrome", "google chrome", "browser", "web browser"],
    type: "exec",
    target: "chrome",
    fallback: "cmd /c start \"\" chrome",
  },
  spotify: {
    id: "spotify",
    displayName: "Spotify",
    aliases: ["spotify", "music", "music player"],
    type: "uri",
    target: "spotify:",
  },
  notepad: {
    id: "notepad",
    displayName: "Notepad",
    aliases: ["notepad", "notes", "text editor"],
    type: "exec",
    target: "notepad",
  },
  calculator: {
    id: "calculator",
    displayName: "Calculator",
    aliases: ["calc", "calculator", "math"],
    type: "exec",
    target: "calc",
  },
  terminal: {
    id: "terminal",
    displayName: "Windows Terminal",
    aliases: ["terminal", "powershell", "cmd", "command prompt", "wt", "console"],
    type: "exec",
    target: "wt",
    fallbackTarget: "powershell",
  },
  explorer: {
    id: "explorer",
    displayName: "File Explorer",
    aliases: ["explorer", "file explorer", "files", "my computer", "folder"],
    type: "exec",
    target: "explorer",
  },
  settings: {
    id: "settings",
    displayName: "Windows Settings",
    aliases: ["settings", "windows settings", "preferences", "control panel"],
    type: "uri",
    target: "ms-settings:",
  },
  discord: {
    id: "discord",
    displayName: "Discord",
    aliases: ["discord"],
    type: "uri",
    target: "discord:",
  },
  slack: {
    id: "slack",
    displayName: "Slack",
    aliases: ["slack"],
    type: "uri",
    target: "slack:",
  },
  paint: {
    id: "paint",
    displayName: "Paint",
    aliases: ["paint", "mspaint", "draw"],
    type: "exec",
    target: "mspaint",
  },
  taskmanager: {
    id: "taskmanager",
    displayName: "Task Manager",
    aliases: ["task manager", "taskmgr", "activity monitor"],
    type: "exec",
    target: "taskmgr",
  },
};

/**
 * Resolves an application identifier or user voice query to a registered entry.
 * @param {string} input - The application name or alias (e.g. "vs code", "chrome")
 * @returns {object|null}
 */
export function resolveApplication(input) {
  if (!input || typeof input !== "string") return null;

  const normalized = input.toLowerCase().trim();

  // 1. Direct ID match
  if (APPLICATION_CATALOG[normalized]) {
    return APPLICATION_CATALOG[normalized];
  }

  // 2. Alias match
  for (const app of Object.values(APPLICATION_CATALOG)) {
    if (app.aliases.includes(normalized)) {
      return app;
    }
  }

  // 3. Whole-word / phrase match (prevent arbitrary substring false positives)
  for (const app of Object.values(APPLICATION_CATALOG)) {
    for (const alias of app.aliases) {
      const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const wordBoundaryRegex = new RegExp(`(^|\\s)${escapedAlias}(\\s|$)`, "i");
      if (wordBoundaryRegex.test(normalized)) {
        return app;
      }
    }
  }

  return null;
}

/**
 * Returns an array of registered applications with their primary aliases for LLM prompting.
 * @returns {Array<{ id: string, name: string, aliases: string[] }>}
 */
export function getRegisteredApplicationsList() {
  return Object.values(APPLICATION_CATALOG).map((app) => ({
    id: app.id,
    name: app.displayName,
    aliases: app.aliases,
  }));
}
