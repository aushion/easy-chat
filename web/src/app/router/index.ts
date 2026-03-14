import { createRouter, createWebHistory } from "vue-router";
import LoginPage from "../../pages/login/LoginPage.vue";
import RegisterPage from "../../pages/register/RegisterPage.vue";
import ChatPage from "../../pages/chat/ChatPage.vue";
import { useAuthStore } from "../store/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/chat" },
    { path: "/login", component: LoginPage },
    { path: "/register", component: RegisterPage },
    { path: "/chat", component: ChatPage }
  ]
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  if (!authStore.ready) {
    await authStore.bootstrap();
  }

  if (to.path === "/login" || to.path === "/register") {
    if (authStore.user) {
      return "/chat";
    }
    return true;
  }

  if (!authStore.user) {
    return "/login";
  }

  return true;
});

export default router;
