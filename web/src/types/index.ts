export type User = {
  id: number;
  username: string;
  nickname: string;
  avatarUrl: string | null;
};

export type Conversation = {
  id: number;
  type: "private" | "group";
  name: string | null;
  createdBy: number;
  privateKey: string | null;
  lastMessage: null | {
    id: number;
    type: string;
    content: string | null;
    createdAt: string;
  };
};

export type ConversationMember = {
  userId: number;
  role: string;
  username: string;
  nickname: string;
  avatarUrl?: string | null;
};

export type ChatMessage = {
  id: number;
  conversationId: number;
  type: string;
  content: string | null;
  createdAt: string;
  sender: User;
  file: null | {
    id: number;
    name: string;
    mimeType: string;
    size: number;
    downloadUrl: string;
  };
};
