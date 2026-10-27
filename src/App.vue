<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useCoupleStore } from './stores/couple'
import { toast } from './utils/toast'
import { useTheme } from './utils/theme'
import Toasts from './components/Toasts.vue'
import CoupleCalendar from './components/CoupleCalendar.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const couple = useCoupleStore()
const { theme, setTheme } = useTheme()

const moreOpen = ref(false)
const moreSheet = ref(null)
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')
const graphemeSegmenter =
  typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null

function firstGlyph(value, fallback = '·') {
  const text = String(value ?? '').trim()
  if (!text) return fallback
  if (graphemeSegmenter) {
    return [...graphemeSegmenter.segment(text)][0]?.segment || fallback
  }
  return Array.from(text)[0] || fallback
}

/** 浅色 → 深色 → 跟随系统 循环 */
function cycleTheme() {
  const next = theme.value === 'light' ? 'dark' : theme.value === 'dark' ? 'auto' : 'light'
  setTheme(next)
  toast.info(next === 'auto' ? '已跟随系统主题' : next === 'dark' ? '已切换深色' : '已切换浅色')
}
const themeLabel = computed(() =>
  theme.value === 'auto' ? '跟随系统' : theme.value === 'dark' ? '深色' : '浅色'
)

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
const PRIMARY_NAV_KEYS = ['home', 'habits', 'todos', 'bills']
const primaryNav = NAV.filter((item) => PRIMARY_NAV_KEYS.includes(item.key))
const secondaryNav = NAV.filter((item) => !PRIMARY_NAV_KEYS.includes(item.key))
const moreActive = computed(() => !PRIMARY_NAV_KEYS.includes(activeKey.value))

const pageTitle = computed(() => route.meta.title || '今日')

function openMore() {
  moreOpen.value = true
  nextTick(() => {
    moreSheet.value?.querySelector('button, a')?.focus()
  })
}

function closeMore(restoreFocus = false) {
  if (!moreOpen.value) return
  moreOpen.value = false
  if (restoreFocus) {
    nextTick(() => document.querySelector('.tabbar__more')?.focus())
  }
}

