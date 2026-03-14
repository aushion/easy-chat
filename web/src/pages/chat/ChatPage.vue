<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../app/store/auth";
import { useChatStore } from "../../app/store/chat";
import { api } from "../../services/api/client";
import type { ChatMessage, Conversation, User } from "../../types";

const authStore = useAuthStore();
const chatStore = useChatStore();
const router = useRouter();

const content = ref("");
const searchQuery = ref("");
const groupName = ref("");
const selectedMembers = ref<number[]>([]);
const profileNickname = ref("");
const createGroupError = ref("");
const profileMessage = ref("");
const fileMessage = ref("");
const sendBusy = ref(false);
const uploadBusy = ref(false);
const groupBusy = ref(false);
const activeDrawer = ref<"group" | "profile" | null>(null);

const filteredConversations = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) {
    return chatStore.conversations;
  }

  return chatStore.conversations.filter((conversation) => {
    const title = getConversationLabel(conversation).toLowerCase();
    const preview = getConversationPreview(conversation).toLowerCase();
    return title.includes(query) || preview.includes(query);
  });
});

const currentConversationLabel = computed(() => {
  if (!chatStore.currentConversation) {
    return "选择一个会话";
  }
  if (chatStore.currentConversation.type === "group") {
    return chatStore.currentConversation.name ?? "未命名群组";
  }
  const other = chatStore.currentConversation.members.find((member) => member.userId !== authStore.user?.id);
  return other?.nickname ?? "私聊会话";
});

const currentConversationMeta = computed(() => {
  if (!chatStore.currentConversation) {
    return "从左侧选择会话，或从在线用户发起新的私聊。";
  }

  if (chatStore.currentConversation.type === "group") {
    return `${chatStore.currentConversation.members.length} 位成员 · 群组在线协作`;
  }

  const other = chatStore.currentConversation.members.find((member) => member.userId !== authStore.user?.id);
  return other ? `正在与 ${other.nickname} 私聊` : "一对一私聊";
});

const onlineUserIds = computed(() => new Set(chatStore.onlineUsers.map((user) => user.id)));

const currentMembers = computed(() => chatStore.currentConversation?.members ?? []);

onMounted(async () => {
  await Promise.all([chatStore.refreshConversations(), chatStore.refreshOnlineUsers()]);
  profileNickname.value = authStore.user?.nickname ?? "";
});

async function sendText() {
  if (!content.value.trim() || !chatStore.currentConversationId || sendBusy.value) {
    return;
  }

  sendBusy.value = true;
  try {
    await chatStore.sendText(content.value);
    content.value = "";
  } finally {
    sendBusy.value = false;
  }
}

async function openPrivate(userId: number) {
  await chatStore.createPrivate(userId);
}

async function submitGroup() {
  createGroupError.value = "";
  if (!groupName.value.trim()) {
    createGroupError.value = "请输入群组名称";
    return;
  }

  groupBusy.value = true;
  try {
    await chatStore.createGroup(groupName.value, selectedMembers.value);
    groupName.value = "";
    selectedMembers.value = [];
    activeDrawer.value = null;
  } catch (error: any) {
    createGroupError.value = error.response?.data?.message ?? "创建群组失败";
  } finally {
    groupBusy.value = false;
  }
}

async function uploadFile(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file || !chatStore.currentConversationId || uploadBusy.value) {
    return;
  }

  uploadBusy.value = true;
  fileMessage.value = "";
  try {
    const type = file.type.startsWith("image/") ? "image" : "file";
    await chatStore.sendFile(file, type);
    fileMessage.value = `已发送 ${file.name}`;
  } catch (error: any) {
    fileMessage.value = error.response?.data?.message ?? "文件发送失败";
  } finally {
    uploadBusy.value = false;
    target.value = "";
  }
}

async function saveProfile() {
  if (!profileNickname.value.trim()) {
    profileMessage.value = "昵称不能为空";
    return;
  }

  profileMessage.value = "";
  await api.patch("/api/users/me", { nickname: profileNickname.value });
  if (authStore.user) {
    authStore.user = { ...authStore.user, nickname: profileNickname.value };
  }
  profileMessage.value = "昵称已保存";
  activeDrawer.value = null;
}

