import { authService } from "../services/auth.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { env } from "../config/env.js";

// Helper to send token response in cookie and JSON
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const cookieOptions = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
    httpOnly: true,
    secure: env.nodeEnv === "production",
  };

  res
    .status(statusCode)
    .cookie("token", token, cookieOptions)
    .json(
      new ApiResponse(
        statusCode,
        {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
          token,
        },
        "Authentication successful"
      )
    );
};

export const register = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    const user = await authService.registerUser({ username, email, password, role });
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await authService.loginUser({ email, password });
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json(new ApiResponse(200, {}, "Successfully logged out"));
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getUserProfile(req.user.id);
    res.status(200).json(new ApiResponse(200, user, "Profile retrieved successfully"));
  } catch (error) {
    next(error);
  }
};
