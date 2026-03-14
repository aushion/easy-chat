import { assert } from "../../common/errors.js";
import { hashPassword, verifyPassword } from "../../common/security.js";
import { userRepository } from "./users.repository.js";

class UsersService {
  getCurrentUser(userId: number) {
    const user = userRepository.findById(userId);
    assert(user, 404, "NOT_FOUND", "User not found.");
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatarUrl: user.avatarFileId ? `/api/files/${user.avatarFileId}/download` : null
    };
  }

  listOnline(userId: number) {
    return userRepository.listOnlineUsers(userId).map((user) => ({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatarUrl: user.avatarFileId ? `/api/files/${user.avatarFileId}/download` : null,
      lastSeenAt: user.lastSeenAt
    }));
  }

  getById(userId: number) {
    return this.getCurrentUser(userId);
  }

  updateProfile(userId: number, input: { nickname?: string; avatarFileId?: number | null }) {
    if (input.nickname !== undefined) {
      assert(input.nickname.trim().length > 0, 400, "INVALID_PARAMS", "Nickname is required.");
    }
    const user = userRepository.updateProfile(userId, {
      nickname: input.nickname?.trim(),
      avatarFileId: input.avatarFileId
    });
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatarUrl: user.avatarFileId ? `/api/files/${user.avatarFileId}/download` : null
    };
  }

  updatePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = userRepository.findById(userId);
    assert(user, 404, "NOT_FOUND", "User not found.");
    assert(verifyPassword(oldPassword, user.passwordHash), 401, "INVALID_CREDENTIALS", "Current password is incorrect.");
    assert(newPassword.length >= 6, 400, "INVALID_PARAMS", "New password is too short.");
    userRepository.updatePassword(userId, hashPassword(newPassword));
  }
}

export const usersService = new UsersService();