function getConversationPeer(conversation: Conversation): User | undefined {
  if (conversation.type !== "private" || !conversation.privateKey || !authStore.user) {
    return undefined;
  }

  const peerId = conversation.privateKey
    .split(":")
    .map((item: string) => Number(item))
    .find((id: number) => id !== authStore.user?.id);

  if (!peerId) {
    return undefined;
  }

  return chatStore.onlineUsers.find((user) => user.id === peerId);
}

async function logout() {
  await authStore.logout();
  router.push("/login");
}

function openDrawer(drawer: "group" | "profile") {
  activeDrawer.value = drawer;
  if (drawer === "profile") {
    profileNickname.value = authStore.user?.nickname ?? "";
    profileMessage.value = "";
  }
  if (drawer === "group") {
    createGroupError.value = "";
  }
}

function closeDrawer() {
  activeDrawer.value = null;
}

function getConversationLabel(conversation: Conversation): string {
  if (conversation.type === "group") {
    return conversation.name ?? "未命名群组";
  }

  return getConversationPeer(conversation)?.nickname ?? `私聊 #${conversation.id}`;
}

function getConversationPreview(conversation: Conversation): string {
  if (!conversation.lastMessage) {
    return "还没有消息";
  }

  if (conversation.lastMessage.type === "image") {
    return "[图片]";
  }

  if (conversation.lastMessage.type === "file") {
    return "[文件]";
  }

  return conversation.lastMessage.content ?? "新消息";
}

