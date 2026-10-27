<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { toast } from '../utils/toast'
import { useTheme } from '../utils/theme'

const { theme, setTheme } = useTheme()
const themeLabel = computed(() => (theme.value === 'dark' ? '深色' : theme.value === 'light' ? '浅色' : '跟随系统'))
function cycleTheme() {
  const next = theme.value === 'light' ? 'dark' : theme.value === 'dark' ? 'auto' : 'light'
  setTheme(next)
}

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const mode = ref('login') // login | register
const loading = ref(false)
const form = ref({ username: '', password: '', nickname: '' })

/* v2：行内校验 + 密码显隐 */
const showPwd = ref(false)
const tried = ref(false)
const usernameErr = computed(() => {
  const u = form.value.username.trim()
  if (!u) return '请输入用户名'
  if (u.length < 3) return '用户名至少 3 位'
  return ''
})
const passwordErr = computed(() => {
  if (!form.value.password) return '请输入密码'
  if (form.value.password.length < 6) return '密码至少 6 位'
  return ''
})

const isLogin = computed(() => mode.value === 'login')

function switchMode(m) {
  mode.value = m
  tried.value = false
  if (m === 'login') form.value.nickname = ''
}

async function submit() {
  tried.value = true
  if (usernameErr.value || passwordErr.value || loading.value) return
  loading.value = true
  try {
    const payload = {
      username: form.value.username.trim(),
      password: form.value.password
    }
    if (isLogin.value) {
      await auth.login(payload)
      toast.ok('欢迎回来')
    } else {
      await auth.register({ ...payload, nickname: form.value.nickname.trim() || payload.username })
      toast.ok('注册成功，已自动登录')
    }
    router.replace(route.query.redirect || '/')
  } catch (e) {
    toast.err(e.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <!-- 左侧品牌面板 -->
    <section class="login__hero">
      <div class="brand">
        <span class="brand__mark">
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor"
            stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 17.5c3.2 0 3.2-11 7.8-11s3.2 8 7.2 8" />
            <circle cx="4" cy="17.5" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="12" cy="6.5" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="19" cy="14.5" r="1.6" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span class="brand__name">打卡生活</span>
      </div>

      <h1 class="brand__title">把每一天，<br />过成<span class="brand__accent">看得见的进步</span></h1>
      <p class="brand__sub">习惯打卡 · 心情日记 · 目标进度 · 待办清单 · 收支记账<br />一处记录，长期回看。</p>

      <div class="brand__visual" aria-hidden="true">
        <div class="brand__path">
          <div class="brand__node">
            <span class="brand__node-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12.5 9.5 17 19 7" />
              </svg>
            </span>
            <span>习惯</span>
          </div>
          <div class="brand__node brand__node--current">
            <span class="brand__node-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="7.5" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            </span>
            <span>目标</span>
          </div>
          <div class="brand__node">
            <span class="brand__node-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 3h9l4 4v14H6zM15 3v4h4M9 12h6M9 16h6" />
              </svg>
            </span>
            <span>日记</span>
          </div>
          <div class="brand__node">
            <span class="brand__node-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5zM4 9h14M15.5 13.5h2" />
              </svg>
            </span>
            <span>记账</span>
          </div>
        </div>
        <p class="brand__visual-caption">把散落的生活，收进一条可回看的轨道。</p>
      </div>

      <p class="brand__quote">「坚持的痕迹，值得被看见」</p>
    </section>

    <!-- 右侧表单区 -->
    <section class="login__main">
      <button class="theme-btn login__theme"
        :title="`主题：${themeLabel}（点击切换）`"
        :aria-label="`当前为${themeLabel}主题，点击切换`" @click="cycleTheme">
        <svg v-if="theme === 'dark'" viewBox="0 0 24 24" width="19" height="19" fill="none"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true">
          <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" />
        </svg>
        <svg v-else-if="theme === 'light'" viewBox="0 0 24 24" width="19" height="19" fill="none"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="19" height="19" fill="none"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none" />
        </svg>
      </button>

      <div class="panel">
        <div class="seg panel__seg">
          <button type="button" class="seg__item" :class="{ 'seg__item--on': isLogin }" @click="switchMode('login')">登录</button>
          <button type="button" class="seg__item" :class="{ 'seg__item--on': !isLogin }" @click="switchMode('register')">注册</button>
        </div>

        <h2 class="panel__title">{{ isLogin ? '继续你的记录' : '创建一个新账号' }}</h2>
        <p class="panel__sub">{{ isLogin ? '欢迎回来，今天也要认真生活' : '记录从今天开始，留下第一笔' }}</p>

        <form class="panel__form" @submit.prevent="submit">
          <label class="field">
            <span>用户名</span>
            <span class="lfield">
              <svg class="lfield__icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
                stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke-linecap="round" />
              </svg>
              <input v-model="form.username" class="inp" :class="{ 'inp--err': tried && usernameErr }"
                placeholder="3-20 位字符" autocomplete="username" autocapitalize="none"
                autocorrect="off" spellcheck="false" enterkeyhint="next" />
            </span>
            <span v-if="tried && usernameErr" class="field__err">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
                stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 8v5M12 17h.01M10.3 4.6 2.9 17.4A1.8 1.8 0 0 0 4.5 20h15a1.8 1.8 0 0 0 1.6-2.6L13.7 4.6a2 2 0 0 0-3.4 0Z" />
              </svg>
              {{ usernameErr }}
            </span>
          </label>

          <label class="field">
            <span>密码</span>
            <span class="lfield lfield--pwd">
              <svg class="lfield__icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
                stroke="currentColor" stroke-width="2">
                <rect x="5" y="11" width="14" height="9" rx="3" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke-linecap="round" />
              </svg>
              <input v-model="form.password" class="inp" :type="showPwd ? 'text' : 'password'"
                :class="{ 'inp--err': tried && passwordErr }" placeholder="至少 6 位"
                :autocomplete="isLogin ? 'current-password' : 'new-password'" enterkeyhint="done" />
              <button type="button" class="pwd-eye" :aria-label="showPwd ? '隐藏密码' : '显示密码'"
                @click="showPwd = !showPwd">
                <svg v-if="showPwd" viewBox="0 0 24 24" width="18" height="18" fill="none"
                  stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                  aria-hidden="true">
                  <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.4A10.6 10.6 0 0 1 12 4.2c5 0 8.5 4.3 9.5 7.8a13 13 0 0 1-2 3.4M6.4 6.4A13.6 13.6 0 0 0 2.5 12c1 3.5 4.5 7.8 9.5 7.8 1.4 0 2.6-.3 3.7-.9" />
                </svg>
                <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none"
                  stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                  aria-hidden="true">
                  <path d="M2.5 12C3.5 8.5 7 4.2 12 4.2s8.5 4.3 9.5 7.8c-1 3.5-4.5 7.8-9.5 7.8S3.5 15.5 2.5 12Z" />
                  <circle cx="12" cy="12" r="2.6" />
                </svg>
              </button>
            </span>
            <span v-if="tried && passwordErr" class="field__err">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
                stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 8v5M12 17h.01M10.3 4.6 2.9 17.4A1.8 1.8 0 0 0 4.5 20h15a1.8 1.8 0 0 0 1.6-2.6L13.7 4.6a2 2 0 0 0-3.4 0Z" />
              </svg>
              {{ passwordErr }}
            </span>
          </label>

          <label v-if="!isLogin" class="field">
            <span>昵称（可选）</span>
            <span class="lfield">
              <svg class="lfield__icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
                stroke="currentColor" stroke-width="2">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <circle cx="9" cy="11" r="2.2" />
                <path d="M14 10h4M14 14h4" stroke-linecap="round" />
              </svg>
              <input v-model="form.nickname" class="inp" placeholder="不填则用用户名" />
            </span>
          </label>

          <button class="btn btn--block panel__submit" type="submit" :disabled="loading">
            {{ loading ? '处理中…' : isLogin ? '登 录' : '注册并进入' }}
            <svg v-if="!loading" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>

        <p class="panel__tip">
          {{ isLogin ? '还没有账号？' : '已经有账号了？' }}
          <a @click.prevent="switchMode(isLogin ? 'register' : 'login')">
            {{ isLogin ? '立即注册' : '去登录' }}
          </a>
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ============ 整体：左右分屏 ============ */
.login {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  background: var(--ui-canvas);
}

/* ---------- 左侧品牌面板 ---------- */
.login__hero {
  flex: 0 0 780px;
  max-width: 780px;
  padding: calc(56px + env(safe-area-inset-top, 0px)) 56px 56px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--grad-primary);
}
[data-theme='dark'] .login__hero {
  background: linear-gradient(135deg, #312E81 0%, #4338CA 55%, #1D4ED8 100%);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand__mark {
  width: 40px;
  height: 40px;
  border-radius: var(--ui-radius);
  background: var(--ui-brand-mark);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  box-shadow: 0 8px 20px -6px rgba(0, 0, 0, 0.35);
}
.brand__name {
  font-size: 18px;
  font-weight: 650;
  color: #fff;
}
.brand__title {
  margin-top: 30px;
  font-size: 40px;
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: -1.2px;
  color: #fff;
}
.brand__accent {
  color: #D6F0FF;
}
.brand__sub {
  margin-top: 16px;
  font-size: 14px;
  line-height: 1.9;
  color: rgba(255, 255, 255, 0.86);
}
.brand__quote {
  margin-top: auto;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.78);
}

/* ---------- 品牌轨道示意 ---------- */
.brand__visual {
  width: min(100%, 520px);
  margin-top: 40px;
}
.brand__path {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 22px 0 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}
.brand__path::before {
  content: '';
  position: absolute;
  top: 39px;
  right: 18px;
  left: 18px;
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.2),
    rgba(255, 255, 255, 0.72),
    rgba(255, 255, 255, 0.2)
  );
}
.brand__node {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 9px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  line-height: 1.4;
}
.brand__node-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.34);
  border-radius: var(--ui-radius-pill);
  background: rgba(20, 24, 60, 0.25);
  color: #FFFFFF;
}
.brand__node--current {
  color: #FFFFFF;
}
.brand__node--current .brand__node-icon {
  border-color: #FFFFFF;
  background: #FFFFFF;
  color: #4F46E5;
  box-shadow: 0 0 0 5px rgba(255, 255, 255, 0.1);
}
.brand__visual-caption {
  margin-top: 14px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
  line-height: 1.6;
}

