import type { StructuredContext } from "../types/cognitive";
import type { Entity, EntityNormalizedValue } from "../types/intent";
import { intentConfig } from "../config/intentConfig";

interface Range {
  start: number;
  end: number;
}

class EntityExtractor {
  /**
   * Extracts entities from StructuredContext voice input and summaries.
   */
  extract(context: StructuredContext, intent: string): Entity[] {
    const entities: Entity[] = [];
    const text = context.voice?.transcript || "";
    const matchedRanges: Range[] = [];

    // Helper to check if a new range overlaps with any already matched range
    const overlaps = (start: number, end: number): boolean => {
      return matchedRanges.some(r => Math.max(start, r.start) < Math.min(end, r.end));
    };

    // 1. Extract URLs
    const urlRegex = new RegExp(intentConfig.urlPattern, "gi");
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      const value = match[0]?.trim();
      if (!value) continue;
      const start = match.index;
      const end = start + match[0].length;

      if (!overlaps(start, end)) {
        let normalized = value;
        if (!/^https?:\/\//i.test(value)) {
          normalized = "https://" + value;
        }
        entities.push({
          type: "url",
          value,
          normalized,
        });
        matchedRanges.push({ start, end });
      }
    }

    // 2. Extract Coordinates
    const coordRegex = new RegExp(intentConfig.coordinatePattern, "gi");
    while ((match = coordRegex.exec(text)) !== null) {
      const value = match[0]?.trim();
      if (!value) continue;
      const start = match.index;
      const end = start + match[0].length;

      if (!overlaps(start, end)) {
        const xStr = match[1] || match[3];
        const yStr = match[2] || match[4];
        if (xStr && yStr) {
          const x = parseInt(xStr, 10);
          const y = parseInt(yStr, 10);
          if (!isNaN(x) && !isNaN(y)) {
            entities.push({
              type: "coordinate",
              value,
              normalized: { x, y },
            });
            matchedRanges.push({ start, end });
          }
        }
      }
    }

    // 3. Extract File Names (e.g. index.html, main.tsx, config.json)
    const fileRegex = /\b[a-zA-Z0-9_-]+\.[a-zA-Z0-9]{2,4}\b/g;
    while ((match = fileRegex.exec(text)) !== null) {
      const value = match[0]?.trim();
      if (!value) continue;
      const start = match.index;
      const end = start + match[0].length;

      if (!overlaps(start, end)) {
        entities.push({
          type: "file_name",
          value,
          normalized: value,
        });
        matchedRanges.push({ start, end });
      }
    }

    // 4. Extract Applications from Application Registry
    for (const app of intentConfig.applicationRegistry) {
      const escapedApp = app.replace(new RegExp("[-/\\\\^$*+?.()|[\\]{}]", "g"), "\\$&");
      const appRegex = new RegExp(`\\b${escapedApp}\\b`, "gi");
      while ((match = appRegex.exec(text)) !== null) {
        const value = match[0]?.trim();
        if (!value) continue;
        const start = match.index;
        const end = start + match[0].length;

        if (!overlaps(start, end)) {
          entities.push({
            type: "application",
            value,
            normalized: app, // Standard casing from registry
          });
          matchedRanges.push({ start, end });
          break; // Avoid matching same app multiple times
        }
      }
    }

    // 5. Extract Percentages (e.g. 80%, 50 percent)
    const pctRegex = /(\b\d+(?:\.\d+)?\s*(?:%|percent))\b/gi;
    while ((match = pctRegex.exec(text)) !== null) {
      const value = match[0]?.trim();
      if (!value) continue;
      const start = match.index;
      const end = start + match[0].length;

      if (!overlaps(start, end)) {
        const numVal = parseFloat(value);
        if (!isNaN(numVal)) {
          entities.push({
            type: "percentage",
            value,
            normalized: numVal,
          });
          matchedRanges.push({ start, end });
        }
      }
    }

