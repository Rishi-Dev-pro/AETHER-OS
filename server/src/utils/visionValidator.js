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

  if (payload.pointer !== undefined && typeof payload.pointer !== "object") {
    errors.push("pointer must be an object");
  }

  // Array properties
  const arrayProps = ["faces", "hands", "gestures", "pinches", "pose", "objects", "ocr"];
  arrayProps.forEach((prop) => {
    if (payload[prop] !== undefined && !Array.isArray(payload[prop])) {
      errors.push(`${prop} must be an array`);
    }
  });

  // Face emotion validation
  if (payload.faces && Array.isArray(payload.faces)) {
    payload.faces.forEach((face, idx) => {
      if (face.emotion !== undefined) {
        if (typeof face.emotion !== "object" || face.emotion === null) {
          errors.push(`faces[${idx}].emotion must be an object`);
        } else {
          const { dominant, confidence, scores, stability } = face.emotion;
          if (dominant !== undefined && typeof dominant !== "string") {
            errors.push(`faces[${idx}].emotion.dominant must be a string`);
          }
          if (confidence !== undefined && typeof confidence !== "number") {
            errors.push(`faces[${idx}].emotion.confidence must be a number`);
          }
          if (scores !== undefined && (typeof scores !== "object" || scores === null)) {
            errors.push(`faces[${idx}].emotion.scores must be an object`);
          }
          if (stability !== undefined && typeof stability !== "number") {
            errors.push(`faces[${idx}].emotion.stability must be a number`);
          }
        }
      }
    });
  }

  if (payload.warnings !== undefined && !Array.isArray(payload.warnings)) {
    errors.push("warnings must be an array");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
