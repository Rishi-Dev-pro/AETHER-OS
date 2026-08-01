/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Test Suite: Adapter Contracts & Provider Independence (`adapter-contracts.test.ts`)
 *
 * @file __tests__/adapter-contracts.test.ts
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 3
 */

import { describe, it, expect } from "vitest";
import { ExecutionUnitType, PermissionScope, ExecutionCapability } from "../enums";
import type {
  ExecutionAdapter,
  BrowserExecutionAdapter,
  DesktopExecutionAdapter,
  ApiExecutionAdapter,
  McpExecutionAdapter,
  PluginExecutionAdapter,
  LocalExecutionAdapter,
} from "../adapter-contracts";

describe("Phase 9.8 — Adapter Contracts & Provider Independence", () => {
  it("should conform to BrowserExecutionAdapter interface definition", () => {
    const browserAdapter: BrowserExecutionAdapter = {
      unitId: "adapter.browser.playwright",
      unitType: ExecutionUnitType.BROWSER,
      version: "1.0.0",
      metadata: {
        unitId: "adapter.browser.playwright",
        unitType: ExecutionUnitType.BROWSER,
        version: "1.0.0",
        namespacedTools: ["browser.click", "browser.navigate"],
        requiredPermissions: [PermissionScope.BROWSER_AUTOMATION],
        requiredCapabilities: [ExecutionCapability.CAN_CLICK, ExecutionCapability.CAN_NAVIGATE],
      },
      contract: {
        metadata: {
          unitId: "adapter.browser.playwright",
          unitType: ExecutionUnitType.BROWSER,
          version: "1.0.0",
          namespacedTools: ["browser.click", "browser.navigate"],
          requiredPermissions: [PermissionScope.BROWSER_AUTOMATION],
          requiredCapabilities: [ExecutionCapability.CAN_CLICK, ExecutionCapability.CAN_NAVIGATE],
        },
        isThreadSafe: true,
        isReversible: true,
      },
      supportedTools: ["browser.click", "browser.navigate"],
      browserCapabilities: [ExecutionCapability.CAN_CLICK, ExecutionCapability.CAN_NAVIGATE],
      supportsHeadless: true,
      supportedBrowserDrivers: ["chromium", "firefox", "webkit"],
      isSupportedInEnvironment: (env) => env.isHeadless && env.platform !== "unknown",
    };

    expect(browserAdapter.unitType).toBe(ExecutionUnitType.BROWSER);
    expect(browserAdapter.supportsHeadless).toBe(true);
    expect(browserAdapter.isSupportedInEnvironment({ platform: "windows", isHeadless: true, activeCapabilities: [], availablePermissions: [] })).toBe(true);
  });

  it("should conform to DesktopExecutionAdapter interface definition", () => {
    const desktopAdapter: DesktopExecutionAdapter = {
      unitId: "adapter.desktop.accessibility",
      unitType: ExecutionUnitType.DESKTOP,
      version: "1.0.0",
      metadata: {
        unitId: "adapter.desktop.accessibility",
        unitType: ExecutionUnitType.DESKTOP,
        version: "1.0.0",
        namespacedTools: ["desktop.launch_app"],
        requiredPermissions: [PermissionScope.DESKTOP_AUTOMATION],
        requiredCapabilities: [ExecutionCapability.CAN_EXECUTE_CLI],
      },
      contract: {
        metadata: {
          unitId: "adapter.desktop.accessibility",
          unitType: ExecutionUnitType.DESKTOP,
          version: "1.0.0",
          namespacedTools: ["desktop.launch_app"],
          requiredPermissions: [PermissionScope.DESKTOP_AUTOMATION],
          requiredCapabilities: [ExecutionCapability.CAN_EXECUTE_CLI],
        },
        isThreadSafe: false,
        isReversible: false,
      },
      supportedTools: ["desktop.launch_app"],
      supportedOsPlatforms: ["win32", "darwin", "linux"],
      requiresAccessibilityPermissions: true,
      isSupportedInEnvironment: (env) => env.platform === "windows" || env.platform === "darwin",
    };

    expect(desktopAdapter.unitType).toBe(ExecutionUnitType.DESKTOP);
    expect(desktopAdapter.supportedOsPlatforms).toContain("win32");
  });

  it("should conform to McpExecutionAdapter interface definition", () => {
    const mcpAdapter: McpExecutionAdapter = {
      unitId: "adapter.mcp.fs",
      unitType: ExecutionUnitType.MCP,
      version: "1.0.0",
      metadata: {
        unitId: "adapter.mcp.fs",
        unitType: ExecutionUnitType.MCP,
        version: "1.0.0",
        namespacedTools: ["mcp.fs.read_file"],
        requiredPermissions: [PermissionScope.MCP_INVOCATION, PermissionScope.FILE_SYSTEM_READ],
        requiredCapabilities: [ExecutionCapability.CAN_INVOKE_MCP, ExecutionCapability.CAN_READ_FILE],
      },
      contract: {
        metadata: {
          unitId: "adapter.mcp.fs",
          unitType: ExecutionUnitType.MCP,
          version: "1.0.0",
          namespacedTools: ["mcp.fs.read_file"],
          requiredPermissions: [PermissionScope.MCP_INVOCATION, PermissionScope.FILE_SYSTEM_READ],
          requiredCapabilities: [ExecutionCapability.CAN_INVOKE_MCP, ExecutionCapability.CAN_READ_FILE],
        },
        isThreadSafe: true,
        isReversible: false,
      },
      supportedTools: ["mcp.fs.read_file"],
      mcpServerId: "filesystem_server_v1",
      supportedMethods: ["tools/call", "resources/read"],
      jsonRpcVersion: "2.0",
      isSupportedInEnvironment: () => true,
    };

    expect(mcpAdapter.unitType).toBe(ExecutionUnitType.MCP);
    expect(mcpAdapter.mcpServerId).toBe("filesystem_server_v1");
  });
});
