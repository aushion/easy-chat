import { defineStore } from "pinia";
import { api } from "../../services/api/client";
import { socketClient } from "../../services/socket/socket";
import type { User } from "../../types";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as User | null,
    ready: false as boolean,
    kickedReason: "" as string
  }),
  actions: {
    async bootstrap() {
      try {
        const response = await api.get("/api/auth/me");
        this.user = response.data.data.user;
        this.kickedReason = "";
        if (this.user) {
          socketClient.connect();
        }
      } catch {
        this.user = null;
      } finally {
        this.ready = true;
      }
    },
    async login(payload: { username: string; password: string }) {
      const response = await api.post("/api/auth/login", payload);
      this.user = response.data.data.user;
      this.kickedReason = "";
      socketClient.connect();
    },
    async register(payload: { username: string; password: string; nickname: string }) {
      const response = await api.post("/api/auth/register", payload);
      this.user = response.data.data.user;
      this.kickedReason = "";
      socketClient.connect();
    },
    async logout() {
      await api.post("/api/auth/logout");
      socketClient.disconnect();
      this.user = null;
      this.kickedReason = "";
    },
    handleKicked(reason: string) {
      this.kickedReason = reason;
      this.user = null;
      socketClient.disconnect();
    }
  }
});
