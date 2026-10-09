import { ref, computed, watchEffect } from 'vue'

/**
 * 主题管理：auto（跟随系统）/ light / dark
 * 通过 <html data-theme="light|dark"> 驱动 CSS 变量切换。
 */
const KEY = 'daka_theme'

function initial() {
  const saved = localStorage.getItem(KEY)
  return saved === 'dark' || saved === 'light' ? saved : 'auto'
}

const mq = window.matchMedia?.('(prefers-color-scheme: dark)')

const theme = ref(initial())

/** 当前是否处于深色（auto 模式跟随系统） */
const isDark = computed(() =>
  theme.value === 'dark' || (theme.value === 'auto' && !!mq?.matches)
)

function apply() {
  document.documentElement.dataset.theme = isDark.value ? 'dark' : 'light'
}

watchEffect(apply)

// 系统切换时，auto 模式下实时响应
mq?.addEventListener?.('change', apply)

export function setTheme(t) {
  theme.value = t
  localStorage.setItem(KEY, t)
}

export function useTheme() {
  return { theme, isDark, setTheme }
}

/** 图表（canvas）无法使用 CSS 变量，按主题返回真实色值 */
export function chartPalette() {
  const dark = isDark.value
  return {
    axisLine: dark ? '#2B3140' : '#EDEDF3',
    splitLine: dark ? '#242A38' : '#F3F3F8',
    label: dark ? '#8B93A5' : '#9CA3AF',
    legend: dark ? '#9CA3AF' : '#6B7280',
    muted: dark ? '#3A4152' : '#CBD5E1',
    pieBorder: dark ? '#1B2029' : '#FFFFFF'
  }
}
