<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { toast } from '../utils/toast'
import { useTheme } from '../utils/theme'

const { theme, setTheme } = useTheme()
const themeIcon = computed(() => (theme.value === 'dark' ? '🌙' : theme.value === 'light' ? '☀️' : '🌓'))
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
  <div class="login aurora">
    <span class="aurora__blob lb-a" />
    <span class="aurora__blob lb-b" />
    <span class="aurora__blob lb-c" />

    <button class="theme-btn login__theme"
      :title="`主题：${themeLabel}（点击切换）`"
      @click="cycleTheme">{{ themeIcon }}</button>

    <div class="login__inner">
      <!-- 左侧品牌区 -->
      <section class="hero">
        <div class="hero__badge">
          <span class="hero__mark">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2.6"
              stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 9.5 17 19 7" /></svg>
          </span>
          打卡生活
        </div>
        <h1 class="hero__title">把每一天<br />过成<br /><span class="grad-text">看得见的进步</span></h1>
        <p class="hero__sub">习惯打卡 · 心情日记 · 目标进度 · 待办清单 · 收支记账，一处记录，长期回看。</p>

        <ul class="hero__list">
          <li v-for="f in [
            { t: '习惯打卡', d: '连续天数与月历热力图' },
            { t: '心情日记', d: '按心情筛选与统计' },
            { t: '目标进度', d: '量化推进，到期提醒' },
            { t: '记账流水', d: '分类占比与月度趋势' }
          ]" :key="f.t">
            <span class="hero__dot" />
            <b>{{ f.t }}</b>
            <i>{{ f.d }}</i>
          </li>
        </ul>
      </section>

      <!-- 右侧表单 -->
      <section class="panel card--lg">
        <div class="seg panel__seg">
          <button class="seg__item" :class="{ 'seg__item--on': isLogin }" @click="switchMode('login')">登录</button>
          <button class="seg__item" :class="{ 'seg__item--on': !isLogin }" @click="switchMode('register')">注册</button>
        </div>

        <h2 class="panel__title">{{ isLogin ? '继续你的记录' : '创建一个新账号' }}</h2>

        <form class="panel__form" @submit.prevent="submit">
          <label class="field">
            <span>用户名</span>
            <input v-model="form.username" class="inp" :class="{ 'inp--err': tried && usernameErr }"
              placeholder="3-20 位字符" autocomplete="username" />
            <i v-if="tried && usernameErr" class="field__err">⚠️ {{ usernameErr }}</i>
          </label>

          <label class="field">
            <span>密码</span>
            <span class="pwd-wrap">
              <input v-model="form.password" class="inp" :type="showPwd ? 'text' : 'password'"
                :class="{ 'inp--err': tried && passwordErr }" placeholder="至少 6 位"
                :autocomplete="isLogin ? 'current-password' : 'new-password'" />
              <button type="button" class="pwd-eye" :aria-label="showPwd ? '隐藏密码' : '显示密码'"
                @click="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁️' }}</button>
            </span>
            <i v-if="tried && passwordErr" class="field__err">⚠️ {{ passwordErr }}</i>
          </label>

          <label v-if="!isLogin" class="field">
            <span>昵称（可选）</span>
            <input v-model="form.nickname" class="inp" placeholder="不填则用用户名" />
          </label>

          <button class="btn btn--block panel__submit" type="submit" :disabled="loading">
            {{ loading ? '处理中…' : isLogin ? '登录' : '注册并进入' }}
          </button>
        </form>

        <p class="panel__tip">
          {{ isLogin ? '还没有账号？' : '已经有账号了？' }}
          <a @click.prevent="switchMode(isLogin ? 'register' : 'login')">
            {{ isLogin ? '立即注册' : '去登录' }}
          </a>
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px 22px;
  background: var(--grad-page);
}
.lb-a { width: 640px; height: 640px; top: -280px; left: -200px; background: radial-gradient(circle, rgba(139, 92, 246, 0.45), transparent 68%); }
.lb-b { width: 560px; height: 560px; bottom: -260px; right: -180px; background: radial-gradient(circle, rgba(56, 189, 248, 0.42), transparent 68%); }
.lb-c { width: 460px; height: 460px; top: 46%; left: 52%; background: radial-gradient(circle, rgba(52, 211, 153, 0.28), transparent 70%); }

.login__theme {
  position: absolute;
  top: 22px;
  right: 24px;
}
.login__inner {
  width: 100%;
  max-width: 940px;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 34px;
  align-items: center;
}

/* ---------- 品牌区 ---------- */
.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--c-indigo);
  background: var(--card);
  border-radius: 999px;
  padding: 5px 14px 5px 6px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(12px);
}
.hero__mark {
  width: 24px;
  height: 24px;
  border-radius: 9px;
  background: var(--grad-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero__title {
  margin-top: 20px;
  font-size: 42px;
  line-height: 1.16;
  font-weight: 600;
  letter-spacing: -1.4px;
}
.hero__sub {
  margin-top: 14px;
  font-size: 13px;
  color: var(--t2);
  max-width: 400px;
  line-height: 1.85;
}
.hero__list {
  margin: 26px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 11px;
  max-width: 440px;
}
.hero__list li {
  display: grid;
  grid-template-columns: 10px auto;
  grid-template-rows: auto auto;
  column-gap: 7px;
  align-items: center;
  padding: 11px 13px;
  border-radius: 15px;
  background: var(--card);
  backdrop-filter: blur(14px);
  box-shadow: var(--shadow);
}
.hero__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--grad-primary);
  grid-row: span 2;
}
.hero__list b { font-size: 12.5px; font-weight: 500; }
.hero__list i { font-size: 10.5px; color: var(--t3); font-style: normal; }

/* ---------- 表单面板 ---------- */
.panel {
  background: var(--card);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 26px;
  box-shadow: var(--shadow-lg);
  padding: 26px 26px 22px;
  border: var(--border-soft);
}
.panel__seg { display: flex; width: 100%; }
.panel__seg .seg__item { flex: 1; text-align: center; }
.panel__title {
  margin: 20px 0 18px;
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.4px;
}
.panel__form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.panel__submit { margin-top: 6px; }
.panel__submit:disabled {
  opacity: 0.5;
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
}
.pwd-wrap {
  position: relative;
  display: block;
}
.pwd-wrap .inp {
  padding-right: 44px;
}
.pwd-eye {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 34px;
  height: 34px;
  border: none;
  background: transparent;
  border-radius: 10px;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.pwd-eye:hover { background: var(--hover-c); }
.panel__tip {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  color: var(--t2);
}
.panel__tip a {
  color: var(--c-indigo);
  font-weight: 500;
  cursor: pointer;
}

@media (max-width: 860px) {
  .login__inner {
    grid-template-columns: minmax(0, 1fr);
    gap: 26px;
    max-width: 420px;
  }
  .hero__title { font-size: 32px; }
  .hero__list { display: none; }
}
</style>
