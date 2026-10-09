<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { toast } from './utils/toast'
import { useTheme } from './utils/theme'
import Toasts from './components/Toasts.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { theme, isDark, setTheme } = useTheme()

/** 浅色 → 深色 → 跟随系统 循环 */
function cycleTheme() {
  const next = theme.value === 'light' ? 'dark' : theme.value === 'dark' ? 'auto' : 'light'
  setTheme(next)
  toast.info(next === 'auto' ? '已跟随系统主题' : next === 'dark' ? '已切换深色' : '已切换浅色')
}
const themeIcon = computed(() => (theme.value === 'dark' ? '🌙' : theme.value === 'light' ? '☀️' : '🌓'))

const isPublic = computed(() => !!route.meta.public)

const NAV = [
  { key: 'home', to: '/', label: '今日', icon: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { key: 'habits', to: '/habits', label: '习惯', icon: 'M9 11.5l2.2 2.2L15.5 9M12 3l7 3.2v5.3c0 4.2-2.9 8-7 9.5-4.1-1.5-7-5.3-7-9.5V6.2z' },
  { key: 'diary', to: '/diary', label: '日记', icon: 'M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm8 1v4h4M8.5 12h7M8.5 15.5h7' },
  { key: 'goals', to: '/goals', label: '目标', icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z' },
  { key: 'todos', to: '/todos', label: '待办', icon: 'M4 7h3l1.6 1.6L12 5.2M4 14h3l1.6 1.6L12 12.2M16 7.5h4M16 14.5h4' },
  { key: 'bills', to: '/bills', label: '记账', icon: 'M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5zM3 9h14M15.5 13.5h2' },
  { key: 'stats', to: '/stats', label: '统计', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' }
]

const activeKey = computed(() => route.meta.nav || 'home')

/** v2：页面标题 emoji（落在标题处，不进导航 SVG） */
const TITLE_EMOJI = { home: '👋', habits: '🔥', diary: '🌤️', goals: '🎯', todos: '✅', bills: '💰', stats: '📊' }
const pageTitle = computed(() => {
  const key = route.meta.nav
  const base = route.meta.title || '今日'
  return TITLE_EMOJI[key] ? `${base} ${TITLE_EMOJI[key]}` : base
})

async function handleLogout() {
  auth.logout()
  toast.info('已退出登录')
  router.push('/login')
}
</script>

<template>
  <div class="app-root" :class="{ 'app-root--plain': isPublic }">
    <RouterView v-if="isPublic" />
    <div v-else class="shell aurora">
      <span class="aurora__blob blob-a" />
      <span class="aurora__blob blob-b" />
      <span class="aurora__blob blob-c" />

      <aside class="side">
        <div class="brand">
          <span class="brand__mark">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2.6"
              stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 9.5 17 19 7" /></svg>
          </span>
          <span class="brand__txt">
            <b>打卡生活</b>
            <i>记录每一天</i>
          </span>
        </div>

        <nav class="nav">
          <RouterLink v-for="n in NAV" :key="n.key" :to="n.to" class="nav__item"
            :class="{ 'nav__item--on': activeKey === n.key }">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"
              stroke-linecap="round" stroke-linejoin="round"><path :d="n.icon" /></svg>
            <span>{{ n.label }}</span>
          </RouterLink>
        </nav>

        <div class="side__foot">
          <div class="me">
            <span class="me__av" :style="{ background: 'var(--grad-primary)' }">
              {{ (auth.user?.nickname || auth.user?.username || 'U').slice(0, 1) }}
            </span>
            <span class="me__info">
              <b>{{ auth.user?.nickname || auth.user?.username || '未登录' }}</b>
              <i>@{{ auth.user?.username }}</i>
            </span>
          </div>
          <button class="btn btn--ghost btn--sm me__out" @click="handleLogout">退出</button>
        </div>
      </aside>

      <main class="main">
        <header class="topbar">
          <h1 class="topbar__title">{{ pageTitle }}</h1>
          <span class="spacer" />
          <button class="theme-btn" :title="`主题：${theme === 'auto' ? '跟随系统' : theme === 'dark' ? '深色' : '浅色'}（点击切换）`"
            @click="cycleTheme">{{ themeIcon }}</button>
          <slot name="topbar-extra" />
        </header>
        <div class="main__body">
          <RouterView v-slot="{ Component }">
            <Transition name="fade" mode="out-in">
              <component :is="Component" />
            </Transition>
          </RouterView>
        </div>
      </main>

      <nav class="tabbar">
        <RouterLink v-for="n in NAV" :key="n.key" :to="n.to" class="tabbar__item"
          :class="{ 'tabbar__item--on': activeKey === n.key }">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"
            stroke-linecap="round" stroke-linejoin="round"><path :d="n.icon" /></svg>
          <span>{{ n.label }}</span>
        </RouterLink>
      </nav>
    </div>
    <Toasts />
  </div>
</template>

<style scoped>
.app-root {
  min-height: 100vh;
}

/* ---------- 极光光斑 ---------- */
.blob-a {
  width: 620px;
  height: 620px;
  top: -260px;
  left: -180px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.42), transparent 68%);
}
.blob-b {
  width: 560px;
  height: 560px;
  bottom: -240px;
  right: -160px;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.38), transparent 68%);
}
.blob-c {
  width: 480px;
  height: 480px;
  top: 34%;
  left: 42%;
  background: radial-gradient(circle, rgba(52, 211, 153, 0.26), transparent 70%);
}

