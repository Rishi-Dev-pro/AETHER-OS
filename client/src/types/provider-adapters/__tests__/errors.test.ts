/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Exception Hierarchy (`errors.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { ProviderRuntimeError } from "../../provider-runtime";
import { ExecutionError } from "../../action-execution";
import {
  ProviderAdapterError,
  InvalidAdapterError,
  AdapterRegistrationError,
  AdapterConfigurationError,
  AdapterAuthenticationError,
  AdapterCapabilityError,
  AdapterRequestError,
  AdapterResponseError,
  AdapterSerializationError,
  AdapterTimeoutError,
  AdapterUnavailableError,
  AdapterInitializationError,
  UnsupportedModelError,
  UnsupportedCapabilityError,
  InvalidRequestError,
  InvalidResponseError,
} from "../errors";

describe("Phase 9.10 Provider Adapter Errors Hierarchy", () => {
  it("should extend ProviderRuntimeError and ExecutionError for base ProviderAdapterError", () => {
    const err = new ProviderAdapterError("Test adapter base error");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ExecutionError);
    expect(err).toBeInstanceOf(ProviderRuntimeError);
    expect(err).toBeInstanceOf(ProviderAdapterError);
    expect(err.code).toBe("ERR_PROVIDER_ADAPTER");
  });

  it("should verify all 15 derived exception classes inherit properly and set distinct error codes", () => {
    const cases = [
      { cls: InvalidAdapterError, expectedCode: "ERR_INVALID_ADAPTER" },
      { cls: AdapterRegistrationError, expectedCode: "ERR_ADAPTER_REGISTRATION" },
      { cls: AdapterConfigurationError, expectedCode: "ERR_ADAPTER_CONFIGURATION" },
      { cls: AdapterAuthenticationError, expectedCode: "ERR_ADAPTER_AUTHENTICATION" },
      { cls: AdapterCapabilityError, expectedCode: "ERR_ADAPTER_CAPABILITY" },
      { cls: AdapterRequestError, expectedCode: "ERR_ADAPTER_REQUEST" },
      { cls: AdapterResponseError, expectedCode: "ERR_ADAPTER_RESPONSE" },
      { cls: AdapterSerializationError, expectedCode: "ERR_ADAPTER_SERIALIZATION" },
      { cls: AdapterTimeoutError, expectedCode: "ERR_ADAPTER_TIMEOUT" },
      { cls: AdapterUnavailableError, expectedCode: "ERR_ADAPTER_UNAVAILABLE" },
      { cls: AdapterInitializationError, expectedCode: "ERR_ADAPTER_INITIALIZATION" },
      { cls: UnsupportedModelError, expectedCode: "ERR_UNSUPPORTED_MODEL" },
      { cls: UnsupportedCapabilityError, expectedCode: "ERR_UNSUPPORTED_CAPABILITY" },
      { cls: InvalidRequestError, expectedCode: "ERR_INVALID_REQUEST" },
      { cls: InvalidResponseError, expectedCode: "ERR_INVALID_RESPONSE" },
    ];

    for (const { cls: ErrClass, expectedCode } of cases) {
      const errorInstance = new ErrClass("Error message", { key: "value" });
      expect(errorInstance).toBeInstanceOf(Error);
      expect(errorInstance).toBeInstanceOf(ExecutionError);
      expect(errorInstance).toBeInstanceOf(ProviderRuntimeError);
      expect(errorInstance).toBeInstanceOf(ProviderAdapterError);
      expect(errorInstance).toBeInstanceOf(ErrClass);
      expect(errorInstance.code).toBe(expectedCode);
      expect(errorInstance.metadata).toEqual({ key: "value" });
    }
  });
});
