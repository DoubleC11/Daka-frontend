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
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', isDark.value ? '#0E1116' : '#F6F7FC')
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
    axisLine: dark ? '#2B3140' : '#DCE3ED',
    splitLine: dark ? '#2A3543' : '#EDF0FA',
    label: dark ? '#A8B4C4' : '#626B86',
    legend: dark ? '#B8C2D0' : '#5F6B7D',
    muted: dark ? '#46556A' : '#A8B4C4',
    pieBorder: dark ? '#151B24' : '#FFFFFF',
    income: dark ? '#F87171' : '#DC2626',
    expense: dark ? '#6ED44F' : '#2E7D32',
    expenseArea: dark ? 'rgba(110,212,79,0.22)' : 'rgba(46,125,50,0.18)',
    expenseAreaFade: dark ? 'rgba(110,212,79,0.02)' : 'rgba(46,125,50,0.02)'
  }
}