function handleKeydown(event) {
  if (!moreOpen.value) return
  if (event.key === 'Escape') {
    closeMore(true)
    return
  }
  if (event.key !== 'Tab' || !moreSheet.value) return
  const items = [...moreSheet.value.querySelectorAll(FOCUSABLE)].filter(
    (el) => !el.hasAttribute('hidden') && el.getClientRects().length
  )
  if (!items.length) {
    event.preventDefault()
    moreSheet.value.focus()
    return
  }
  const first = items[0]
  const last = items.at(-1)
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

async function handleLogout() {
  closeMore(false)
  couple.reset()
  auth.logout()
  toast.info('已退出登录')
  router.push('/login')
}

onMounted(() => {
  if (auth.user) couple.load()
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.classList.remove('ui-no-scroll')
})

watch(
  () => route.fullPath,
  () => closeMore(false)
)

watch(moreOpen, (open) => {
  document.body.classList.toggle('ui-no-scroll', open)
})
</script>

<template>
  <div class="app-root" :class="{ 'app-root--plain': isPublic }">
    <RouterView v-if="isPublic" />
    <div v-else class="shell" :class="{ 'shell--rail': couple.bound }" :inert="moreOpen">
      <aside class="side">
        <div class="brand">
          <span class="brand__mark">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
              stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 17.5c3.2 0 3.2-11 7.8-11s3.2 8 7.2 8" />
              <circle cx="4" cy="17.5" r="1.6" fill="currentColor" stroke="none" />
              <circle cx="12" cy="6.5" r="1.6" fill="currentColor" stroke="none" />
              <circle cx="19" cy="14.5" r="1.6" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span class="brand__txt">
            <b>打卡生活</b>
            <i>记录每一天</i>
          </span>
        </div>

        <nav class="nav" aria-label="主要导航">
          <RouterLink v-for="n in NAV" :key="n.key" :to="n.to" class="nav__item"
            :class="{ 'nav__item--on': activeKey === n.key }">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"
              stroke-linecap="round" stroke-linejoin="round"><path :d="n.icon" /></svg>
            <span>{{ n.label }}</span>
          </RouterLink>
        </nav>

        <div class="side__foot">
          <RouterLink to="/couple" class="me me--link" title="情侣空间">
            <span class="me__av">
              {{ firstGlyph(auth.user?.nickname || auth.user?.username, 'U') }}
            </span>
            <span class="me__info">
              <b>{{ auth.user?.nickname || auth.user?.username || '未登录' }}</b>
              <i>@{{ auth.user?.username }}</i>
            </span>
          </RouterLink>
          <button class="btn btn--ghost btn--sm me__out" @click="handleLogout">退出</button>
        </div>
      </aside>

      <main class="main">
        <header class="topbar">
          <h1 class="topbar__title">{{ pageTitle }}</h1>
          <span class="spacer" />
          <div class="topbar__actions">
            <RouterLink to="/couple" class="icon-button" title="情侣空间" aria-label="情侣空间">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20.8 5.8a5.2 5.2 0 0 0-7.4 0L12 7.2l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 22l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z" />
              </svg>
            </RouterLink>
            <button class="icon-button" type="button" :title="`主题：${themeLabel}（点击切换）`"
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
            <slot name="topbar-extra" />
          </div>
        </header>
        <div v-if="couple.viewing" class="view-bar">
          <span class="view-bar__copy">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20.8 5.8a5.2 5.2 0 0 0-7.4 0L12 7.2l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 22l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z" />
            </svg>
            正在查看 <b>{{ couple.partner?.nickname || couple.partner?.username || 'TA' }}</b> 的空间（只读）
          </span>
          <button class="view-bar__action" type="button" @click="couple.exitView()">回到我的空间</button>
        </div>
        <div class="main__body">
          <RouterView v-slot="{ Component }">
            <Transition name="fade" mode="out-in">
              <component :is="Component" :key="couple.viewUserId || 'me'" />
            </Transition>
          </RouterView>
        </div>
      </main>

      <!-- 绑定后出现的右侧栏：共同日历，双方都能编辑 -->
      <aside v-if="couple.bound" class="rail" aria-label="我们的日历">
        <CoupleCalendar />
      </aside>

      <nav class="tabbar" aria-label="移动端导航">
        <RouterLink v-for="n in primaryNav" :key="n.key" :to="n.to" class="tabbar__item"
          :class="{ 'tabbar__item--on': activeKey === n.key }">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="n.icon" /></svg>
          <span>{{ n.label }}</span>
        </RouterLink>
        <button class="tabbar__item tabbar__more" type="button" :class="{ 'tabbar__item--on': moreActive }"
          aria-haspopup="dialog" :aria-expanded="moreOpen" @click="openMore">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="19" cy="12" r="1.6" />
          </svg>
          <span>更多</span>
        </button>
      </nav>

      <Teleport to="body">
        <Transition name="more">
          <div v-if="moreOpen" class="more-layer" @click.self="closeMore(true)">
            <section ref="moreSheet" class="more-sheet" role="dialog" aria-modal="true" tabindex="-1"
              aria-labelledby="more-sheet-title">
              <header class="more-sheet__head">
                <div>
                  <h2 id="more-sheet-title">更多</h2>
                  <p>{{ auth.user?.nickname || auth.user?.username || '当前账号' }}</p>
                </div>
                <button class="icon-button" type="button" aria-label="关闭更多菜单" @click="closeMore(true)">
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                    <path d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </button>
              </header>

              <div class="more-grid">
                <RouterLink v-for="n in secondaryNav" :key="n.key" :to="n.to" class="more-link"
                  @click="closeMore(false)">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                    stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path :d="n.icon" />
                  </svg>
                  <span>{{ n.label }}</span>
                </RouterLink>
                <RouterLink to="/couple" class="more-link" @click="closeMore(false)">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                    stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M20.8 5.8a5.2 5.2 0 0 0-7.4 0L12 7.2l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 22l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z" />
                  </svg>
                  <span>情侣空间</span>
                </RouterLink>
              </div>

              <div class="more-actions">
                <button class="more-action" type="button" @click="cycleTheme">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                  </svg>
                  <span>主题：{{ themeLabel }}</span>
                </button>
                <button class="more-action more-action--danger" type="button" @click="handleLogout">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M14 8l4 4-4 4M9 12h9" />
                  </svg>
                  <span>退出登录</span>
                </button>
              </div>
            </section>
          </div>
        </Transition>
      </Teleport>
    </div>
    <Toasts />
  </div>
</template>

<style scoped>
:global(body.ui-no-scroll) {
  overflow: hidden;
}

.app-root {
  min-height: 100vh;
  min-height: 100dvh;
  color: var(--ui-text);
  background: var(--ui-canvas);
  font-family: var(--ui-font-sans);
}

/* ---------- 外壳 ---------- */
.shell {
  display: grid;
  grid-template-columns: 208px minmax(0, 1fr);
  grid-template-areas: 'side main';
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--ui-canvas);
}
/* 已绑定：多出一列右侧栏（共同日历） */
.shell--rail {
  grid-template-columns: 208px minmax(0, 1fr) 300px;
  grid-template-areas: 'side main rail';
}

