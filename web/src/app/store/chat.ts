import { defineStore } from "pinia";
import { api } from "../../services/api/client";
import type { ChatMessage, Conversation, ConversationMember, User } from "../../types";

type Detail = {
  id: number;
  type: "private" | "group";
  name: string | null;
  createdBy: number;
  members: ConversationMember[];
};

export const useChatStore = defineStore("chat", {
  state: () => ({
    conversations: [] as Conversation[],
    onlineUsers: [] as User[],
    currentConversationId: null as number | null,
    currentConversation: null as Detail | null,
    messagesByConversation: {} as Record<number, ChatMessage[]>
  }),
  getters: {
    currentMessages(state) {
      if (!state.currentConversationId) {
        return [];
      }
      return state.messagesByConversation[state.currentConversationId] ?? [];
    }
  },
  actions: {
    async refreshConversations() {
      const response = await api.get("/api/conversations");
      this.conversations = response.data.data.items;
      if (!this.currentConversationId && this.conversations.length > 0) {
        await this.selectConversation(this.conversations[0].id);
      }
    },
    async refreshOnlineUsers() {
      const response = await api.get("/api/users/online");
      this.onlineUsers = response.data.data.items;
    },
    async selectConversation(conversationId: number) {
      this.currentConversationId = conversationId;
      const detail = await api.get(`/api/conversations/${conversationId}`);
      this.currentConversation = detail.data.data.conversation;
      const messages = await api.get(`/api/conversations/${conversationId}/messages`);
      this.messagesByConversation[conversationId] = messages.data.data.items;
    },
    async createPrivate(targetUserId: number) {
      const response = await api.post("/api/conversations/private", { targetUserId });
      const conversation = response.data.data.conversation as Detail;
      await this.refreshConversations();
      await this.selectConversation(conversation.id);
    },
    async createGroup(name: string, memberIds: number[]) {
      const response = await api.post("/api/conversations/group", { name, memberIds });
      const conversation = response.data.data.conversation as Detail;
      await this.refreshConversations();
      await this.selectConversation(conversation.id);
    },
    async sendText(content: string) {
      if (!this.currentConversationId) {
        return;
      }
      await api.post(`/api/conversations/${this.currentConversationId}/messages`, { type: "text", content });
    },
    async sendFile(file: File, type: "image" | "file") {
      if (!this.currentConversationId) {
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      const upload = await api.post("/api/files/upload", formData);
      const fileId = upload.data.data.file.id;
      await api.post(`/api/conversations/${this.currentConversationId}/messages`, { type, fileId });
    },
    appendMessage(message: ChatMessage) {
      const list = this.messagesByConversation[message.conversationId] ?? [];
      this.messagesByConversation[message.conversationId] = [...list, message];
    }
  }
});
