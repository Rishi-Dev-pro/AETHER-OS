/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Test Suite: Execution Registry Unit Tests (`execution-registry.test.ts`)
 *
 * @file __tests__/execution-registry.test.ts
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 2
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ExecutionUnitType, PermissionScope, ExecutionCapability } from "../enums";
import {
  DuplicateExecutionUnitError,
  ExecutionUnitNotFoundError,
  RegistryAlreadyFrozenError,
  RegistryRegistrationError,
} from "../registry-errors";
import { ExecutionRegistry } from "../execution-registry";
import type { ExecutionUnitMetadata } from "../contracts";

describe("Phase 9.8 — ExecutionRegistry Unit Tests", () => {
  let registry: ExecutionRegistry;

  const createMockUnitMetadata = (
    unitId: string,
    unitType: ExecutionUnitType = ExecutionUnitType.BROWSER,
    tools: readonly string[] = ["tool.action"]
  ): ExecutionUnitMetadata => ({
    unitId,
    unitType,
    version: "1.0.0",
    namespacedTools: tools,
    requiredPermissions: [PermissionScope.BROWSER_AUTOMATION],
    requiredCapabilities: [ExecutionCapability.CAN_CLICK],
  });

  beforeEach(() => {
    registry = new ExecutionRegistry();
  });

  it("should successfully register an execution unit and retrieve it", () => {
    const metadata = createMockUnitMetadata("browser_adapter");
    const entry = registry.registerExecutionUnit(metadata);

    expect(entry.unitId).toBe("browser_adapter");
    expect(entry.metadata.unitType).toBe(ExecutionUnitType.BROWSER);
    expect(registry.hasExecutionUnit("browser_adapter")).toBe(true);

    const retrieved = registry.getExecutionUnit("browser_adapter");
    expect(retrieved.unitId).toBe("browser_adapter");
    expect(Object.isFrozen(retrieved)).toBe(true);
    expect(Object.isFrozen(retrieved.metadata)).toBe(true);
  });

  it("should throw DuplicateExecutionUnitError when registering duplicate unitId", () => {
    const metadata = createMockUnitMetadata("browser_adapter");
    registry.registerExecutionUnit(metadata);

    expect(() => registry.registerExecutionUnit(metadata)).toThrow(DuplicateExecutionUnitError);
  });

  it("should allow overwriting duplicate unitId when allowOverwrite option is true", () => {
    const metadata1 = createMockUnitMetadata("browser_adapter", ExecutionUnitType.BROWSER);
    const metadata2 = createMockUnitMetadata("browser_adapter", ExecutionUnitType.DESKTOP);

    registry.registerExecutionUnit(metadata1);
    const updatedEntry = registry.registerExecutionUnit(metadata2, undefined, { allowOverwrite: true });

    expect(updatedEntry.metadata.unitType).toBe(ExecutionUnitType.DESKTOP);
    expect(registry.getExecutionUnit("browser_adapter").metadata.unitType).toBe(ExecutionUnitType.DESKTOP);
  });

  it("should throw ExecutionUnitNotFoundError for unregistered unitId", () => {
    expect(() => registry.getExecutionUnit("non_existent")).toThrow(ExecutionUnitNotFoundError);
  });

  it("should safely lookup units via lookupExecutionUnit() without throwing", () => {
    const notFound = registry.lookupExecutionUnit("non_existent");
    expect(notFound.found).toBe(false);
    expect(notFound.entry).toBeUndefined();

    registry.registerExecutionUnit(createMockUnitMetadata("unit_01"));
    const found = registry.lookupExecutionUnit("unit_01");
    expect(found.found).toBe(true);
    expect(found.entry?.unitId).toBe("unit_01");
  });

  it("should unregister an execution unit successfully", () => {
    registry.registerExecutionUnit(createMockUnitMetadata("unit_01"));
    expect(registry.hasExecutionUnit("unit_01")).toBe(true);

    const removed = registry.unregisterExecutionUnit("unit_01");
    expect(removed).toBe(true);
    expect(registry.hasExecutionUnit("unit_01")).toBe(false);
  });

  it("should list registered units in deterministic alphabetical order by unitId", () => {
    registry.registerExecutionUnit(createMockUnitMetadata("z_unit"));
    registry.registerExecutionUnit(createMockUnitMetadata("a_unit"));
    registry.registerExecutionUnit(createMockUnitMetadata("m_unit"));

    const list = registry.listExecutionUnits();
    expect(list.length).toBe(3);
    expect(list[0].unitId).toBe("a_unit");
    expect(list[1].unitId).toBe("m_unit");
    expect(list[2].unitId).toBe("z_unit");
  });

  it("should enforce the Registry Freeze Rule", () => {
    registry.registerExecutionUnit(createMockUnitMetadata("unit_01"));
    expect(registry.isRegistryFrozen()).toBe(false);

    registry.freezeRegistry();
    expect(registry.isRegistryFrozen()).toBe(true);

    expect(() => registry.registerExecutionUnit(createMockUnitMetadata("unit_02"))).toThrow(
      RegistryAlreadyFrozenError
    );

    expect(() => registry.unregisterExecutionUnit("unit_01")).toThrow(RegistryAlreadyFrozenError);

    expect(() => registry.clear()).toThrow(RegistryAlreadyFrozenError);
  });

  it("should reject invalid unit metadata registration", () => {
    const invalidMetadata = {
      unitId: "",
      unitType: ExecutionUnitType.BROWSER,
      version: "1.0.0",
      namespacedTools: [],
      requiredPermissions: [],
      requiredCapabilities: [],
    } as any;

    expect(() => registry.registerExecutionUnit(invalidMetadata)).toThrow(RegistryRegistrationError);
  });

  it("should create immutable registry snapshots", () => {
    registry.registerExecutionUnit(createMockUnitMetadata("unit_01"));
    const snapshot = registry.createSnapshot();

    expect(snapshot.totalUnitsCount).toBe(1);
    expect(snapshot.entries[0].unitId).toBe("unit_01");
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.entries)).toBe(true);
  });

  it("should return accurate registry statistics", () => {
    registry.registerExecutionUnit(createMockUnitMetadata("unit_01", ExecutionUnitType.BROWSER));
    registry.registerExecutionUnit(createMockUnitMetadata("unit_02", ExecutionUnitType.BROWSER));
    registry.registerExecutionUnit(createMockUnitMetadata("unit_03", ExecutionUnitType.MCP));

    const stats = registry.getStatistics();
    expect(stats.totalRegisteredUnits).toBe(3);
    expect(stats.unitTypesCount[ExecutionUnitType.BROWSER]).toBe(2);
    expect(stats.unitTypesCount[ExecutionUnitType.MCP]).toBe(1);
    expect(Object.isFrozen(stats)).toBe(true);
  });
});