/* ---------- 右侧栏 ---------- */
.rail {
  grid-area: rail;
  padding: 20px 20px 24px 0;
  position: sticky;
  top: 0;
  align-self: start;
  max-height: 100vh;
  overflow-y: auto;
}
.rail :deep(.card) {
  background: var(--ui-surface);
  border: 1px solid var(--ui-line);
  border-radius: var(--ui-radius);
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.rail :deep(.card-title) {
  font-weight: 600;
}
.rail :deep(.hint) {
  color: var(--ui-text-subtle);
}
.rail :deep(.btn) {
  min-height: 34px;
  border-radius: var(--ui-radius);
  background: var(--ui-accent);
  box-shadow: none;
  color: var(--ui-on-accent);
  transform: none;
}
.rail :deep(.btn--ghost) {
  border: 1px solid var(--ui-line);
  background: transparent;
  color: var(--ui-text-muted);
}
.rail :deep(.btn:disabled) {
  opacity: 0.55;
}
.rail :deep(.inp) {
  border-color: var(--ui-line);
  border-radius: var(--ui-radius);
  background: var(--ui-surface-2);
}

/* ---------- 侧栏 ---------- */
.side {
  grid-area: side;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px 14px;
  background: var(--ui-sidebar);
  border-right: 1px solid var(--ui-line);
  position: sticky;
  top: 0;
  height: 100dvh;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 4px;
}
.brand__mark {
  width: 32px;
  height: 32px;
  border-radius: var(--ui-radius);
  background: var(--ui-brand-mark);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--ui-shadow);
  flex: 0 0 auto;
}
.brand__txt {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.3;
}
.brand__txt b {
  font-size: 14px;
  font-weight: 650;
}
.brand__txt i {
  font-size: 12px;
  color: var(--ui-text-subtle);
  font-style: normal;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav__item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 8px 12px;
  border-radius: var(--ui-radius);
  font-size: 13px;
  color: var(--ui-text-muted);
  transition: color var(--ui-duration-fast) var(--ui-ease-out),
    background-color var(--ui-duration-fast) var(--ui-ease-out);
}
.nav__item--on {
  background: var(--ui-accent-soft);
  color: var(--ui-accent);
  font-weight: 650;
}
.side__foot {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--ui-line);
}
.me {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}
.me__av {
  width: 34px;
  height: 34px;
  border-radius: var(--ui-radius-pill);
  background: var(--ui-accent);
  color: var(--ui-on-accent);
  font-size: 13px;
  font-weight: 650;
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
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.me__info i {
  font-size: 12px;
  color: var(--ui-text-subtle);
  font-style: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.me__out {
  min-height: 32px;
  padding: 5px 10px;
  border: 1px solid var(--ui-line);
  border-radius: var(--ui-radius);
  background: transparent;
  color: var(--ui-text-muted);
  font-size: 12px;
  transition: color var(--ui-duration-fast) var(--ui-ease-out),
    border-color var(--ui-duration-fast) var(--ui-ease-out);
}
.me--link {
  color: inherit;
  text-decoration: none;
  border-radius: var(--ui-radius);
}

/* ---------- 情侣空间：只读视图提示条 ---------- */
.view-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 12px 28px 0;
  padding: 10px 12px;
  border: 1px solid var(--ui-line);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
  font-size: 13px;
  color: var(--ui-text-muted);
}
.view-bar__copy {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.view-bar b {
  color: var(--ui-text);
  font-weight: 600;
}
.view-bar__action {
  flex: 0 0 auto;
  min-height: 32px;
  padding: 5px 10px;
  border: 1px solid var(--ui-line);
  border-radius: var(--ui-radius);
  background: transparent;
  color: var(--ui-text-muted);
  font-size: 12px;
}

/* ---------- 主区 ---------- */
.main {
  grid-area: main;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  padding: calc(16px + env(safe-area-inset-top, 0px)) 28px 0;
}
.topbar__title {
  font-size: 16px;
  font-weight: 650;
}
.topbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  padding: 0;
  border: 1px solid var(--ui-line);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
  color: var(--ui-text-muted);
  transition: color var(--ui-duration-fast) var(--ui-ease-out),
    border-color var(--ui-duration-fast) var(--ui-ease-out),
    transform var(--ui-duration-fast) var(--ui-ease-out);
}
.icon-button:active {
  transform: scale(0.97);
}
.main__body {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 16px 28px 40px;
  min-width: 0;
}

/* ---------- 移动端 tabbar ---------- */
.tabbar {
  display: none;
}

/* ---------- 更多菜单 ---------- */
.more-layer {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 12px
    calc(12px + env(safe-area-inset-bottom, 0px));
  background: var(--ui-overlay);
}
.more-sheet {
  width: min(100%, 520px);
  max-height: min(82vh, 680px);
  overflow-y: auto;
  padding: 18px;
  border: 1px solid var(--ui-line);
  border-radius: var(--ui-radius-lg);
  background: var(--ui-surface);
  box-shadow: 0 18px 48px -24px rgba(13, 20, 17, 0.45);
}
.more-sheet__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.more-sheet__head h2 {
  font-size: 20px;
  line-height: 1.25;
  font-weight: 650;
  color: var(--ui-text);
}
.more-sheet__head p {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ui-text-subtle);
}
.more-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.more-link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 10px 12px;
  border: 1px solid var(--ui-line);
  border-radius: var(--ui-radius);
  color: var(--ui-text);
  font-size: 13px;
  font-weight: 500;
  transition: background-color var(--ui-duration-fast) var(--ui-ease-out),
    border-color var(--ui-duration-fast) var(--ui-ease-out);
}
.more-link svg {
  color: var(--ui-text-muted);
}
.more-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ui-line);
}
.more-action {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  min-height: 44px;
  padding: 8px 10px;
  border: 0;
  border-radius: var(--ui-radius);
  background: var(--ui-surface-2);
  color: var(--ui-text-muted);
  font-size: 13px;
  text-align: left;
}
.more-action--danger {
  color: var(--ui-danger);
}
.more-enter-active,
.more-leave-active {
  transition: opacity var(--ui-duration-base) var(--ui-ease-out);
}
.more-enter-active .more-sheet {
  transition: transform var(--ui-duration-slow) var(--ui-ease-out);
}
.more-leave-active .more-sheet {
  transition: transform var(--ui-duration-fast) ease-out;
}
.more-enter-from,
.more-leave-to {
  opacity: 0;
}
.more-enter-from .more-sheet,
.more-leave-to .more-sheet {
  transform: translateY(100%);
}