/* ---------- 右侧表单区 ---------- */
.login__main {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 32px calc(48px + env(safe-area-inset-bottom, 0px));
  overflow: hidden;
  background: var(--ui-canvas);
}

.login__theme {
  position: absolute;
  top: calc(28px + env(safe-area-inset-top, 0px));
  right: 32px;
  width: 40px;
  height: 40px;
  border-radius: var(--ui-radius);
  border: 1px solid var(--ui-line);
  background: var(--ui-surface);
  color: var(--ui-text-muted);
  box-shadow: var(--ui-shadow);
  transition: color var(--ui-duration-fast) var(--ui-ease-out),
    border-color var(--ui-duration-fast) var(--ui-ease-out);
}
.login__theme:hover {
  border-color: var(--ui-line);
  background: var(--ui-surface);
  color: var(--ui-text-muted);
}

/* ---------- 表单面板 ---------- */
.panel {
  position: relative;
  width: 100%;
  max-width: 400px;
}
.panel__seg {
  display: flex;
  width: 100%;
  border-radius: var(--ui-radius);
}
.panel__seg .seg__item {
  flex: 1;
  min-height: 40px;
  border-radius: var(--ui-radius-sm);
  text-align: center;
}
.panel__title {
  margin-top: 24px;
  font-size: 24px;
  font-weight: 650;
  letter-spacing: -0.5px;
}
.panel__sub {
  margin-top: 8px;
  font-size: 13px;
  color: var(--ui-text-muted);
}
.panel__form {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 带图标输入框 */
.lfield {
  position: relative;
  display: block;
  color: var(--ui-text-subtle);
}
.lfield .inp {
  padding-left: 44px;
  min-height: 50px;
  border: 1px solid var(--ui-line);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
  font-size: 14px;
}
.lfield .inp:focus {
  border-color: var(--ui-accent);
  background: var(--ui-surface);
}
.lfield__icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}
.lfield:focus-within .lfield__icon {
  color: var(--ui-accent);
}
.lfield--pwd .inp { padding-right: 48px; }

