/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Provider-Independent Execution Adapter Contracts (`adapter-contracts.ts`)
 *
 * @file adapter-contracts.ts
 * @description Pure structural interface declarations for execution domain adapters
 * (Browser, Desktop, API, MCP, Plugin, Local OS). Contains ZERO execution code, driver imports,
 * or side effects.
 *
 * @module @aether/action-execution/adapter-contracts
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 3
 */

import type { ExecutionUnitType, ExecutionCapability } from "./enums";
import type { ExecutionUnitMetadata, ExecutionUnitContract } from "./contracts";
import type { ExecutionEnvironment } from "./resolver-types";

/**
 * Base provider-independent contract for all Execution Unit adapters.
 */
export interface ExecutionAdapter {
  readonly unitId: string;
  readonly unitType: ExecutionUnitType;
  readonly version: string;
  readonly metadata: Readonly<ExecutionUnitMetadata>;
  readonly contract: Readonly<ExecutionUnitContract>;
  readonly supportedTools: readonly string[];
  
  /**
   * Pure contract method signature for environment support validation.
   */
  isSupportedInEnvironment(environment: Readonly<ExecutionEnvironment>): boolean;
}

/**
 * Adapter contract specification for Browser Automation execution domains.
 */
export interface BrowserExecutionAdapter extends ExecutionAdapter {
  readonly unitType: ExecutionUnitType.BROWSER;
  readonly browserCapabilities: readonly ExecutionCapability[];
  readonly supportsHeadless: boolean;
  readonly supportedBrowserDrivers: readonly string[];
}

/**
 * Adapter contract specification for Desktop Automation execution domains.
 */
export interface DesktopExecutionAdapter extends ExecutionAdapter {
  readonly unitType: ExecutionUnitType.DESKTOP;
  readonly supportedOsPlatforms: readonly string[];
  readonly requiresAccessibilityPermissions: boolean;
}

/**
 * Adapter contract specification for API HTTP/gRPC tool execution domains.
 */
export interface ApiExecutionAdapter extends ExecutionAdapter {
  readonly unitType: ExecutionUnitType.API;
  readonly supportedProtocols: readonly ("REST" | "GRPC" | "WEBSOCKET")[];
  readonly domainAllowlist?: readonly string[];
}

/**
 * Adapter contract specification for Model Context Protocol (MCP) server domains.
 */
export interface McpExecutionAdapter extends ExecutionAdapter {
  readonly unitType: ExecutionUnitType.MCP;
  readonly mcpServerId: string;
  readonly supportedMethods: readonly string[];
  readonly jsonRpcVersion: string;
}

/**
 * Adapter contract specification for Third-Party Extension / Plugin domains.
 */
export interface PluginExecutionAdapter extends ExecutionAdapter {
  readonly unitType: ExecutionUnitType.PLUGIN;
  readonly pluginId: string;
  readonly sandboxIsolationLevel: "WORKER_THREAD" | "PROCESS_SANDBOX" | "CONTAINER";
}

/**
 * Adapter contract specification for Local OS utility execution domains.
 */
export interface LocalExecutionAdapter extends ExecutionAdapter {
  readonly unitType: ExecutionUnitType.LOCAL_OS;
  readonly workspaceRootOnly: boolean;
  readonly allowedCommands: readonly string[];
}
