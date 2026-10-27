<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { coupleApi } from '../api'
import { useCoupleStore } from '../stores/couple'
import { toast } from '../utils/toast'
import ConfirmModal from './ConfirmModal.vue'

/**
 * 情侣共同日历（右侧栏）。
 * 一天一条记录，双方读写同一份：谁能改谁写的没有区分——这是刻意的。
 */
const MAX = 300
const WEEK = ['一', '二', '三', '四', '五', '六', '日']

const couple = useCoupleStore()

const cur = ref(new Date())
const records = ref({})
const sel = ref(todayKey())
const draft = ref('')
const loading = ref(false)
const busy = ref(false)
const askClear = ref(false)

const y = computed(() => cur.value.getFullYear())
const m = computed(() => cur.value.getMonth() + 1)
const monthKey = computed(() => `${y.value}-${pad(m.value)}`)
const title = computed(() => `${y.value} 年 ${m.value} 月`)

const dayRec = computed(() => records.value[sel.value] || null)
const monthCount = computed(() => Object.keys(records.value).length)
const dirty = computed(() => draft.value.trim() !== (dayRec.value?.content || ''))
const canSave = computed(() => dirty.value && !busy.value && couple.bound)

const selLabel = computed(() => {
  const [yy, mm, dd] = sel.value.split('-').map(Number)
  const wd = '日一二三四五六'[new Date(yy, mm - 1, dd).getDay()]
  return `${mm} 月 ${dd} 日 · 周${wd}`
})

const stampText = computed(() => {
  const s = dayRec.value?.updatedAt || ''
  return s ? s.slice(5) : ''
})

const cells = computed(() => {
  const offset = (new Date(y.value, m.value - 1, 1).getDay() + 6) % 7 // 周一开头
  const total = new Date(y.value, m.value, 0).getDate()
  const t = todayKey()
  const list = []
  for (let i = 0; i < offset; i++) list.push({ key: `blank-${i}`, blank: true })
  for (let d = 1; d <= total; d++) {
    const key = `${monthKey.value}-${pad(d)}`
    list.push({ key, d, has: !!records.value[key], today: key === t })
  }
  return list
})

