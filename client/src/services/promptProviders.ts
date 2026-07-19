import type { ContextProvider } from "../types/prompt";
import type { StructuredContext } from "../types/cognitive";
import type { IntentResult } from "../types/intent";

export class VisionProvider implements ContextProvider {
  id = "aether:provider:vision";
  priority = 2; // High

  execute(context: StructuredContext, _intent: IntentResult): string {
    const focus = context.visualFocusText || "No active focus.";
    const expression = context.userExpression || "No facial expressions detected.";
    const hands = context.userHandsText || "No hands detected.";

    return `<vision_context>
  <visual_focus>${focus}</visual_focus>
  <user_expression>${expression}</user_expression>
  <user_hands>${hands}</user_hands>
</vision_context>`;
  }
}

export class EnvironmentProvider implements ContextProvider {
  id = "aether:provider:environment";
  priority = 4; // Low

  execute(context: StructuredContext, _intent: IntentResult): string {
    const summary = context.systemStateSummary || "System status: unknown.";
    return `<environment_context>
  <system_state>${summary}</system_state>
</environment_context>`;
  }
}

export class IntentProvider implements ContextProvider {
  id = "aether:provider:intent";
  priority = 1; // Critical

  execute(_context: StructuredContext, intent: IntentResult): string {
    const params = intent.parameters ? JSON.stringify(intent.parameters, null, 2) : "{}";
    const entities = intent.entities && intent.entities.length > 0 
      ? intent.entities.map(e => `    <entity type="${e.type}" value="${e.value}">${typeof e.normalized === 'object' ? JSON.stringify(e.normalized) : e.normalized}</entity>`).join("\n")
      : "    <!-- No entities extracted -->";

    return `<intent_context>
  <intent_id>${intent.intentId}</intent_id>
  <intent_name>${intent.intent}</intent_name>
  <confidence>${intent.confidence.toFixed(2)}</confidence>
  <category>${intent.category}</category>
  <domain>${intent.domain}</domain>
  <parameters>${params}</parameters>
  <entities>
${entities}
  </entities>
  <needs_clarification>${intent.needsClarification}</needs_clarification>
</intent_context>`;
  }
}

export class ConversationProvider implements ContextProvider {
  id = "aether:provider:conversation";
  priority = 1; // Critical

  execute(context: StructuredContext, _intent: IntentResult): string {
    const transcript = context.voice?.transcript || "";
    const isListening = context.voice?.isListening ?? false;
    const isSpeaking = context.voice?.isSpeaking ?? false;
    const isFinal = context.voice?.isFinal ?? false;
    
    return `<conversation_context>
  <voice_transcript>${transcript}</voice_transcript>
  <status>
    <is_listening>${isListening}</is_listening>
    <is_speaking>${isSpeaking}</is_speaking>
    <is_final>${isFinal}</is_final>
  </status>
</conversation_context>`;
  }
}

export class MemoryProvider implements ContextProvider {
  id = "aether:provider:memory";
  priority = 3; // Medium

  execute(_context: StructuredContext, _intent: IntentResult): string {
    return `<memory_context>
  <!-- RAG memory storage integration stub -->
</memory_context>`;
  }
}

export class OcrProvider implements ContextProvider {
  id = "aether:provider:ocr";
  priority = 3; // Medium

  execute(_context: StructuredContext, _intent: IntentResult): string {
    return `<ocr_context>
  <!-- OCR and screen-text parser integration stub -->
</ocr_context>`;
  }
}

export class BrowserProvider implements ContextProvider {
  id = "aether:provider:browser";
  priority = 3; // Medium

  execute(_context: StructuredContext, _intent: IntentResult): string {
    return `<browser_context>
  <!-- Browser DOM/tab automation integration stub -->
</browser_context>`;
  }
}
