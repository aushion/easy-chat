type Listener = (payload: any) => void;

function getSocketUrl(): string {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

class SocketClient {
  private socket: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private heartbeatTimer: number | null = null;

  connect() {
    if (this.socket && this.socket.readyState <= 1) {
      return;
    }

    this.socket = new WebSocket(getSocketUrl());
    this.socket.onmessage = (event) => {
      const payload = JSON.parse(event.data as string) as { type: string; data: any };
      const listeners = this.listeners.get(payload.type);
      if (!listeners) {
        return;
      }
      for (const listener of listeners) {
        listener(payload.data);
      }
    };

    this.socket.onopen = () => {
      this.stopHeartbeat();
      this.heartbeatTimer = window.setInterval(() => {
        this.socket?.send(JSON.stringify({ type: "heartbeat:ping" }));
      }, 30_000);
    };

    this.socket.onclose = () => {
      this.stopHeartbeat();
    };
  }

  disconnect() {
    this.stopHeartbeat();
    this.socket?.close();
    this.socket = null;
  }

  on(type: string, listener: Listener) {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(type, set);
    return () => set.delete(listener);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

export const socketClient = new SocketClient();
