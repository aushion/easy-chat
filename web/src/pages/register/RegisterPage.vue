<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../app/store/auth";

const router = useRouter();
const authStore = useAuthStore();
const form = reactive({
  username: "",
  nickname: "",
  password: ""
});
const error = ref("");

async function submit() {
  error.value = "";
  try {
    await authStore.register(form);
    router.push("/chat");
  } catch (err: any) {
    error.value = err.response?.data?.message ?? "注册失败";
  }
}
</script>

<template>
  <main class="auth-shell">
    <div class="ambient ambient--left"></div>
    <div class="ambient ambient--right"></div>

    <section class="auth-surface auth-surface--reverse">
      <aside class="auth-aside">
        <p class="eyebrow">创建账号</p>
        <h1>几秒钟进入你的内网聊天工作台。</h1>
        <p class="auth-copy">
          首次注册后会自动加入默认大厅。你也可以随时创建群组，拉在线成员进来开始协作。
        </p>

        <div class="auth-feature-grid">
          <article class="auth-feature">
            <strong>消息可追溯</strong>
            <span>聊天记录和文件元数据统一持久化。</span>
          </article>
          <article class="auth-feature">
            <strong>页面即入口</strong>
            <span>无需额外客户端，浏览器打开即可使用。</span>
          </article>
          <article class="auth-feature">
            <strong>轻量部署</strong>
            <span>适合 100 人以内的局域网或内网场景。</span>
          </article>
        </div>
      </aside>

      <section class="auth-card auth-card--wide">
        <div class="block-head">
          <div>
            <p class="eyebrow">新成员注册</p>
            <h2>创建你的账号</h2>
          </div>
        </div>

        <label class="field-block">
          <span>用户名</span>
          <input v-model="form.username" placeholder="例如：alex" />
        </label>

        <label class="field-block">
          <span>昵称</span>
          <input v-model="form.nickname" placeholder="例如：Alex" />
        </label>

        <label class="field-block">
          <span>密码</span>
          <input v-model="form.password" type="password" placeholder="设置登录密码" @keyup.enter="submit" />
        </label>

        <button class="primary-action" @click="submit">创建并进入</button>

        <div class="auth-actions">
          <router-link to="/login">已有账号？返回登录</router-link>
        </div>

        <p v-if="error" class="inline-tip inline-tip--error">{{ error }}</p>
      </section>
    </section>
  </main>
</template>
