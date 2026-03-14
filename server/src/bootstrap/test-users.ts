import { hashPassword } from "../common/security.js";
import { conversationsService } from "../modules/conversations/conversations.service.js";
import { userRepository } from "../modules/users/users.repository.js";

export type SeedUser = {
  username: string;
  nickname: string;
  password: string;
  registerIp: string;
};

export const defaultTestUsers: SeedUser[] = [
  {
    username: "alice",
    nickname: "Alice",
    password: "secret123",
    registerIp: "192.168.0.11"
  },
  {
    username: "bob",
    nickname: "Bob",
    password: "secret123",
    registerIp: "192.168.0.12"
  },
  {
    username: "charlie",
    nickname: "Charlie",
    password: "secret123",
    registerIp: "192.168.0.13"
  }
];

export function ensureTestUsers(seedUsers: SeedUser[] = defaultTestUsers): Array<{ username: string; created: boolean }> {
  const results: Array<{ username: string; created: boolean }> = [];

  for (const seedUser of seedUsers) {
    const existing = userRepository.findByUsername(seedUser.username);
    if (existing) {
      results.push({ username: seedUser.username, created: false });
      continue;
    }

    const user = userRepository.create({
      username: seedUser.username,
      passwordHash: hashPassword(seedUser.password),
      nickname: seedUser.nickname,
      registerIp: seedUser.registerIp
    });
    conversationsService.joinLobby(user.id);
    results.push({ username: seedUser.username, created: true });
  }

  return results;
}