.pwd-eye {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: var(--ui-radius);
  color: var(--ui-text-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--ui-duration-fast) var(--ui-ease-out),
    background-color var(--ui-duration-fast) var(--ui-ease-out);
}
.pwd-eye:hover {
  background: transparent;
  color: var(--ui-text-subtle);
}

.field__err {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--ui-danger);
}
.field__err svg {
  flex: 0 0 auto;
}

/* 提交按钮 */
.panel__submit {
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 50px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0;
  border-radius: var(--ui-radius);
  background: var(--ui-accent);
  color: var(--ui-on-accent);
  box-shadow: 0 10px 24px -14px rgba(79, 70, 229, 0.7);
}
.panel__submit:hover {
  opacity: 1;
  transform: none;
}
.panel__submit:active {
  opacity: 1;
  transform: scale(0.99);
}
.panel__submit:disabled {
  opacity: 0.5;
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
}
.panel__submit svg { margin-left: -2px; }

.panel__tip {
  margin-top: 18px;
  text-align: center;
  font-size: 12px;
  color: var(--ui-text-muted);
}
.panel__tip a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--ui-accent);
  font-weight: 500;
  cursor: pointer;
}

/* ---------- 响应式 ---------- */
@media (hover: hover) and (pointer: fine) {
  .login__theme:hover {
    border-color: var(--ui-line-strong);
    background: var(--ui-surface-2);
    color: var(--ui-text);
  }
  .pwd-eye:hover {
    background: var(--ui-surface-2);
    color: var(--ui-text);
  }
  .panel__submit:hover {
    opacity: 0.94;
  }
}

@media (max-width: 1080px) {
  .brand__visual { display: none; }
}

@media (max-width: 920px) {
  .login { flex-direction: column; }
  .login__hero {
    flex: 0 0 auto;
    max-width: none;
    padding: calc(28px + env(safe-area-inset-top, 0px)) 24px 30px;
  }
  .brand__title {
    margin-top: 20px;
    font-size: 30px;
    letter-spacing: -0.8px;
  }
  .brand__sub { margin-top: 10px; font-size: 13px; }
  .brand__quote { display: none; }
  .login__main { padding: 26px 22px calc(44px + env(safe-area-inset-bottom, 0px)); }
  .login__theme { top: calc(18px + env(safe-area-inset-top, 0px)); right: 18px; }
}
</style>
