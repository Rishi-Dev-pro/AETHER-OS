export const validateVisionPayload = (payload) => {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return { isValid: false, errors: ["Payload must be a valid object"] };
  }

  // Required root properties
  const requiredProps = ["timestamp", "camera", "fps", "frameWidth", "frameHeight", "status"];
  requiredProps.forEach((prop) => {
    if (payload[prop] === undefined || payload[prop] === null) {
      errors.push(`Missing required field: ${prop}`);
    }
  });

  // Type checks
  if (payload.timestamp && isNaN(Date.parse(payload.timestamp))) {
    errors.push("timestamp must be a valid ISO Date string");
  }

  if (payload.camera !== undefined && typeof payload.camera !== "boolean") {
    errors.push("camera must be a boolean");
  }

  if (payload.fps !== undefined && typeof payload.fps !== "number") {
    errors.push("fps must be a number");
  }

  if (payload.frameWidth !== undefined && typeof payload.frameWidth !== "number") {
    errors.push("frameWidth must be a number");
  }

  if (payload.frameHeight !== undefined && typeof payload.frameHeight !== "number") {
    errors.push("frameHeight must be a number");
  }

  if (payload.status !== undefined && typeof payload.status !== "string") {
    errors.push("status must be a string");
  }

  // Array properties
  const arrayProps = ["faces", "hands", "pose", "objects", "emotions", "ocr"];
  arrayProps.forEach((prop) => {
    if (payload[prop] !== undefined && !Array.isArray(payload[prop])) {
      errors.push(`${prop} must be an array`);
    }
  });

  if (payload.warnings !== undefined && !Array.isArray(payload.warnings)) {
    errors.push("warnings must be an array");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