/* ---------- 外壳 ---------- */
.shell {
  display: grid;
  grid-template-columns: 216px minmax(0, 1fr);
  min-height: 100vh;
  background: var(--grad-page);
}

/* ---------- 侧栏 ---------- */
.side {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 22px 16px;
  background: var(--card);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-right: var(--border-soft);
  position: sticky;
  top: 0;
  height: 100vh;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 6px;
}
.brand__mark {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: var(--grad-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 20px -10px rgba(99, 102, 241, 0.9);
  flex: 0 0 auto;
}
.brand__txt {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.brand__txt b {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.2px;
}
.brand__txt i {
  font-size: 10.5px;
  color: var(--t3);
  font-style: normal;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.nav__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 13px;
  font-size: 13px;
  color: var(--t2);
  transition: all 0.16s;
}
.nav__item:hover {
  background: rgba(99, 102, 241, 0.08);
  color: var(--c-indigo);
}
.nav__item--on {
  background: var(--grad-primary);
  color: #fff;
  font-weight: 500;
  box-shadow: 0 10px 22px -12px rgba(99, 102, 241, 0.95);
}
.nav__item--on:hover {
  color: #fff;
}

.side__foot {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-radius: 16px;
  background: var(--card-soft);
}
.me {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}
.me__av {
  width: 32px;
  height: 32px;
  border-radius: 11px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.me__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}
.me__info b {
  font-size: 12.5px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.me__info i {
  font-size: 10.5px;
  color: var(--t3);
  font-style: normal;
}
.me__out {
  padding: 5px 10px;
  font-size: 11px;
}

/* ---------- 主区 ---------- */
.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 26px 4px;
}
.topbar__title {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.3px;
}
.main__body {
  padding: 16px 22px 34px;
  min-width: 0;
}

/* ---------- 移动端 tabbar ---------- */
.tabbar {
  display: none;
}

/* ---------- 响应式 ---------- */
@media (max-width: 900px) {
  .shell {
    grid-template-columns: minmax(0, 1fr);
  }
  .side {
    display: none;
  }
  .main__body {
    padding: 10px 14px 92px;
  }
  .topbar {
    padding: 16px 14px 2px;
  }
  .tabbar {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 30;
    padding: 7px 6px calc(7px + env(safe-area-inset-bottom));
    background: var(--card);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-top: var(--border-soft);
  }
  .tabbar__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    color: var(--t3);
    padding: 5px 0;
    min-height: 44px;
    border-radius: 12px;
  }
  .tabbar__item--on {
    color: var(--c-indigo);
    font-weight: 500;
  }
}
</style>