function getShortTime(value?: string | null): string {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getFullTime(value: string): string {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function isOwnMessage(message: ChatMessage): boolean {
  return message.sender.id === authStore.user?.id;
}

function getInitials(name?: string | null): string {
  if (!name) {
    return "?";
  }

  const clean = name.trim();
  if (!clean) {
    return "?";
  }

  if (clean.length === 1) {
    return clean.toUpperCase();
  }

  return clean.slice(0, 2).toUpperCase();
}

function getAvatarStyle(seed?: string | number | null) {
  const palette = [
    ["#6fc4ff", "#3b82f6"],
    ["#7dd3fc", "#0f766e"],
    ["#f9a8d4", "#fb7185"],
    ["#fcd34d", "#f97316"],
    ["#c4b5fd", "#6366f1"],
    ["#86efac", "#16a34a"]
  ];

  const text = String(seed ?? "easy-chat");
  let hash = 0;
  for (const char of text) {
    hash = (hash * 31 + char.charCodeAt(0)) % palette.length;
  }
  const [from, to] = palette[Math.abs(hash) % palette.length];
  return {
    background: `linear-gradient(135deg, ${from}, ${to})`
  };
}
</script>

<template>
  <main class="screen-shell">
    <div class="ambient ambient--left"></div>
    <div class="ambient ambient--right"></div>

    <section class="messenger-layout">
      <aside class="messenger-sidebar">
        <header class="brand-row">
          <div class="brand-mark" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div>
            <p class="eyebrow">局域网通信</p>
            <h1>Easy Chat</h1>
          </div>
        </header>

        <label class="search-shell">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <input v-model="searchQuery" type="text" placeholder="搜索会话或消息摘要" />
        </label>

        <section class="sidebar-block">
          <div class="block-head">
            <div>
              <p class="eyebrow">会话列表</p>
              <h2>最近聊天</h2>
            </div>
            <span class="chip">{{ filteredConversations.length }}</span>
          </div>

          <div class="conversation-stack">
            <button
              v-for="conversation in filteredConversations"
              :key="conversation.id"
              class="conversation-row"
              :class="{ 'conversation-row--active': chatStore.currentConversationId === conversation.id }"
              @click="chatStore.selectConversation(conversation.id)"
            >
              <div class="avatar avatar--conversation" :style="getAvatarStyle(getConversationLabel(conversation))">
                {{ getInitials(getConversationLabel(conversation)) }}
              </div>
              <div class="conversation-copy">
                <div class="conversation-title">
                  <strong>{{ getConversationLabel(conversation) }}</strong>
                  <time>{{ getShortTime(conversation.lastMessage?.createdAt) }}</time>
                </div>
                <div class="conversation-subtitle">
                  <span>{{ getConversationPreview(conversation) }}</span>
                  <span
                    class="presence-dot"
                    :class="{
                      'presence-dot--online':
                        conversation.type === 'group' || Boolean(getConversationPeer(conversation))
                    }"
                  ></span>
                </div>
              </div>
            </button>
          </div>
        </section>

        <section class="sidebar-block sidebar-block--compact">
          <div class="block-head">
            <div>
              <p class="eyebrow">在线用户</p>
              <h2>快速私聊</h2>
            </div>
            <span class="chip chip--green">{{ chatStore.onlineUsers.length }}</span>
          </div>

          <div class="user-pile">
            <button
              v-for="user in chatStore.onlineUsers"
              :key="user.id"
              class="user-pill"
              @click="openPrivate(user.id)"
            >
              <div class="avatar avatar--small" :style="getAvatarStyle(user.nickname)">
                {{ getInitials(user.nickname) }}
              </div>
              <span>{{ user.nickname }}</span>
            </button>
          </div>
        </section>
      </aside>

      <section class="chat-stage">
        <header class="chat-stage__header">
          <div class="chat-stage__identity">
            <div class="avatar avatar--hero" :style="getAvatarStyle(currentConversationLabel)">
              {{ getInitials(currentConversationLabel) }}
            </div>
            <div>
              <p class="eyebrow">当前会话</p>
              <h2>{{ currentConversationLabel }}</h2>
              <p class="chat-meta">{{ currentConversationMeta }}</p>
            </div>
          </div>

          <div class="header-actions">
            <button class="icon-action" type="button" title="刷新会话" @click="chatStore.refreshConversations()">↻</button>
            <button class="icon-action" type="button" title="创建群组" @click="openDrawer('group')">＋</button>
            <button class="icon-action" type="button" title="会话信息" @click="openDrawer('profile')">☰</button>
          </div>
        </header>

        <div class="chat-stage__body">
          <section class="message-panel">
            <div v-if="!chatStore.currentConversation" class="empty-state">
              <div class="empty-state__bubble">💬</div>
              <h3>开始一段新的对话</h3>
              <p>选择大厅、群组，或者从在线用户直接发起私聊。</p>
            </div>

            <div v-else class="message-stream">
              <article
                v-for="message in chatStore.currentMessages"
                :key="message.id"
                class="message-row"
                :class="{ 'message-row--own': isOwnMessage(message) }"
              >
                <div v-if="!isOwnMessage(message)" class="avatar avatar--small" :style="getAvatarStyle(message.sender.nickname)">
                  {{ getInitials(message.sender.nickname) }}
                </div>

                <div class="message-stack">
                  <div class="message-meta">
                    <strong>{{ isOwnMessage(message) ? "你" : message.sender.nickname }}</strong>
                    <time>{{ getFullTime(message.createdAt) }}</time>
                  </div>

                  <div class="message-bubble" :class="{ 'message-bubble--own': isOwnMessage(message) }">
                    <p v-if="message.content">{{ message.content }}</p>

                    <img
                      v-if="message.type === 'image' && message.file"
                      :src="message.file.downloadUrl"
                      :alt="message.file.name"
                      class="message-image"
                    />

                    <a
                      v-if="message.file && message.type !== 'image'"
                      :href="message.file.downloadUrl"
                      target="_blank"
                      class="file-tile"
                    >
                      <span class="file-tile__icon">↗</span>
                      <span>
                        <strong>{{ message.file.name }}</strong>
                        <small>{{ Math.max(1, Math.round(message.file.size / 1024)) }} KB</small>
                      </span>
                    </a>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>

        <footer class="composer-shell">
          <button class="circle-button" type="button" @click="openDrawer('group')">＋</button>
          <label class="circle-button circle-button--file">
            ⤴
            <input type="file" hidden @change="uploadFile" />
          </label>

          <label class="composer-input">
            <textarea
              v-model="content"
              placeholder="输入消息，回车换行，点击右侧发送"
              :disabled="!chatStore.currentConversationId || sendBusy || uploadBusy"
            ></textarea>
          </label>

          <button
            class="send-button"
            type="button"
            :disabled="!chatStore.currentConversationId || !content.trim() || sendBusy"
            @click="sendText"
          >
            {{ uploadBusy ? "上传中" : sendBusy ? "发送中" : "发送" }}
          </button>
        </footer>

        <p v-if="fileMessage" class="composer-note" :class="{ 'inline-tip--error': fileMessage.includes('失败') }">
          {{ fileMessage }}
        </p>
      </section>
    </section>

    <div v-if="activeDrawer" class="drawer-mask" @click="closeDrawer"></div>

    <aside class="drawer-panel" :class="{ 'drawer-panel--open': activeDrawer === 'group' }">
      <div class="drawer-head">
        <div>
          <p class="eyebrow">群组创建</p>
          <h3>新建工作群</h3>
        </div>
        <button class="icon-action" type="button" @click="closeDrawer">×</button>
      </div>

      <p class="drawer-copy">选择在线成员，快速发起新的讨论空间。创建成功后会自动切换到该群组。</p>

      <input v-model="groupName" type="text" placeholder="例如：设计评审组" class="soft-input" />

      <div class="drawer-section">
        <div class="block-head">
          <div>
            <p class="eyebrow">在线成员</p>
            <h3>选择邀请对象</h3>
          </div>
          <span class="chip chip--green">{{ selectedMembers.length }}</span>
        </div>

        <div class="member-grid">
          <label v-for="user in chatStore.onlineUsers" :key="user.id" class="member-option">
            <input v-model="selectedMembers" type="checkbox" :value="user.id" />
            <div class="avatar avatar--small" :style="getAvatarStyle(user.nickname)">
              {{ getInitials(user.nickname) }}
            </div>
            <span>{{ user.nickname }}</span>
          </label>
        </div>
      </div>

      <p v-if="createGroupError" class="inline-tip inline-tip--error">{{ createGroupError }}</p>

      <button class="primary-action" type="button" :disabled="groupBusy" @click="submitGroup">
        {{ groupBusy ? "创建中..." : "创建群组" }}
      </button>
    </aside>

    <aside class="drawer-panel" :class="{ 'drawer-panel--open': activeDrawer === 'profile' }">
      <div class="drawer-head">
        <div>
          <p class="eyebrow">会话详情</p>
          <h3>{{ currentConversationLabel }}</h3>
        </div>
        <button class="icon-action" type="button" @click="closeDrawer">×</button>
      </div>

      <section class="drawer-section">
        <div class="block-head">
          <div>
            <p class="eyebrow">我的资料</p>
            <h3>{{ authStore.user?.username }}</h3>
          </div>
          <button class="ghost-action" type="button" @click="logout">退出</button>
        </div>

        <div class="profile-row">
          <div class="avatar avatar--hero avatar--self" :style="getAvatarStyle(authStore.user?.nickname)">
            {{ getInitials(authStore.user?.nickname) }}
          </div>
          <div>
            <strong>{{ authStore.user?.nickname }}</strong>
            <p class="chat-meta">支持群聊、私聊、文件互传和 30 天消息保留。</p>
          </div>
        </div>

        <input v-model="profileNickname" type="text" placeholder="修改昵称" class="soft-input" />
        <p v-if="profileMessage" class="inline-tip">{{ profileMessage }}</p>
        <button class="primary-action primary-action--soft" type="button" @click="saveProfile">保存昵称</button>
      </section>

      <section class="drawer-section">
        <div class="block-head">
          <div>
            <p class="eyebrow">会话成员</p>
            <h3>在线状态</h3>
          </div>
          <span class="chip">{{ currentMembers.length }}</span>
        </div>

        <div class="member-list">
          <div v-for="member in currentMembers" :key="member.userId" class="member-row">
            <div class="avatar avatar--small" :style="getAvatarStyle(member.nickname)">
              {{ getInitials(member.nickname) }}
            </div>
            <div class="member-row__copy">
              <strong>{{ member.nickname }}</strong>
              <small>
                {{ onlineUserIds.has(member.userId) || member.userId === authStore.user?.id ? "在线" : "离线" }}
              </small>
            </div>
            <span class="chip" :class="{ 'chip--green': member.userId === authStore.user?.id || onlineUserIds.has(member.userId) }">
              {{ member.role === "owner" ? "群主" : "成员" }}
            </span>
          </div>
        </div>
      </section>
    </aside>
  </main>
</template>
