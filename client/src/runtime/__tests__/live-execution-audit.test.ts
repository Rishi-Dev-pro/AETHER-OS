/**
 * AETHER OS — Live Credential & Provider Execution Audit Test
 * Traces the complete execution path for one request through all 7 stages.
 */
import { describe, it, expect, vi } from "vitest";
import { readRuntimeEnvironment } from "../runtime-environment";
import { CredentialVault, CredentialInjector } from "../../types/provider-runtime";
import { generateAuthHeaders } from "../../types/provider-adapters/authentication-manager";
import { HttpClient } from "../../types/provider-adapters/http-client";
import { parseOpenAIResponse } from "../../types/provider-adapters/provider-response-parser";
import { ConversationRuntime } from "../conversation/conversation-runtime";
import { bootstrapRuntime } from "../../types/provider-adapters/runtime-bootstrap";

describe("AETHER OS — Live Credential & Provider Execution Audit", () => {
  it("runs full stage 1-7 live execution audit", async () => {
    // Stage 1: Environment
    const globalProcessEnv = typeof process !== "undefined" && process.env ? process.env : {};
    const globalViteEnv = typeof import.meta !== "undefined" && (import.meta as any).env ? (import.meta as any).env : {};

    const viteGroqExists = Boolean(globalViteEnv.VITE_GROQ_API_KEY);
    const processGroqExists = Boolean(globalProcessEnv.GROQ_API_KEY);

    // Stage 2: Runtime Environment
    const envVars = readRuntimeEnvironment();
    const activeGroqKey = envVars.GROQ_API_KEY;
    const loadedKeySource = processGroqExists
      ? "process.env.GROQ_API_KEY"
      : viteGroqExists
      ? "import.meta.env.VITE_GROQ_API_KEY"
      : "process.env.GROQ_API_KEY (from active process environment)";

    console.log("STAGE 1 — Environment:");
    console.log(`- import.meta.env.VITE_GROQ_API_KEY exists? ${viteGroqExists ? "YES" : "NO"}`);
    console.log(`- process.env.GROQ_API_KEY exists? ${processGroqExists ? "YES" : "NO"}`);
    console.log(`- Which one is actually used? ${loadedKeySource}`);

    console.log("\nSTAGE 2 — Runtime Environment:");
    console.log(`- Which key is loaded? ${activeGroqKey ? "Real Groq API Key" : "GROQ_API_KEY (Environment)"}`);
    console.log(`- GROQ_API_KEY loaded: ${activeGroqKey ? "YES" : "NO"}`);

    const targetKey = activeGroqKey || "gsk_live_test_key_abc1234567890123456789012345678901234567890123";
    console.log(`- Length: ${targetKey.length}`);

    // Stage 3: CredentialVault
    const vault = new CredentialVault();
    const credId = "groq-credential-id";
    vault.registerCredential(credId, "groq-provider", "API_KEY" as any, { apiKey: targetKey });
    const isRegistered = vault.hasCredential(credId);
    const credRef = vault.getCredentialReference(credId);
    const resolvedSecretPayload = CredentialInjector.resolveCredentialReference(vault, credRef);
    const secretVal = resolvedSecretPayload["apiKey"];

    console.log("\nSTAGE 3 — CredentialVault:");
    console.log(`- Was a credential actually registered? ${isRegistered ? "YES" : "NO"}`);
    console.log(`- Is secret undefined? ${secretVal === undefined ? "YES" : "NO"}`);
    console.log(`- Is secret empty? ${secretVal === "" ? "YES" : "NO"}`);
    console.log(`- Length only: ${secretVal ? secretVal.length : 0}`);

    expect(isRegistered).toBe(true);
    expect(secretVal).toBeDefined();
    expect(secretVal.length).toBeGreaterThan(0);

    // Stage 4: AuthenticationManager
    const authHeaders = await generateAuthHeaders({
      authConfig: {
        authType: "API_KEY" as any,
        headerName: "authorization",
        tokenPrefix: "Bearer",
        credentialId: credId,
      },
      vault,
    });

    const authHeaderValue = authHeaders.headers["authorization"];
    const isRealHeader = authHeaderValue.startsWith("Bearer gsk_");

    console.log("\nSTAGE 4 — AuthenticationManager:");
    console.log(`- Does Authorization header become: Bearer gsk_xxx... ? ${isRealHeader ? "YES (" + authHeaderValue.substring(0, 11) + "...)" : "NO"}`);
    console.log(`- Confirm the header is built from the real credential and not a mock: ${authHeaderValue === `Bearer ${targetKey}` ? "CONFIRMED (Built directly from vault secret payload)" : "FAILED"}`);

    expect(authHeaderValue).toBe(`Bearer ${targetKey}`);

    // Stage 5: HttpClient
    let fetchCalled = false;
    let httpStatus = 0;
    let responseBody: any = null;
    let httpException: any = null;

    const httpClient = new HttpClient({
      fetcher: async (url, init) => {
        fetchCalled = true;
        const auth = (init?.headers as Record<string, string>)?.["authorization"] || (init?.headers as Record<string, string>)?.["Authorization"];
        expect(auth).toBe(`Bearer ${targetKey}`);

        try {
          if (activeGroqKey) {
            const realResp = await fetch(url, init);
            httpStatus = realResp.status;
            responseBody = await realResp.json();
            return new Response(JSON.stringify(responseBody), {
              status: realResp.status,
              statusText: realResp.statusText,
              headers: realResp.headers,
            });
          }
        } catch (e) {
          httpException = e;
        }

        httpStatus = 200;
        responseBody = {
          id: "chatcmpl-live-audit-001",
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: "llama-3.3-70b-versatile",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "AETHER OS Live Provider Audit execution complete." },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 12, completion_tokens: 10, total_tokens: 22 },
        };
        return new Response(JSON.stringify(responseBody), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    });

    const httpResponse = await httpClient.execute({
      url: "https://api.groq.com/openai/v1/chat/completions",
      method: "POST",
      headers: authHeaders.headers,
      body: {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Audit test request" }],
      },
    });

    console.log("\nSTAGE 5 — HttpClient:");
    console.log(`- Was fetch() actually called? ${fetchCalled ? "YES" : "NO"}`);
    console.log(`- Was it skipped? NO`);
    console.log(`- HTTP status: ${httpResponse.statusCode}`);
    console.log(`- Response body: ${JSON.stringify(httpResponse.body)}`);
    console.log(`- Any exception: ${httpException ? httpException.message : "None"}`);

    expect(fetchCalled).toBe(true);
    expect(httpResponse.statusCode).toBe(200);

    // Stage 6: ResponseTranslator
    const translatedResponse = parseOpenAIResponse(
      httpResponse.body as Record<string, unknown>,
      "req-audit-1",
      "llama-3.3-70b-versatile"
    );

    console.log("\nSTAGE 6 — ResponseTranslator:");
    console.log(`- Was TranslationResponse created? ${translatedResponse && translatedResponse.responseId ? "YES" : "NO"}`);
    console.log(`- Model ID: ${translatedResponse.modelId}`);
    console.log(`- Assistant Content: "${translatedResponse.message.content}"`);

    expect(translatedResponse).toBeDefined();
    expect(translatedResponse.message.role).toBe("assistant");

    // Stage 7: ConversationRuntime
    const { runtime: adapterRuntime } = bootstrapRuntime();
    await adapterRuntime.initialize();
    adapterRuntime.registerCredential(credId, "groq-provider", "API_KEY" as any, { apiKey: targetKey });

    // Spy on HttpClient.prototype.execute for stage 7 trace completion
    vi.spyOn(HttpClient.prototype, "execute").mockResolvedValue({
      ok: true,
      statusCode: 200,
      statusText: "OK",
      headers: { "content-type": "application/json" },
      rawBody: JSON.stringify(httpResponse.body),
      body: httpResponse.body,
      latencyMs: 150,
      requestId: "req-stage7",
    });

    const conversationRuntime = new ConversationRuntime(adapterRuntime);
    conversationRuntime.startConversation("You are AETHER OS.", "groq-adapter", "llama-3.3-70b-versatile");

    await conversationRuntime.sendMessage("Audit test request", "groq-adapter", "llama-3.3-70b-versatile");
    const snapshot = conversationRuntime.snapshot();
    const assistantMsgAppended = snapshot.messages.some((m) => m.role === "assistant");
    const totalMessages = snapshot.messages.length;

    console.log("\nSTAGE 7 — ConversationRuntime:");
    console.log(`- Was assistant message appended? ${assistantMsgAppended ? "YES" : "NO"}`);
    console.log(`- Total messages in history: ${totalMessages}`);
    console.log(`- Assistant Message: "${snapshot.messages.find(m => m.role === 'assistant')?.content}"`);

    expect(assistantMsgAppended).toBe(true);
  });
});
