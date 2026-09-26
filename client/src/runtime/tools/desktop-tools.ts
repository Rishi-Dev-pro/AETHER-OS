/**
 * AETHER OS — Phase 10: AI Desktop Task Automation
 * Milestone 4 Component: Desktop Tools Schema & Execution (`desktop-tools.ts`)
 *
 * @file desktop-tools.ts
 * @description Canonical OpenAI/provider-neutral tool definitions and executor
 * for native Windows desktop automation actions via desktopActionDispatcher.
 *
 * @module @aether/runtime/tools/desktop-tools
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 10 MILESTONE 4
 */

import { desktopActionDispatcher } from "../../services/desktopActionDispatcher";
import type { DesktopActionResult, DesktopActionType } from "../../types/desktopAction";
import type { ToolCallDescriptor } from "../../types/provider-adapters/message-types";

/**
 * OpenAI-compatible function definition contract.
 */
export interface DesktopToolDefinition {
  readonly type: "function";
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: {
      readonly type: "object";
      readonly properties: Record<string, unknown>;
      readonly required?: readonly string[];
    };
  };
}

/**
 * Canonical tool definitions for AETHER OS desktop automation.
 */
export const DESKTOP_TOOLS: readonly DesktopToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "open_app",
      description:
        "Opens an installed desktop application, browser, utility, or game on the user's Windows computer.",
      parameters: {
        type: "object",
        properties: {
          app: {
            type: "string",
            description:
              "Name, alias, or executable of the application to launch (e.g. 'vscode', 'chrome', 'spotify', 'notepad', 'calculator', 'terminal', 'explorer', 'discord').",
          },
        },
        required: ["app"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "close_app",
      description:
        "Gracefully closes or terminates a running desktop application, process, or window.",
      parameters: {
        type: "object",
        properties: {
          app: {
            type: "string",
            description:
              "Name, alias, or process name of the application to close (e.g. 'notepad', 'chrome', 'spotify', 'calculator').",
          },
        },
        required: ["app"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description:
        "Searches the web for a query using the user's default web browser or a specified search engine.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query string (e.g. 'latest quantum computing news').",
          },
          engine: {
            type: "string",
            enum: ["google", "bing", "duckduckgo", "youtube"],
            description: "Optional search engine to query (defaults to Google).",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "open_url",
      description: "Opens a specific web address or website URL in the user's default browser.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The full destination web URL (e.g. 'https://github.com' or 'https://youtube.com').",
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adjust_volume",
      description:
        "Adjusts master audio volume on Windows. Can step up or down, or set an exact volume percentage.",
      parameters: {
        type: "object",
        properties: {
          direction: {
            type: "string",
            enum: ["up", "down"],
            description: "Direction to step volume ('up' to increase, 'down' to decrease).",
          },
          steps: {
            type: "integer",
            description: "Number of steps to change volume (default is 2).",
          },
          level: {
            type: "integer",
            description: "Target volume level percentage between 0 and 100.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mute_volume",
      description: "Mutes the master Windows system audio output.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "unmute_volume",
      description: "Unmutes the master Windows system audio output.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lock_screen",
      description: "Immediately locks the user's Windows workstation session.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "take_screenshot",
      description: "Captures a full screenshot of the primary display monitor and saves it to disk.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_system_info",
      description:
        "Retrieves Windows system diagnostic information including platform, architecture, hostname, total memory, free memory, and system uptime.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

/**
 * Returns a cloned array of tool definitions for inclusion in TranslationRequest.
 */
export function getDesktopToolDefinitions(): ReadonlyArray<Readonly<Record<string, unknown>>> {
  return DESKTOP_TOOLS as unknown as ReadonlyArray<Readonly<Record<string, unknown>>>;
}

/**
 * Safely parses tool arguments from string or object form.
 */
function parseToolArguments(rawArgs: Readonly<Record<string, unknown>> | string): Record<string, unknown> {
  if (typeof rawArgs === "string") {
    try {
      const parsed = JSON.parse(rawArgs);
      return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return rawArgs ? { ...rawArgs } : {};
}

/**
 * Executes a ToolCallDescriptor invoked by the LLM by translating it to a desktopActionDispatcher call.
 *
 * @param toolCall Canonical ToolCallDescriptor from AssistantMessage
 * @returns Result object containing status, message, and serialized output for ToolMessage
 */
export async function executeDesktopTool(
  toolCall: ToolCallDescriptor
): Promise<{ success: boolean; content: string; result: DesktopActionResult }> {
  const { name, arguments: rawArgs } = toolCall;
  const args = parseToolArguments(rawArgs);

  let actionType: DesktopActionType;
  let target: string | undefined;
  let params: Record<string, unknown> = {};

  switch (name) {
    case "open_app": {
      const appName = String(args.app || args.target || args.name || "").trim();
      actionType = "open_app";
      target = appName;
      params = { target: appName, app: appName };
      break;
    }

    case "close_app": {
      const appName = String(args.app || args.target || args.name || "").trim();
      actionType = "close_app";
      target = appName;
      params = { target: appName, app: appName };
      break;
    }

    case "search_web": {
      const query = String(args.query || args.target || "").trim();
      const engine = typeof args.engine === "string" ? args.engine.trim() : undefined;
      actionType = "search_web";
      target = query;
      params = { query, ...(engine ? { engine } : {}) };
      break;
    }

    case "open_url": {
      const url = String(args.url || args.target || "").trim();
      actionType = "open_url";
      target = url;
      params = { url };
      break;
    }

    case "adjust_volume": {
      actionType = "adjust_volume";
      const direction = args.direction === "up" || args.direction === "down" ? args.direction : undefined;
      const steps = typeof args.steps === "number" ? Math.max(1, Math.min(20, Math.round(args.steps))) : undefined;
      const level = typeof args.level === "number" ? Math.max(0, Math.min(100, Math.round(args.level))) : undefined;
      params = {
        ...(direction ? { direction } : {}),
        ...(steps !== undefined ? { steps } : {}),
        ...(level !== undefined ? { level } : {}),
      };
      break;
    }

    case "mute_volume": {
      actionType = "mute_volume";
      break;
    }

    case "unmute_volume": {
      actionType = "unmute_volume";
      break;
    }

    case "lock_screen":
    case "lock_workstation": {
      actionType = "lock_workstation";
      break;
    }

    case "take_screenshot": {
      actionType = "take_screenshot";
      break;
    }

    case "get_system_info": {
      actionType = "get_system_info";
      break;
    }

    default: {
      const errorMsg = `Unsupported tool call: '${name}'`;
      const fallbackResult: DesktopActionResult = {
        actionId: `err_${Date.now()}`,
        type: name as DesktopActionType,
        success: false,
        message: errorMsg,
        durationMs: 0,
        timestamp: Date.now(),
        error: errorMsg,
      };
      return {
        success: false,
        content: JSON.stringify({ success: false, error: errorMsg }),
        result: fallbackResult,
      };
    }
  }

  try {
    const actionResult = await desktopActionDispatcher.dispatch({
      type: actionType,
      target,
      params,
      source: "llm_tool",
    });

    const responseContent = JSON.stringify({
      success: actionResult.success,
      action: actionType,
      message: actionResult.message,
      ...(actionResult.data ? { data: actionResult.data } : {}),
      ...(actionResult.error ? { error: actionResult.error } : {}),
    });

    return {
      success: actionResult.success,
      content: responseContent,
      result: actionResult,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Tool dispatch error";
    const failureResult: DesktopActionResult = {
      actionId: `err_${Date.now()}`,
      type: actionType,
      success: false,
      message: errorMsg,
      durationMs: 0,
      timestamp: Date.now(),
      error: errorMsg,
    };
    return {
      success: false,
      content: JSON.stringify({ success: false, error: errorMsg }),
      result: failureResult,
    };
  }
}

/**
 * Returns formatted tool-use instructions for native Windows desktop tools.
 */
export function getDesktopAutomationInstructions(): string {
  return (
    "AETHER OS Desktop Automation Active.\n" +
    "You have direct access to native Windows automation tools:\n" +
    "- open_app(app): Launch desktop applications, browsers, utilities, or games.\n" +
    "- close_app(app): Gracefully close or terminate running applications/processes.\n" +
    "- search_web(query, engine): Search the web via default browser (google, bing, duckduckgo, youtube).\n" +
    "- open_url(url): Navigate to a specific URL in the browser.\n" +
    "- adjust_volume(direction, steps, level): Adjust master system audio.\n" +
    "- mute_volume(), unmute_volume(): Mute/unmute master audio.\n" +
    "- lock_screen(): Lock the Windows workstation session.\n" +
    "- take_screenshot(): Capture a full desktop screenshot.\n" +
    "- get_system_info(): Retrieve diagnostic hardware & OS metrics.\n\n" +
    "Registered Applications: VS Code, Google Chrome, Spotify, Notepad, Calculator, Windows Terminal, File Explorer, Discord, Slack, Steam, Microsoft Edge, Task Manager, PowerShell, Settings.\n" +
    "When the user requests opening, closing, searching, volume adjusting, or system control, invoke the appropriate desktop tool directly."
  );
}
