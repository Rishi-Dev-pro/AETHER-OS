const colors = {
  reset: "\x1b[0m",
  info: "\x1b[36m",    // Cyan
  warn: "\x1b[33m",    // Yellow
  error: "\x1b[31m",   // Red
  debug: "\x1b[90m",   // Gray
  success: "\x1b[32m", // Green
  ai: "\x1b[35m",      // Magenta
};

const formatMessage = (level, message) => {
  const timestamp = new Date().toISOString();
  const color = colors[level.toLowerCase()] || colors.reset;
  return `[${timestamp}] ${color}[${level.toUpperCase()}]${colors.reset} ${message}`;
};

export const logger = {
  info: (msg) => console.log(formatMessage("info", msg)),
  warn: (msg) => console.warn(formatMessage("warn", msg)),
  error: (msg) => console.error(formatMessage("error", msg)),
  debug: (msg) => console.log(formatMessage("debug", msg)),
  success: (msg) => console.log(formatMessage("success", msg)),
  ai: (msg) => console.log(formatMessage("ai", msg)),
};
