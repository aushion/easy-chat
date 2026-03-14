import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./app/router";
import { socketClient } from "./services/socket/socket";
import { useAuthStore } from "./app/store/auth";
import { useChatStore } from "./app/store/chat";
import "./styles.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

const authStore = useAuthStore();
const chatStore = useChatStore();

socketClient.on("auth:kicked", (data) => {
  authStore.handleKicked(data.reason);
  router.push("/login");
});
socketClient.on("message:new", (data) => {
  chatStore.appendMessage(data.message);
  chatStore.refreshConversations();
});
socketClient.on("conversation:new", async () => {
  await chatStore.refreshConversations();
});
socketClient.on("conversation:member_joined", async () => {
  await chatStore.refreshConversations();
});
socketClient.on("conversation:member_left", async () => {
  await chatStore.refreshConversations();
});
socketClient.on("user:online", async () => {
  await chatStore.refreshOnlineUsers();
});
socketClient.on("user:offline", async () => {
  await chatStore.refreshOnlineUsers();
});

app.mount("#app");