/* ---------- 响应式 ---------- */
@media (max-width: 1240px) {
  .shell--rail {
    grid-template-columns: 208px minmax(0, 1fr);
    grid-template-areas:
      'side main'
      'side rail';
  }
  .rail {
    position: static;
    max-height: none;
    overflow: visible;
    max-width: 400px;
    padding: 0 28px 40px;
  }
}

@media (max-width: 960px) {
  .shell,
  .shell--rail {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'main'
      'rail';
  }
  .side {
    display: none;
  }
  .main__body {
    padding: 12px 16px 92px;
  }
  .topbar {
    min-height: 62px;
    padding: calc(10px + env(safe-area-inset-top, 0px)) 16px 0;
  }
  .view-bar {
    margin: 10px 16px 0;
  }
  .rail {
    max-width: none;
    padding: 0 16px 92px;
  }
  .tabbar {
    display: flex;
    align-items: stretch;
    gap: 2px;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 30;
    padding: 6px 6px calc(6px + env(safe-area-inset-bottom));
    background: var(--ui-surface);
    border-top: 1px solid var(--ui-line);
  }
  .tabbar__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-width: 0;
    padding: 5px 2px;
    border: 0;
    border-radius: var(--ui-radius);
    background: transparent;
    color: var(--ui-text-subtle);
    font-size: 12px;
    line-height: 1.2;
    min-height: 44px;
    text-decoration: none;
    transition: color var(--ui-duration-fast) var(--ui-ease-out),
      background-color var(--ui-duration-fast) var(--ui-ease-out);
  }
  .tabbar__item--on {
    background: var(--ui-accent-soft);
    color: var(--ui-accent);
    font-weight: 650;
  }
}

@media (hover: hover) and (pointer: fine) {
  .nav__item:hover {
    background: var(--ui-surface-2);
    color: var(--ui-text);
  }
  .nav__item--on:hover {
    background: var(--ui-accent-soft);
    color: var(--ui-accent);
  }
  .icon-button:hover,
  .me__out:hover,
  .view-bar__action:hover {
    border-color: var(--ui-line-strong);
    color: var(--ui-text);
  }
  .me--link:hover {
    background: var(--ui-surface-2);
  }
  .more-link:hover {
    border-color: var(--ui-line-strong);
    background: var(--ui-surface-2);
  }
  .more-action:hover {
    background: var(--ui-line);
  }
}

@media (max-width: 560px) {
  .topbar__title {
    font-size: 15px;
  }
  .view-bar {
    align-items: flex-start;
    flex-direction: column;
  }
  .more-sheet {
    padding: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .more-enter-active .more-sheet,
  .more-leave-active .more-sheet {
    transition: none;
  }
  .more-enter-from .more-sheet,
  .more-leave-to .more-sheet {
    transform: none;
  }
}

@media (pointer: coarse) {
  .rail :deep(.btn) {
    min-height: 44px;
  }
}
</style>
