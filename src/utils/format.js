/* ---------- 日期 ---------- */
export function ymd(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d)
  const p = (n) => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`
}

export function ym(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`
}

export function today() {
  return ymd()
}

export function thisMonth() {
  return ym()
}

/** 2026-09-28 -> 9月28日 */
export function monthDay(s) {
  if (!s) return ''
  const [, m, d] = String(s).slice(0, 10).split('-')
  return `${Number(m)}月${Number(d)}日`
}

/** 2026-09 -> 2026年9月 */
export function monthLabel(s) {
  if (!s) return ''
  const [y, m] = String(s).split('-')
  return `${y}年${Number(m)}月`
}

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
export function weekName(d = new Date()) {
  return WEEK[(d instanceof Date ? d : new Date(d)).getDay()]
}

/** 相对日期文案 */
export function relativeDate(s) {
  if (!s) return ''
  const t = today()
  if (s === t) return '今天'
  const diff = Math.round((new Date(s) - new Date(t)) / 86400000)
  if (diff === 1) return '明天'
  if (diff === -1) return '昨天'
  if (diff < 0) return `逾期 ${-diff} 天`
  if (diff <= 7) return `${diff} 天后`
  return monthDay(s)
}

export function isOverdue(s) {
  return !!s && s < today()
}

/* ---------- 金额 ---------- */
export function money(n) {
  const v = Number(n || 0)
  return v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** 大额简写：12345 -> 1.23万 */
export function moneyShort(n) {
  const v = Number(n || 0)
  if (Math.abs(v) >= 10000) return (v / 10000).toFixed(2) + '万'
  return money(v)
}

/* ---------- 其他 ---------- */
export function pct(n, digits = 0) {
  return `${Number(n || 0).toFixed(digits)}%`
}

/** 按颜色名取渐变色，找不到回落主色 */
export function colorVar(name) {
  const key = String(name || '').trim()
  const map = {
    紫: 'violet', 蓝: 'sky', 绿: 'emerald', 橙: 'orange',
    粉: 'pink', 红: 'rose', 青: 'teal', 黄: 'amber',
    靛: 'indigo', 灰: 'gray', 天蓝: 'cyan'
  }
  if (/^#[0-9a-fA-F]{3,8}$/.test(key)) return key
  return `var(--c-${map[key] || 'indigo'})`
}

export function colorGradVar(name) {
  const key = String(name || '').trim()
  const map = {
    紫: 'violet', 蓝: 'sky', 绿: 'emerald', 橙: 'orange',
    粉: 'pink', 红: 'rose', 青: 'teal', 黄: 'amber',
    靛: 'indigo', 灰: 'gray', 天蓝: 'cyan'
  }
  if (/^#[0-9a-fA-F]{3,8}$/.test(key)) return key
  return `var(--c-${map[key] || 'indigo'}-g)`
}

/** 生成 n 个月的选项，从当前月往前 */
export function monthOptions(n = 6) {
  const out = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({ value: ym(d), label: `${d.getFullYear()}年${d.getMonth() + 1}月` })
  }
  return out
}

/**
 * 主题色 -> 真实色值。
 * ECharts 用 canvas 绘制，解析不了 CSS 变量，图表必须用这里返回的 hex。
 */
const COLOR_HEX = {
  violet: '#8B5CF6', sky: '#0EA5E9', emerald: '#10B981', amber: '#F59E0B',
  orange: '#F97316', pink: '#EC4899', rose: '#E11D48', teal: '#14B8A6',
  cyan: '#06B6D4', indigo: '#6366F1', gray: '#94A3B8'
}
const NAME_TO_KEY = {
  紫: 'violet', 蓝: 'sky', 绿: 'emerald', 橙: 'orange', 粉: 'pink',
  红: 'rose', 青: 'teal', 黄: 'amber', 靛: 'indigo', 灰: 'gray', 天蓝: 'cyan'
}

export function hexColor(name, fallback = '#6366F1') {
  const key = String(name || '').trim()
  const hit = COLOR_HEX[key] || COLOR_HEX[NAME_TO_KEY[key]]
  return hit || fallback
}

export function greeting(name) {
  const h = new Date().getHours()
  const hello = h < 6 ? '凌晨好' : h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'
  return name ? `${hello}，${name}` : hello
}