function pad(n) {
  return String(n).padStart(2, '0')
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function syncDraft() {
  draft.value = dayRec.value?.content || ''
}

async function load(month = monthKey.value, silent = false) {
  if (!couple.bound) return
  if (!silent) loading.value = true
  try {
    const res = await coupleApi.calendar(month)
    if (month !== monthKey.value) return // 切月后旧响应丢掉
    const map = {}
    for (const r of res?.records || []) map[r.date] = r
    records.value = map
    syncDraft()
  } catch (e) {
    if (!silent) toast.err(e.message)
  } finally {
    loading.value = false
  }
}

/** 保存当前这天；silent 用于切换日期前的自动提交 */
async function commit(silent = false) {
  if (!couple.bound || busy.value) return true
  const day = sel.value
  const content = draft.value.trim()
  busy.value = true
  try {
    const res = await coupleApi.saveCalendarDay({ date: day, content })
    if (res) {
      records.value = { ...records.value, [day]: res }
      if (!silent) toast.ok('已保存，TA 刷新就能看到')
    } else {
      const next = { ...records.value }
      delete next[day]
      records.value = next
      if (!silent) toast.info('这天的记录已清空')
    }
    draft.value = content
    return true
  } catch (e) {
    toast.err(e.message)
    return false
  } finally {
    busy.value = false
  }
}

async function pick(c) {
  if (c.blank || c.key === sel.value) return
  if (dirty.value && !busy.value) {
    const ok = await commit(true)
    if (!ok) return // 存不上就别切走，避免把刚写的丢掉
  }
  sel.value = c.key
  syncDraft()
}

async function shiftMonth(delta) {
  if (dirty.value && !busy.value) {
    const ok = await commit(true)
    if (!ok) return
  }
  const d = new Date(y.value, m.value - 1 + delta, 1)
  cur.value = d
  const today = new Date()
  const sameMonth = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
  sel.value = sameMonth ? todayKey() : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
  syncDraft()
  load()
}

async function goToday() {
  if (dirty.value && !busy.value) {
    const ok = await commit(true)
    if (!ok) return
  }
  cur.value = new Date()
  sel.value = todayKey()
  syncDraft()
  load()
}

async function doClear() {
  busy.value = true
  try {
    await coupleApi.removeCalendarDay(sel.value)
    const next = { ...records.value }
    delete next[sel.value]
    records.value = next
    draft.value = ''
    toast.info('已清空这天')
  } catch (e) {
    toast.err(e.message)
  } finally {
    busy.value = false
  }
}

/** 切回页面时静默刷新，顺便把 TA 刚写的东西带回来 */
function onVisible() {
  if (document.visibilityState === 'visible' && couple.bound && !dirty.value && !busy.value) {
    load(monthKey.value, true)
  }
}

watch(
  () => couple.bound,
  (v) => {
    if (v) {
      cur.value = new Date()
      sel.value = todayKey()
      load()
    }
  }
)

onMounted(() => {
  load()
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))
</script>

<template>
  <section class="card cal" :class="{ 'cal--loading': loading }">
    <header class="cal__head">
      <span class="cal__badge" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.8 5.8a5.2 5.2 0 0 0-7.4 0L12 7.2l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 22l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z" />
        </svg>
      </span>
      <span class="cal__headtxt">
        <b>我们的日历</b>
        <i>哪天干了什么，双方都能写、都能改</i>
      </span>
    </header>

    <div class="cal__nav">
      <button class="cal__arrow" aria-label="上个月" @click="shiftMonth(-1)">‹</button>
      <span class="cal__month">{{ title }}</span>
      <button class="cal__arrow" aria-label="下个月" @click="shiftMonth(1)">›</button>
      <button class="cal__today" @click="goToday">今天</button>
    </div>

    <div class="cal__week">
      <span v-for="w in WEEK" :key="w">{{ w }}</span>
    </div>

    <div class="cal__grid">
      <template v-for="c in cells" :key="c.key">
        <span v-if="c.blank" class="cal__cell cal__cell--blank" />
        <button
          v-else
          type="button"
          class="cal__cell"
          :class="{ 'cal__cell--on': c.key === sel, 'cal__cell--today': c.today, 'cal__cell--has': c.has }"
          :title="c.has ? records[c.key].content : ''"
          :aria-label="`${c.key}${c.has ? '，有记录' : ''}`"
          @click="pick(c)"
        >
          {{ c.d }}
          <i v-if="c.has" class="cal__dot" />
        </button>
      </template>
    </div>

    <div class="cal__day">
      <div class="cal__dayhead">
        <b>{{ selLabel }}</b>
        <span v-if="dayRec" class="cal__who" :title="`最后编辑：${dayRec.editorName}`">
          {{ dayRec.editorName }} · {{ stampText }}
        </span>
        <span v-else class="cal__who">空着</span>
      </div>

      <textarea
        v-model="draft"
        class="inp cal__ta"
        rows="4"
        :maxlength="MAX"
        placeholder="这天一起做了什么？"
        :aria-label="`${selLabel} 的共同记录`"
        :disabled="!couple.bound"
      />

      <div class="cal__foot">
        <span class="cal__count">
          {{ draft.trim().length }}/{{ MAX }}<template v-if="dirty"> · 未保存</template>
        </span>
        <span class="cal__acts">
          <button v-if="dayRec" class="btn btn--ghost btn--sm" :disabled="busy" @click="askClear = true">
            清空
          </button>
          <button class="btn btn--sm" :disabled="!canSave" @click="commit(false)">
            {{ busy ? '保存中…' : '保存' }}
          </button>
        </span>
      </div>
    </div>

    <p class="cal__sum">
      本月已记录 <b>{{ monthCount }}</b> 天 · 你俩看到的是同一份
    </p>

    <ConfirmModal
      v-model="askClear"
      title="清空这天的记录？"
      :text="`${selLabel} 的内容会被删除，${couple.partner?.nickname || 'TA'} 那边也看不到了。`"
      confirm-text="清空"
      @confirm="doClear"
    />
  </section>
</template>

<style scoped>
.cal {
  padding: 16px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: opacity var(--ui-duration-base) var(--ui-ease-out);
}
.cal--loading {
  opacity: 0.55;
}

/* ---------- 头部 ---------- */
.cal__head {
  display: flex;
  align-items: center;
  gap: 9px;
}
.cal__badge {
  width: 34px;
  height: 34px;
  border-radius: var(--ui-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ui-accent-soft);
  color: var(--ui-accent);
  flex: 0 0 auto;
}
.cal__headtxt {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  min-width: 0;
}
.cal__headtxt b {
  font-size: 14px;
  font-weight: 650;
}
.cal__headtxt i {
  font-size: 12px;
  color: var(--ui-text-subtle);
  font-style: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- 月份导航 ---------- */
.cal__nav {
  display: flex;
  align-items: center;
  gap: 4px;
}
.cal__arrow {
  width: 32px;
  height: 32px;
  border: 1px solid var(--ui-line);
  border-radius: var(--ui-radius);
  background: var(--card-soft);
  color: var(--ui-text-muted);
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: color var(--ui-duration-fast) var(--ui-ease-out),
    border-color var(--ui-duration-fast) var(--ui-ease-out),
    background-color var(--ui-duration-fast) var(--ui-ease-out);
}
.cal__month {
  font-size: 13px;
  font-weight: 600;
  padding: 0 2px;
}
.cal__today {
  margin-left: auto;
  border: 1px solid transparent;
  background: var(--ui-accent-soft);
  color: var(--ui-accent);
  font-size: 12px;
  padding: 5px 8px;
  border-radius: var(--ui-radius-sm);
}

/* ---------- 日历网格 ---------- */
.cal__week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 2px;
}
.cal__week span {
  text-align: center;
  font-size: 12px;
  color: var(--ui-text-subtle);
  padding-bottom: 1px;
}
.cal__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 2px;
}
.cal__cell {
  position: relative;
  aspect-ratio: 1 / 1;
  min-height: 32px;
  border: none;
  border-radius: var(--ui-radius-sm);
  background: transparent;
  color: var(--ui-text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--ui-duration-fast) var(--ui-ease-out),
    color var(--ui-duration-fast) var(--ui-ease-out);
}
.cal__cell--blank {
  pointer-events: none;
}
.cal__cell--has {
  color: var(--ui-accent);
  font-weight: 600;
  background: var(--ui-accent-soft);
}
.cal__cell--today {
  box-shadow: inset 0 0 0 1px var(--ui-accent);
}
.cal__cell--on {
  background: var(--ui-accent);
  color: var(--ui-on-accent);
  font-weight: 650;
  box-shadow: none;
}
.cal__dot {
  position: absolute;
  bottom: 3px;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--ui-signal-coral);
}
.cal__cell--on .cal__dot {
  background: var(--ui-on-accent);
}

