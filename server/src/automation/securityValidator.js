/**
 * AETHER OS — Phase 10: AI Desktop Task Automation
 * Security Validator & Command Sandboxing
 *
 * @file securityValidator.js
 * @description Validates, sanitizes, and sandboxes incoming desktop action parameters
 * to prevent command injection, directory traversal, and unauthorized system access.
 */

// Characters strictly prohibited in target strings or arguments (cmd.exe metacharacters)
const FORBIDDEN_METACHARS_REGEX = /[;&|><`$\r\n\0%^()"]/;

// Forbidden executable phrases or destructive commands
const FORBIDDEN_KEYWORDS = [
  "rmdir",
  "del /",
  "format",
  "reg add",
  "reg delete",
  "net user",
  "shutdown /s",
  "powershell -enc",
  "powershell -e ",
  "invoke-webrequest",
  "iex(",
  "iex (",
  "downloadstring",
];

// Whitelisted URI protocol schemes
const ALLOWED_URI_SCHEMES = [
  "https:",
  "http:",
  "spotify:",
  "discord:",
  "slack:",
  "ms-settings:",
  "mailto:",
];

export class SecurityValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SecurityValidationError";
  }
}

/**
 * Sanitizes generic user text (strips control characters, trims).
 * @param {string} text
 * @returns {string}
 */
export function sanitizeInput(text) {
  if (typeof text !== "string") return "";
  return text.replace(/[\x00-\x1F\x7F]/g, "").trim();
}

/**
 * Asserts that a string is safe for shell argument passing.
 * Throws SecurityValidationError if forbidden characters or keywords are detected.
 * @param {string} text
 * @param {string} [fieldName='Input']
 * @returns {string} Sanitized string
 */
export function assertSafeText(text, fieldName = "Input") {
  const sanitized = sanitizeInput(text);

  if (!sanitized) {
    throw new SecurityValidationError(`${fieldName} cannot be empty`);
  }

  if (FORBIDDEN_METACHARS_REGEX.test(sanitized)) {
    throw new SecurityValidationError(
      `Security violation: ${fieldName} contains forbidden shell metacharacters`
    );
  }

  const lower = sanitized.toLowerCase();
  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (lower.includes(keyword)) {
      throw new SecurityValidationError(
        `Security violation: ${fieldName} contains disallowed command '${keyword}'`
      );
    }
  }

  return sanitized;
}

/**
 * Validates that a URL is safe to open (must use allowed protocol schemes).
 * Allows URL percent-encoding (%) but strictly blocks shell injection characters.
 * @param {string} urlString
 * @returns {string} Validated URL
 */
export function assertSafeUrl(urlString) {
  const sanitized = sanitizeInput(urlString);

  if (!sanitized) {
    throw new SecurityValidationError("URL cannot be empty");
  }

  // Block shell injection and quote breakout characters in URLs
  if (/[;&|><`$\r\n\0"^]/.test(sanitized)) {
    throw new SecurityValidationError(
      "Security violation: URL contains forbidden shell metacharacters"
    );
  }

  try {
    const parsed = new URL(sanitized);
    if (!ALLOWED_URI_SCHEMES.includes(parsed.protocol.toLowerCase())) {
      throw new SecurityValidationError(
        `Disallowed URL protocol: '${parsed.protocol}'. Allowed: ${ALLOWED_URI_SCHEMES.join(", ")}`
      );
    }
    return parsed.toString();
  } catch (err) {
    if (err instanceof SecurityValidationError) throw err;
    throw new SecurityValidationError(`Malformed URL: '${urlString}'`);
  }
}

/**
 * Validates search query strings.
 * @param {string} query
 * @returns {string}
 */
export function assertSafeQuery(query) {
  const sanitized = assertSafeText(query, "Search query");
  if (sanitized.length > 300) {
    throw new SecurityValidationError("Search query exceeds maximum 300 characters limit");
  }
  return sanitized;
}
