<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../app/store/auth";

const router = useRouter();
const authStore = useAuthStore();
const form = reactive({
  username: "",
  password: ""
});
const error = ref("");

async function submit() {
  error.value = "";
  try {
    await authStore.login(form);
    router.push("/chat");
  } catch (err: any) {
    error.value = err.response?.data?.message ?? "登录失败";
  }
}
</script>

<template>
  <main class="auth-shell">
    <div class="ambient ambient--left"></div>
    <div class="ambient ambient--right"></div>

    <section class="auth-surface">
      <aside class="auth-aside">
        <div class="brand-mark brand-mark--large" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p class="eyebrow">局域网协作空间</p>
        <h1>让群聊、私聊和文件互传都落在一个轻量界面里。</h1>
        <p class="auth-copy">
          适合办公室、小团队和内网场景。无需复杂部署，打开浏览器就能进入同一套实时消息流。
        </p>

        <div class="auth-feature-grid">
          <article class="auth-feature">
            <strong>实时会话</strong>
            <span>大厅、群组、私聊统一在一个界面中管理。</span>
          </article>
          <article class="auth-feature">
            <strong>文件互传</strong>
            <span>支持图片和常见文档，消息与文件共同沉淀。</span>
          </article>
          <article class="auth-feature">
            <strong>单账号单在线</strong>
            <span>保持内网使用场景下的身份和会话一致性。</span>
          </article>
        </div>
      </aside>

      <section class="auth-card auth-card--wide">
        <div class="block-head">
          <div>
            <p class="eyebrow">欢迎回来</p>
            <h2>登录 Easy Chat</h2>
          </div>
        </div>

        <label class="field-block">
          <span>用户名</span>
          <input v-model="form.username" placeholder="输入你的用户名" />
        </label>

        <label class="field-block">
          <span>密码</span>
          <input v-model="form.password" type="password" placeholder="输入密码" @keyup.enter="submit" />
        </label>

        <button class="primary-action" @click="submit">进入聊天</button>

        <div class="auth-actions">
          <router-link to="/register">还没有账号？去注册</router-link>
        </div>

        <p v-if="authStore.kickedReason" class="inline-tip inline-tip--error">账号已在其他位置登录</p>
        <p v-if="error" class="inline-tip inline-tip--error">{{ error }}</p>
      </section>
    </section>
  </main>
</template>
