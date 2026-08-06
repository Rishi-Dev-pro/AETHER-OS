/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Authentication Manager (`authentication-manager.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { AuthenticationType } from "../enums";
import { generateAuthHeaders } from "../authentication-manager";
import {
  InvalidAuthConfigError,
  CredentialResolutionError,
  HeaderInjectionError,
} from "../authentication-errors";

describe("Phase 9.10 Authentication Manager Header Generation", () => {
  it("should generate empty headers when authType is NONE", async () => {
    const payload = await generateAuthHeaders({
      authConfig: { authType: AuthenticationType.NONE },
    });

    expect(payload.headers).toEqual({});
    expect(Object.isFrozen(payload)).toBe(true);
    expect(Object.isFrozen(payload.headers)).toBe(true);
  });

  it("should generate Bearer authorization headers from raw credentials", async () => {
    const payload = await generateAuthHeaders({
      authConfig: { authType: AuthenticationType.BEARER_TOKEN },
      rawCredentials: { apiKey: "test-secret-token-123" },
    });

    expect(payload.headers["authorization"]).toBe("Bearer test-secret-token-123");
    expect(Object.isFrozen(payload.headers)).toBe(true);
  });

  it("should generate custom API Key headers when requested", async () => {
    const payload = await generateAuthHeaders({
      authConfig: {
        authType: AuthenticationType.API_KEY,
        headerName: "X-Api-Key",
      },
      rawCredentials: { key: "secret-api-key-999" },
    });

    expect(payload.headers["x-api-key"]).toBe("secret-api-key-999");
  });

  it("should generate CUSTOM_HEADER authorization headers", async () => {
    const payload = await generateAuthHeaders({
      authConfig: {
        authType: AuthenticationType.CUSTOM_HEADER,
        headerName: "X-Vendor-Token",
        tokenPrefix: "Token",
      },
      rawCredentials: { secret: "custom-token-val" },
    });

    expect(payload.headers["x-vendor-token"]).toBe("Token custom-token-val");
  });

  it("should throw CredentialResolutionError when no credentials or vault are provided", async () => {
    await expect(
      generateAuthHeaders({
        authConfig: { authType: AuthenticationType.BEARER_TOKEN },
      })
    ).rejects.toThrow(CredentialResolutionError);
  });

  it("should throw InvalidAuthConfigError when CUSTOM_HEADER missing headerName", async () => {
    await expect(
      generateAuthHeaders({
        authConfig: { authType: AuthenticationType.CUSTOM_HEADER, headerName: "" },
        rawCredentials: { apiKey: "secret" },
      })
    ).rejects.toThrow(InvalidAuthConfigError);
  });

  it("should throw HeaderInjectionError when raw credential is empty", async () => {
    await expect(
      generateAuthHeaders({
        authConfig: { authType: AuthenticationType.BEARER_TOKEN },
        rawCredentials: { apiKey: "   " },
      })
    ).rejects.toThrow(HeaderInjectionError);
  });
});
