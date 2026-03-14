type SocketLike = {
  send(payload: string): void;
  close(): void;
};

class RealtimeService {
  private byToken = new Map<string, SocketLike>();
  private byUser = new Map<number, Set<string>>();

  register(userId: number, sessionToken: string, socket: SocketLike): void {
    this.byToken.set(sessionToken, socket);

    const tokens = this.byUser.get(userId) ?? new Set<string>();
    tokens.add(sessionToken);
    this.byUser.set(userId, tokens);
  }

  unregister(userId: number, sessionToken: string): void {
    this.byToken.delete(sessionToken);
    const tokens = this.byUser.get(userId);
    if (!tokens) {
      return;
    }

    tokens.delete(sessionToken);
    if (tokens.size === 0) {
      this.byUser.delete(userId);
    }
  }

  pushToUser(userId: number, type: string, data: unknown): void {
    const tokens = this.byUser.get(userId);
    if (!tokens) {
      return;
    }

    const payload = JSON.stringify({ type, data });
    for (const token of tokens) {
      this.byToken.get(token)?.send(payload);
    }
  }

  broadcast(type: string, data: unknown): void {
    const payload = JSON.stringify({ type, data });
    for (const socket of this.byToken.values()) {
      socket.send(payload);
    }
  }

  kickUser(userId: number, exceptToken?: string): void {
    const tokens = this.byUser.get(userId);
    if (!tokens) {
      return;
    }

    for (const token of [...tokens]) {
      if (token === exceptToken) {
        continue;
      }

      const socket = this.byToken.get(token);
      if (socket) {
        socket.send(JSON.stringify({ type: "auth:kicked", data: { reason: "logged_in_elsewhere" } }));
        socket.close();
      }
    }
  }
}

export const realtimeService = new RealtimeService();
