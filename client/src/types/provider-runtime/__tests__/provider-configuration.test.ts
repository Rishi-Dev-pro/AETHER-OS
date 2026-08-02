/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 1 Unit Test: ProviderConfiguration Suite (`provider-configuration.test.ts`)
 *
 * @file provider-configuration.test.ts
 * @description Validates non-secret configuration contracts, secret detection rules via verifyNoSecrets,
 * and immutable freezing.
 */

import { describe, it, expect } from "vitest";
import { ConfigurationSource } from "../enums";
import { InvalidProviderConfigurationError } from "../errors";
import {
  verifyNoSecrets,
  ProviderConfiguration,
} from "../provider-configuration";
import { createProviderConfiguration } from "../factories";

describe("Phase 9.9 — Milestone 1: ProviderConfiguration Test Suite", () => {
  it("should create valid non-secret ProviderConfiguration objects", () => {
    const config = createProviderConfiguration({
      providerId: "groq-cloud",
      model: "llama-3.3-70b",
      timeoutMs: 15000,
      temperature: 0.7,
      maxTokens: 4096,
      baseURL: "https://api.groq.com/openai/v1",
      region: "us-east-1",
      source: ConfigurationSource.ENVIRONMENT,
    });

    expect(config.providerId).toBe("groq-cloud");
    expect(config.model).toBe("llama-3.3-70b");
    expect(config.timeoutMs).toBe(15000);
    expect(config.temperature).toBe(0.7);
    expect(config.maxTokens).toBe(4096);
    expect(config.baseURL).toBe("https://api.groq.com/openai/v1");
    expect(config.source).toBe(ConfigurationSource.ENVIRONMENT);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("should reject configurations containing secret keys (apiKey, secret, token, etc.)", () => {
    expect(() =>
      createProviderConfiguration({
        providerId: "test-provider",
        model: "gpt-4o",
        // @ts-expect-error Testing runtime injection of secret key
        apiKey: "sk-proj-12345",
      })
    ).toThrow(InvalidProviderConfigurationError);

    expect(() =>
      createProviderConfiguration({
        providerId: "test-provider",
        model: "gpt-4o",
        // @ts-expect-error Testing nested secret injection
        customSettings: {
          oauth_token: "secret-token-bytes",
        },
      })
    ).toThrow(InvalidProviderConfigurationError);
  });

  it("should throw InvalidProviderConfigurationError when verifyNoSecrets encounters secret pattern", () => {
    expect(() => verifyNoSecrets({ api_key: "secret" })).toThrow(InvalidProviderConfigurationError);
    expect(() => verifyNoSecrets({ secretKey: "secret" })).toThrow(InvalidProviderConfigurationError);
    expect(() => verifyNoSecrets({ authToken: "secret" })).toThrow(InvalidProviderConfigurationError);
    expect(() => verifyNoSecrets({ jwt_token: "secret" })).toThrow(InvalidProviderConfigurationError);
    expect(() => verifyNoSecrets({ private_key: "secret" })).toThrow(InvalidProviderConfigurationError);
  });

  it("should pass verifyNoSecrets for safe non-secret configuration properties", () => {
    expect(() =>
      verifyNoSecrets({
        model: "claude-3-5-sonnet",
        timeoutMs: 30000,
        temperature: 0.5,
        region: "us-west-2",
        customSettings: {
          enableCache: true,
          batchSize: 32,
        },
      })
    ).not.toThrow();
  });
});
