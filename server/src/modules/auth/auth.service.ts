import { AppError, assert } from "../../common/errors.js";
import { hashPassword, verifyPassword } from "../../common/security.js";
import { USER_LIMIT } from "../../config/constants.js";
import { conversationsService } from "../conversations/conversations.service.js";
import { sessionService } from "../sessions/sessions.service.js";
import { userRepository } from "../users/users.repository.js";

class AuthService {
  register(input: {
    username: string;
    password: string;
    nickname: string;
    registerIp: string;
    userAgent: string | null;
  }) {
    assert(input.username.trim().length >= 3, 400, "INVALID_PARAMS", "Username is too short.");
    assert(input.password.length >= 6, 400, "INVALID_PARAMS", "Password is too short.");
    assert(input.nickname.trim().length >= 1, 400, "INVALID_PARAMS", "Nickname is required.");

    if (userRepository.countUsers() >= USER_LIMIT) {
      throw new AppError(409, "USER_LIMIT_REACHED", "User limit reached.");
    }
    if (userRepository.findByUsername(input.username.trim())) {
      throw new AppError(409, "USERNAME_ALREADY_EXISTS", "Username already exists.");
    }
    if (userRepository.findByRegisterIp(input.registerIp)) {
      throw new AppError(409, "IP_ALREADY_REGISTERED", "This IP has already registered an account.");
    }

    const user = userRepository.create({
      username: input.username.trim(),
      passwordHash: hashPassword(input.password),
      nickname: input.nickname.trim(),
      registerIp: input.registerIp
    });
    conversationsService.joinLobby(user.id);
    userRepository.updateLastLoginIp(user.id, input.registerIp);
    const session = sessionService.createSession(user.id, input.registerIp, input.userAgent);
    return { user, session };
  }

  login(input: { username: string; password: string; loginIp: string; userAgent: string | null }) {
    const user = userRepository.findByUsername(input.username.trim());
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid username or password.");
    }
    if (user.status !== "active") {
      throw new AppError(403, "USER_DISABLED", "User is disabled.");
    }

    userRepository.updateLastLoginIp(user.id, input.loginIp);
    const session = sessionService.createSession(user.id, input.loginIp, input.userAgent);
    return { user, session };
  }
}

export const authService = new AuthService();
