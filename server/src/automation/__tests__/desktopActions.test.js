/**
 * AETHER OS — Phase 10: Milestone 1 Verification Test
 * Desktop Actions & Security Sandboxing Unit Tests
 *
 * @file desktopActions.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assertSafeText,
  assertSafeUrl,
  assertSafeQuery,
  SecurityValidationError,
} from "../securityValidator.js";
import { resolveApplication, getRegisteredApplicationsList } from "../appRegistry.js";
import { getSystemInfo } from "../systemControls.js";
import { executeAction } from "../desktopActions.js";

describe("Phase 10 M1: Security Validator", () => {
  it("allows safe text and trims whitespace", () => {
    const result = assertSafeText("  Visual Studio Code  ");
    assert.equal(result, "Visual Studio Code");
  });

  it("throws on empty or non-string input", () => {
    assert.throws(() => assertSafeText(""), SecurityValidationError);
    assert.throws(() => assertSafeText("   "), SecurityValidationError);
  });

  it("blocks shell metacharacters (&, ;, |, >, <, `, %, ^, (, ), \")", () => {
    assert.throws(() => assertSafeText("calc & notepad"), SecurityValidationError);
    assert.throws(() => assertSafeText("code; rm -rf"), SecurityValidationError);
    assert.throws(() => assertSafeText("echo `whoami`"), SecurityValidationError);
    assert.throws(() => assertSafeText("calc | echo evil"), SecurityValidationError);
    assert.throws(() => assertSafeText("%TEMP%"), SecurityValidationError);
    assert.throws(() => assertSafeText("calc^"), SecurityValidationError);
    assert.throws(() => assertSafeText("calc(1)"), SecurityValidationError);
    assert.throws(() => assertSafeText('calc"'), SecurityValidationError);
  });

  it("blocks forbidden destructive keywords", () => {
    assert.throws(() => assertSafeText("format c:"), SecurityValidationError);
    assert.throws(() => assertSafeText("del /f *"), SecurityValidationError);
    assert.throws(() => assertSafeText("powershell -enc AAAA"), SecurityValidationError);
  });

  it("validates allowed URL schemes and rejects dangerous ones", () => {
    assert.equal(assertSafeUrl("https://google.com"), "https://google.com/");
    assert.equal(assertSafeUrl("spotify:track:123"), "spotify:track:123");
    assert.equal(assertSafeUrl("ms-settings:appsfeatures"), "ms-settings:appsfeatures");

    // Rejected schemes and characters
    assert.throws(() => assertSafeUrl("javascript:alert(1)"), SecurityValidationError);
    assert.throws(() => assertSafeUrl("file:///C:/Windows/System32"), SecurityValidationError);
    assert.throws(() => assertSafeUrl('https://google.com"'), SecurityValidationError);
    assert.throws(() => assertSafeUrl("https://google.com;calc"), SecurityValidationError);
    assert.throws(() => assertSafeUrl("not-a-valid-url"), SecurityValidationError);
  });

  it("validates search query lengths and content", () => {
    assert.equal(assertSafeQuery("react 19 tutorial"), "react 19 tutorial");
    assert.throws(() => assertSafeQuery("a".repeat(301)), SecurityValidationError);
  });
});

describe("Phase 10 M1: Application Registry", () => {
  it("resolves canonical IDs", () => {
    const app = resolveApplication("vscode");
    assert.ok(app);
    assert.equal(app.id, "vscode");
    assert.equal(app.target, "code");
  });

  it("resolves common voice aliases", () => {
    assert.equal(resolveApplication("vs code")?.id, "vscode");
    assert.equal(resolveApplication("visual studio code")?.id, "vscode");
    assert.equal(resolveApplication("google chrome")?.id, "chrome");
    assert.equal(resolveApplication("browser")?.id, "chrome");
    assert.equal(resolveApplication("music")?.id, "spotify");
    assert.equal(resolveApplication("calc")?.id, "calculator");
    assert.equal(resolveApplication("control panel")?.id, "settings");
  });

  it("does not match arbitrary single letters or partial substrings", () => {
    assert.equal(resolveApplication("c"), null);
    assert.equal(resolveApplication("not"), null);
    assert.equal(resolveApplication("edit"), null);
  });

  it("resolves full phrase queries via word boundary", () => {
    assert.equal(resolveApplication("please open vs code")?.id, "vscode");
    assert.equal(resolveApplication("launch spotify now")?.id, "spotify");
  });

  it("returns null for unknown applications", () => {
    assert.equal(resolveApplication("unknown_nonexistent_program_xyz"), null);
  });

  it("exports application list for LLM prompting", () => {
    const list = getRegisteredApplicationsList();
    assert.ok(Array.isArray(list));
    assert.ok(list.length >= 10);
    assert.ok(list.some((item) => item.id === "vscode"));
  });
});

describe("Phase 10 M1: System Controls & Telemetry", () => {
  it("collects hardware and OS telemetry using stdlib", () => {
    const info = getSystemInfo();
    assert.ok(info.platform);
    assert.ok(info.cpus > 0);
    assert.ok(info.totalMemoryMb > 0);
    assert.ok(info.freeMemoryMb > 0);
    assert.ok(info.memoryUsagePercent >= 0 && info.memoryUsagePercent <= 100);
  });
});

describe("Phase 10 M1: Unified Action Dispatcher", () => {
  it("executes get_system_info action", async () => {
    const res = await executeAction("get_system_info");
    assert.equal(res.success, true);
    assert.ok(res.data);
    assert.ok(res.durationMs >= 0);
  });

  it("blocks injection attempts and returns safe failure result", async () => {
    const res = await executeAction("open_app", { target: "calc & dir" });
    assert.equal(res.success, false);
    assert.ok(res.message.includes("forbidden shell metacharacters"));
  });

  it("rejects applications not in the approved registry", async () => {
    const res = await executeAction("open_app", { target: "unapproved_custom_script" });
    assert.equal(res.success, false);
    assert.ok(res.message.includes("not in the approved application registry"));
  });

  it("rejects unknown action types gracefully", async () => {
    const res = await executeAction("invalid_action_name_xyz");
    assert.equal(res.success, false);
    assert.ok(res.message.includes("Unsupported"));
  });
});