    // 6. Extract Numbers (only if they don't overlap with coordinates/urls/filenames/percentages)
    const numRegex = new RegExp(intentConfig.numberPattern, "g");
    while ((match = numRegex.exec(text)) !== null) {
      const value = match[0]?.trim();
      if (!value) continue;
      const start = match.index;
      const end = start + match[0].length;

      if (!overlaps(start, end)) {
        const normalized = parseFloat(value);
        if (!isNaN(normalized)) {
          entities.push({
            type: "number",
            value,
            normalized,
          });
          matchedRanges.push({ start, end });
        }
      }
    }

    // 7. Extract Hover Target (from StructuredContext visualFocusText)
    if (context.visualFocusText && context.visualFocusText.trim().length > 0) {
      entities.push({
        type: "hover_target",
        value: context.visualFocusText,
        normalized: context.visualFocusText.trim(),
      });
    }

    // 8. Extract Window Name (from StructuredContext systemStateSummary if available)
    if (context.systemStateSummary) {
      const windowRegex = /(?:active\s+window|window\s+title|window)\s*:\s*([^\n,.]+)/i;
      const winMatch = windowRegex.exec(context.systemStateSummary);
      if (winMatch && winMatch[1]) {
        entities.push({
          type: "window_name",
          value: winMatch[0],
          normalized: winMatch[1].trim(),
        });
      }
    }

    // 9. Extract General Text query (as fallback for QUERY, OPEN, SEARCH, FILESYSTEM, etc. intents)
    const textIntents = [
      "QUERY", "OPEN", "SEARCH", "FIND_FILES", "CREATE_DIR",
      "DELETE_FILE", "RENAME_FILE", "MOVE_FILE", "COPY_FILE",
      "TYPE_TEXT", "PRESS_KEY"
    ];
    if (textIntents.includes(intent) && text.trim().length > 0) {
      const hasAppOrUrl = entities.some(e => e.type === "application" || e.type === "url");
      if (!hasAppOrUrl) {
        // Strip out the start action prefix keywords
        const cleanText = text.replace(/^(?:open|launch|start|what\s+is|explain|how\s+do\s+i|tell\s+me\s+about|search\s+for|search|lookup|look\s+up|find|locate|where\s+is|show|create|make|delete|remove|erase|destroy|rename|move|copy|type|press)\s+/i, "").trim();
        if (cleanText.length > 0) {
          entities.push({
            type: "text",
            value: text,
            normalized: cleanText,
          });
        }
      }
    }

    return entities;
  }

  /**
   * Coerces and builds a flat parameter map from the extracted entities.
   */
  buildParameters(entities: Entity[]): Record<string, EntityNormalizedValue> {
    const params: Record<string, EntityNormalizedValue> = {};
    for (const entity of entities) {
      // Map entity types to parameter map keys
      switch (entity.type) {
        case "application":
          params.application = typeof entity.normalized === "string" ? entity.normalized.trim() : entity.normalized;
          break;
        case "url":
          params.url = typeof entity.normalized === "string" ? entity.normalized.trim() : entity.normalized;
          break;
        case "file_name":
          params.fileName = typeof entity.normalized === "string" ? entity.normalized.trim() : entity.normalized;
          break;
        case "coordinate":
          params.coordinate = entity.normalized;
          break;
        case "number":
          params.number = entity.normalized;
          break;
        case "percentage":
          params.percentage = entity.normalized;
          break;
        case "hover_target":
          params.hoverTarget = typeof entity.normalized === "string" ? entity.normalized.trim() : entity.normalized;
          break;
        case "window_name":
          params.windowName = typeof entity.normalized === "string" ? entity.normalized.replace(/\s+/g, " ").trim() : entity.normalized;
          break;
        case "text":
          params.text = typeof entity.normalized === "string" ? entity.normalized.replace(/\s+/g, " ").trim() : entity.normalized;
          break;
        default:
          break;
      }
    }
    return params;
  }
}

export const entityExtractor = new EntityExtractor();

