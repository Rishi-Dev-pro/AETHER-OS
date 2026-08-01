/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Test Suite: Execution Registry Integration & Multi-Domain Adapters (`execution-registry.integration.test.ts`)
 *
 * @file __tests__/execution-registry.integration.test.ts
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 2
 */

import { describe, it, expect } from "vitest";
import { ExecutionUnitType, PermissionScope, ExecutionCapability } from "../enums";
import { ExecutionRegistry } from "../execution-registry";
import type { ExecutionUnitMetadata, ExecutionUnitContract } from "../contracts";

describe("Phase 9.8 — ExecutionRegistry Integration & Multi-Domain Adapters", () => {
  const browserMetadata: ExecutionUnitMetadata = {
    unitId: "adapter.browser.v1",
    unitType: ExecutionUnitType.BROWSER,
    version: "1.0.0",
    namespacedTools: ["browser.click", "browser.type", "browser.navigate"],
    requiredPermissions: [PermissionScope.BROWSER_AUTOMATION],
    requiredCapabilities: [ExecutionCapability.CAN_CLICK, ExecutionCapability.CAN_TYPE, ExecutionCapability.CAN_NAVIGATE],
  };

  const desktopMetadata: ExecutionUnitMetadata = {
    unitId: "adapter.desktop.v1",
    unitType: ExecutionUnitType.DESKTOP,
    version: "1.0.0",
    namespacedTools: ["desktop.launch_app", "desktop.window_focus"],
    requiredPermissions: [PermissionScope.DESKTOP_AUTOMATION],
    requiredCapabilities: [ExecutionCapability.CAN_EXECUTE_CLI],
  };

  const mcpMetadata: ExecutionUnitMetadata = {
    unitId: "adapter.mcp.filesystem.v1",
    unitType: ExecutionUnitType.MCP,
    version: "1.0.0",
    namespacedTools: ["mcp.fs.read_file", "mcp.fs.write_file"],
    requiredPermissions: [PermissionScope.MCP_INVOCATION, PermissionScope.FILE_SYSTEM_READ, PermissionScope.FILE_SYSTEM_WRITE],
    requiredCapabilities: [ExecutionCapability.CAN_INVOKE_MCP, ExecutionCapability.CAN_READ_FILE, ExecutionCapability.CAN_WRITE_FILE],
  };

  const apiMetadata: ExecutionUnitMetadata = {
    unitId: "adapter.api.rest.v1",
    unitType: ExecutionUnitType.API,
    version: "1.0.0",
    namespacedTools: ["api.http_request"],
    requiredPermissions: [PermissionScope.NETWORK_ACCESS],
    requiredCapabilities: [ExecutionCapability.CAN_CALL_API],
  };

  const dummyContract: ExecutionUnitContract = {
    metadata: browserMetadata,
    isThreadSafe: true,
    isReversible: true,
  };

  it("should register multi-domain adapters and preserve metadata and contracts", () => {
    const registry = new ExecutionRegistry();

    registry.registerExecutionUnit(browserMetadata, dummyContract);
    registry.registerExecutionUnit(desktopMetadata);
    registry.registerExecutionUnit(mcpMetadata);
    registry.registerExecutionUnit(apiMetadata);

    expect(registry.listExecutionUnits().length).toBe(4);

    const browserEntry = registry.getExecutionUnit("adapter.browser.v1");
    expect(browserEntry.contract?.isThreadSafe).toBe(true);
    expect(browserEntry.metadata.namespacedTools).toContain("browser.click");

    const mcpEntry = registry.getExecutionUnit("adapter.mcp.filesystem.v1");
    expect(mcpEntry.metadata.unitType).toBe(ExecutionUnitType.MCP);
    expect(mcpEntry.metadata.requiredPermissions).toContain(PermissionScope.FILE_SYSTEM_WRITE);
  });

  it("should output deterministically ordered listings across multi-domain registrations", () => {
    const registry = new ExecutionRegistry();

    registry.registerExecutionUnit(mcpMetadata);
    registry.registerExecutionUnit(browserMetadata);
    registry.registerExecutionUnit(apiMetadata);
    registry.registerExecutionUnit(desktopMetadata);

    const list = registry.listExecutionUnits();
    const unitIds = list.map((e) => e.unitId);

    expect(unitIds).toEqual([
      "adapter.api.rest.v1",
      "adapter.browser.v1",
      "adapter.desktop.v1",
      "adapter.mcp.filesystem.v1",
    ]);
  });

  it("should preserve deep immutability when capturing snapshots before and after freeze", () => {
    const registry = new ExecutionRegistry();

    registry.registerExecutionUnit(browserMetadata);
    registry.registerExecutionUnit(mcpMetadata);

    const activeSnapshot = registry.createSnapshot();
    expect(activeSnapshot.isFrozen).toBe(false);
    expect(activeSnapshot.totalUnitsCount).toBe(2);

    registry.freezeRegistry();

    const frozenSnapshot = registry.createSnapshot();
    expect(frozenSnapshot.isFrozen).toBe(true);
    expect(frozenSnapshot.totalUnitsCount).toBe(2);

    // Assert deep freeze immutability
    expect(Object.isFrozen(frozenSnapshot)).toBe(true);
    expect(Object.isFrozen(frozenSnapshot.entries)).toBe(true);
    expect(Object.isFrozen(frozenSnapshot.entries[0].metadata)).toBe(true);
  });

  it("should prevent dynamic adapter injection once frozen for execution session", () => {
    const registry = new ExecutionRegistry();
    registry.registerExecutionUnit(browserMetadata);

    registry.freezeRegistry();

    expect(() => {
      registry.registerExecutionUnit(desktopMetadata);
    }).toThrow();

    expect(() => {
      registry.unregisterExecutionUnit("adapter.browser.v1");
    }).toThrow();

    // Verification: active registry contents remain unchanged
    expect(registry.listExecutionUnits().length).toBe(1);
    expect(registry.hasExecutionUnit("adapter.browser.v1")).toBe(true);
  });
});
