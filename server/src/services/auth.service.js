import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";

class AuthService {
  async registerUser({ username, email, password, role }) {
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      throw new ApiError(400, "Username or email already exists");
    }

    const user = await User.create({
      username,
      email,
      password,
      role,
    });

    return user;
  }

  async loginUser({ email, password }) {
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new ApiError(401, "Invalid credentials");
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      throw new ApiError(401, "Invalid credentials");
    }

    return user;
  }

  async getUserProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    return user;
  }
}

export const authService = new AuthService();