/* ---------- 当日编辑 ---------- */
.cal__day {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-top: 10px;
  border-top: 1px solid var(--ui-line);
}
.cal__dayhead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
}
.cal__dayhead b {
  font-size: 13px;
  font-weight: 600;
}
.cal__who {
  font-size: 12px;
  color: var(--ui-text-subtle);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cal__ta {
  font-size: 13px;
  padding: 9px 11px;
  min-height: 78px;
  line-height: 1.65;
  border-radius: var(--ui-radius);
  resize: vertical;
}
.cal__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.cal__count {
  font-size: 12px;
  color: var(--ui-text-subtle);
  font-variant-numeric: tabular-nums;
}
.cal__acts {
  display: flex;
  gap: 6px;
}
.cal__sum {
  font-size: 12px;
  color: var(--ui-text-subtle);
  text-align: center;
}
.cal__sum b {
  color: var(--ui-text);
  font-weight: 600;
}

@media (hover: hover) and (pointer: fine) {
  .cal__arrow:hover {
    border-color: var(--ui-line-strong);
    background: var(--ui-surface-2);
    color: var(--ui-accent);
  }
  .cal__today:hover {
    border-color: var(--ui-line);
  }
  .cal__cell:hover {
    background: var(--hover-c);
    color: var(--ui-accent);
  }
  .cal__cell--on:hover {
    color: var(--ui-on-accent);
    background: var(--ui-accent-hover);
  }
}

@media (pointer: coarse) {
  .cal__today,
  .cal__cell {
    min-height: 44px;
  }
  .cal__today {
    min-width: 44px;
  }
}
</style>
