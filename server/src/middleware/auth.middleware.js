import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(new ApiError(401, "Not authorized to access this resource"));
    }

    try {
      const decoded = jwt.verify(token, env.jwtSecret);
      const user = await User.findById(decoded.id).select("-password");
      
      if (!user) {
        return next(new ApiError(404, "User not found with this ID"));
      }

      req.user = user;
      next();
    } catch (err) {
      return next(new ApiError(401, "Invalid or expired authorization token"));
    }
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `User role '${req.user?.role || "unknown"}' is not authorized to access this route`
        )
      );
    }
    next();
  };
};
