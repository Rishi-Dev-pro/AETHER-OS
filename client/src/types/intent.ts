export type EntityNormalizedValue = string | number | { x: number; y: number } | Record<string, unknown>;

export interface Entity {
  type: string;       // e.g., 'application', 'url', 'number', 'coordinate', 'hover_target', 'file_name', 'text'
  value: string;      // The exact raw matched text
  normalized: EntityNormalizedValue; // The coerced/normalized representation of the value
}

export interface IntentResult {
  intentId: string;
  timestamp: number;
  category: string;
  domain: string;
  intent: string;
  confidence: number;
  entities: Entity[];
  parameters: Record<string, EntityNormalizedValue>;
  needsClarification: boolean;
}
