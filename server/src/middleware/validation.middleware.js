import { ApiError } from "../utils/ApiError.js";

export const validateBody = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === "") {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return next(new ApiError(400, `Missing required fields: ${missingFields.join(", ")}`));
    }

    next();
  };
};
