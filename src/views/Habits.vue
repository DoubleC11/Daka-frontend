<script setup>
import { ref, computed, onMounted } from 'vue'
import { habitApi, exportCsv } from '../api'
import { toast } from '../utils/toast'
import { thisMonth, today, pct } from '../utils/format'
import { useTheme } from '../utils/theme'
import Modal from '../components/Modal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'

const { isDark } = useTheme()
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

const exporting = ref(false)

async function doExport() {
  if (exporting.value) return
  exporting.value = true
  try {
    await exportCsv(`/export/habit-records?month=${month.value}`, `习惯打卡_${month.value}.csv`)
    toast.ok('已导出')
  } catch (e) {
    toast.err(e.message)
  } finally {
    exporting.value = false
  }
}

/* v2：新写入一律英文键；读取兼容旧中文键 */
const PALETTE = [
  { key: 'violet', name: '紫' }, { key: 'sky', name: '蓝' }, { key: 'emerald', name: '绿' },
  { key: 'orange', name: '橙' }, { key: 'pink', name: '粉' }, { key: 'rose', name: '红' },
  { key: 'teal', name: '青' }, { key: 'amber', name: '黄' }, { key: 'indigo', name: '靛' },
  { key: 'cyan', name: '天蓝' }, { key: 'gray', name: '灰' }
]
const WEEK = ['一', '二', '三', '四', '五', '六', '日']

const loading = ref(true)
const habits = ref([])
const stats = ref(null)
const cal = ref(null)
const month = ref(thisMonth())
const checking = ref(0)

/* ---------- 弹窗 ---------- */
const showForm = ref(false)
const editing = ref(null)
const form = ref({ name: '', color: 'violet', iconText: '', archived: 0 })

function cvar(name) {
  const hit = PALETTE.find((p) => p.key === name || p.name === name)
  return `var(--c-${hit ? hit.key : 'indigo'})`
}
function cgrad(name) {
  const hit = PALETTE.find((p) => p.key === name || p.name === name)
  return `var(--c-${hit ? hit.key : 'indigo'}-g)`
}

/** 热力图数据按周对齐（首格前补空格，周一为起点） */
const calGrid = computed(() => {
  const days = cal.value?.days || []
  if (!days.length) return []
  const first = new Date(days[0].date)
  const pad = (first.getDay() + 6) % 7 // 周一=0
  return [...Array(pad).fill(null), ...days]
})

function heatBg(cell) {
  if (!cell) return 'transparent'
  if (cell.future) return isDark.value ? '#1C2430' : '#F3F5F9'
  if (!cell.count) return isDark.value ? '#232936' : '#EDF0FA'
  const a = 0.22 + Math.min(1, cell.ratio / 100) * 0.78
  return `rgba(79, 70, 229, ${a.toFixed(2)})`
}
function heatFg(cell) {
  if (!cell || cell.future || !cell.count) return 'var(--t3)'
  const a = 0.22 + Math.min(1, cell.ratio / 100) * 0.78
  return a > 0.62 ? '#fff' : 'var(--t1)'
}

async function load() {
  loading.value = true
  try {
    const [hs, st, c] = await Promise.all([
      habitApi.list(), habitApi.stats(), habitApi.calendar(month.value)
    ])
    habits.value = hs
    stats.value = st
    cal.value = c
  } catch (e) {
    toast.err(e.message)
  } finally {
    loading.value = false
  }
}

async function loadCalendar() {
  try {
    cal.value = await habitApi.calendar(month.value)
  } catch (e) {
    toast.err(e.message)
  }
}

async function toggle(h) {
  if (checking.value) return
  checking.value = h.id
  try {
    const done = await habitApi.check(h.id, { date: today(), done: !h.todayDone })
    h.todayDone = !!done
    // 打卡后连续天数/月历随之变化
    const [st, c] = await Promise.all([habitApi.stats(), habitApi.calendar(month.value)])
    stats.value = st
    cal.value = c
  } catch (e) {
    toast.err(e.message)
  } finally {
    checking.value = 0
  }
}

function openCreate() {
  editing.value = null
  form.value = { name: '', color: '紫', iconText: '', archived: 0 }
  showForm.value = true
}
function openEdit(h) {
  editing.value = h
  const hit = PALETTE.find((p) => p.key === h.color || p.name === h.color)
  form.value = { name: h.name, color: hit ? hit.key : 'violet', iconText: h.iconText || '', archived: 0 }
  showForm.value = true
}

async function save() {
  const name = form.value.name.trim()
  if (!name) return toast.err('请填写习惯名称')
  const payload = {
    name,
    color: form.value.color,
    iconText: form.value.iconText.trim() || firstGlyph(name),
    archived: 0
  }
  try {
    if (editing.value) await habitApi.update(editing.value.id, payload)
    else await habitApi.create(payload)
    showForm.value = false
    toast.ok(editing.value ? '已更新' : '已添加')
    await load()
  } catch (e) {
    toast.err(e.message)
  }
}

/* v2：主题化二次确认 */
const delShow = ref(false)
const delText = ref('')
const delFn = ref(null)

function removeHabit(h) {
  delText.value = `删除「${h.name}」及其全部打卡记录？`
  delFn.value = () => doRemove(h)
  delShow.value = true
}
async function doRemove(h) {
  try {
    await habitApi.remove(h.id)
    showForm.value = false
    toast.ok('已删除')
    await load()
  } catch (e) {
    toast.err(e.message)
  }
}

const todayIdx = computed(() => (new Date().getDay() + 6) % 7)

onMounted(load)
</script>

<template>
  <div class="page">
    <!-- 统计条 -->
    <section class="grid g4 strip">
      <div class="card tile">
        <span class="tile__k">本月打卡率</span>
        <b class="tile__v grad-text">{{ pct(stats?.monthRate || 0, 1) }}</b>
      </div>
      <div class="card tile">
        <span class="tile__k">今日完成</span>
        <b class="tile__v">
          {{ stats?.todayDone || 0 }}<i class="tile__u">/ {{ stats?.todayTotal || 0 }}</i>
        </b>
      </div>
      <div class="card tile">
        <span class="tile__k">最长连续</span>
        <b class="tile__v" style="color: var(--ui-warning)">{{ stats?.maxStreak || 0 }}<i class="tile__u">天</i></b>
        <span class="tile__f">{{ stats?.maxStreakHabit || '—' }}</span>
      </div>
      <div class="card tile tile--act">
        <span class="tile__k">习惯总数</span>
        <b class="tile__v">{{ habits.length }}</b>
        <button class="btn btn--sm tile__btn" @click="openCreate">+ 新习惯</button>
      </div>
    </section>

    <div class="cols">
      <!-- 习惯列表 -->
      <section class="card">
        <div class="row--between head">
          <h2 class="card-title">我的习惯</h2>
          <span class="hint">共 {{ habits.length }} 项</span>
        </div>

        <div v-if="loading" class="empty">加载中…</div>
        <div v-else-if="!habits.length" class="empty">
          <span class="empty__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12.5 9.5 17 19 7" />
            </svg>
          </span>
          <b>还没有习惯</b>
          点右上角「新习惯」开始第一个吧
        </div>
        <ul v-else class="hz">
          <li v-for="h in habits" :key="h.id" class="hz__item">
            <span class="icon-box" :style="{ background: cgrad(h.color) }">{{ h.iconText || firstGlyph(h.name) }}</span>

            <div class="hz__mid">
              <div class="hz__top">
                <b>{{ h.name }}</b>
                <span class="chip" :style="{ background: h.streak ? 'var(--warn-soft)' : '', color: h.streak ? 'var(--ui-warning)' : '' }">
                  {{ h.streak ? `连续 ${h.streak} 天` : '未连续' }}
                </span>
              </div>
              <div class="dots">
                <span v-for="(d, i) in (h.weekDots || [])" :key="i" class="dots__d"
                  :class="{ 'is-on': d, 'is-today': i === todayIdx }"
                  :style="d ? { background: cvar(h.color) } : {}" />
                <span class="dots__w">本周</span>
              </div>
            </div>

            <button class="check" :class="{ 'is-on': h.todayDone }"
              :aria-label="`${h.name}：${h.todayDone ? '取消今日打卡' : '完成今日打卡'}`"
              type="button"
              :style="h.todayDone ? { background: cgrad(h.color), borderColor: 'transparent' } : {}"
              :disabled="checking === h.id" @click="toggle(h)">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3"
                stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 9.5 17 19 7" /></svg>
            </button>

            <button class="hz__more" type="button" aria-label="编辑习惯" title="编辑" @click="openEdit(h)">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7"
                stroke-linecap="round"><path d="M12 5.5h.01M12 12h.01M12 18.5h.01" /></svg>
            </button>
          </li>
        </ul>
      </section>

      <!-- 右侧：月历 + 排行 -->
      <div class="side-col">
        <section class="card">
          <div class="row--between head">
            <h2 class="card-title">打卡月历</h2>
            <div class="row--between" style="gap: 8px">
              <button class="btn btn--ghost btn--sm" :disabled="exporting" @click="doExport">导出</button>
              <input v-model="month" type="month" class="inp inp--mini inp--month"
                aria-label="打卡月历月份" :max="thisMonth()" @change="loadCalendar" />
            </div>
          </div>

          <div v-if="cal" class="cal">
            <div class="cal__meta">
              <span>活跃 <b>{{ cal.activeDays }}</b> 天</span>
              <span>习惯 <b>{{ cal.totalHabits }}</b> 个</span>
              <span>完成率 <b class="grad-text">{{ pct(cal.rate, 1) }}</b></span>
            </div>

            <div class="cal__week">
              <span v-for="w in WEEK" :key="w">{{ w }}</span>
            </div>
            <div class="cal__grid">
              <span v-for="(c, i) in calGrid" :key="i" class="cal__cell"
                :class="{ 'is-empty': !c }" :style="{ background: heatBg(c), color: heatFg(c) }"
                :title="c ? `${c.date} · ${c.count} 项` : ''">{{ c ? c.day : '' }}</span>
            </div>

            <div class="cal__legend">
              <span class="hint">少</span>
              <i v-for="n in 4" :key="n" :style="{ background: `rgba(79,70,229,${0.2 + n * 0.2})` }" />
              <span class="hint">多</span>
            </div>
          </div>
        </section>

        <section class="card">
          <h2 class="card-title head">本月打卡排行</h2>
          <div v-if="!stats?.ranking?.length" class="empty">本月还没有打卡记录</div>
          <ul v-else class="rank">
            <li v-for="(r, i) in stats.ranking" :key="r.name" class="rank__row">
              <span class="rank__no" :class="`rank__no--${i + 1}`">{{ i + 1 }}</span>
              <span class="rank__mid">
                <span class="row--between">
                  <b>{{ r.name }}</b>
                  <span class="hint">{{ r.count }} 次</span>
                </span>
                <span class="bar bar--thin rank__bar">
                  <i :style="{ width: r.ratio + '%', background: cgrad(r.color) }" />
                </span>
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <!-- 表单 -->
    <Modal v-model="showForm" :title="editing ? '编辑习惯' : '新建习惯'">
      <div class="form">
        <label class="field">
          <span>习惯名称</span>
          <input v-model="form.name" class="inp" placeholder="如：早起、跑步 30 分钟" maxlength="20" />
        </label>
        <label class="field">
          <span>图标文字（1 个字）</span>
          <input v-model="form.iconText" class="inp" placeholder="不填自动取名称首字" maxlength="2" />
        </label>
        <div class="field">
          <span>主题色</span>
          <div class="swatches">
            <button v-for="p in PALETTE" :key="p.key" class="swatch" :title="p.name"
              :aria-label="`选择${p.name}色`" type="button"
              :class="{ 'is-on': form.color === p.key }"
              :style="{ background: `var(--c-${p.key}-g)` }" @click="form.color = p.key" />
          </div>
        </div>
      </div>
      <template #footer>
        <button v-if="editing" class="btn btn--ghost btn--sm foot__del" @click="removeHabit(editing)">删除</button>
        <span class="spacer" />
        <button class="btn btn--ghost btn--sm" @click="showForm = false">取消</button>
        <button class="btn btn--sm" @click="save">{{ editing ? '保存' : '创建' }}</button>
      </template>
    </Modal>

    <ConfirmModal v-model="delShow" :text="delText" @confirm="delFn && delFn()" />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: var(--ui-space-4); }

.tile { display: flex; flex-direction: column; gap: 5px; }
.tile__k { font-size: 12px; color: var(--t2); }
.tile__v { font-family: var(--ui-font-data); font-size: 24px; font-weight: 650; letter-spacing: 0; line-height: 1.15; }
.tile__u { font-size: 12px; font-weight: 400; color: var(--t3); font-style: normal; margin-left: 3px; }
.tile__f { font-size: 12px; color: var(--t3); }
.tile--act { justify-content: center; }
.tile__btn { align-self: flex-start; margin-top: 4px; }

.cols {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.95fr);
  gap: var(--ui-space-4);
  align-items: start;
}
.side-col { display: flex; flex-direction: column; gap: var(--ui-space-4); }
.head { margin-bottom: var(--ui-space-3); }

/* ---------- 习惯行 ---------- */
.hz { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.hz__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 13px;
  border: 1px solid transparent;
  border-radius: var(--ui-radius);
  background: var(--card-soft);
  transition: border-color var(--ui-duration-fast) var(--ui-ease-out),
    background-color var(--ui-duration-fast) var(--ui-ease-out);
}
.hz__mid { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.hz__top { display: flex; align-items: center; gap: 8px; }
.hz__top b { min-width: 0; font-size: 13px; font-weight: 500; overflow-wrap: anywhere; }

.dots { display: flex; align-items: center; gap: 5px; }
.dots__d {
  width: 15px;
  height: 15px;
  border-radius: var(--ui-radius-sm);
  background: var(--track-c);
  display: block;
}
.dots__d.is-today { box-shadow: 0 0 0 2px var(--ui-accent-soft); }
.dots__w { font-size: 12px; color: var(--t3); margin-left: 3px; }
.check {
  width: 32px;
  height: 32px;
  border-radius: var(--ui-radius);
  border: 1.6px solid var(--line-c);
  background: var(--card-solid);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  transition: background-color var(--ui-duration-fast) var(--ui-ease-out),
    border-color var(--ui-duration-fast) var(--ui-ease-out),
    transform var(--ui-duration-fast) var(--ui-ease-out);
}
.check svg { opacity: 0; transition: opacity 0.16s; }
.check.is-on svg { opacity: 1; }
.check:active { transform: scale(0.96); }
.check:disabled { opacity: 0.6; }

.hz__more {
  border: none;
  background: transparent;
  color: var(--t3);
  width: 26px;
  height: 26px;
  border-radius: var(--ui-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.risk { margin-top: 12px; }
.foot__del { color: var(--danger); border-color: var(--danger-line); }

/* 弹窗底部左侧的删除按钮需把其余按钮推右 */
:deep(.dialog__foot) { align-items: center; }

/* ---------- 月历 ---------- */
.cal__meta {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: var(--t2);
  margin-bottom: 12px;
}
.cal__meta b { color: var(--t1); font-weight: 600; }
.cal__week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  margin-bottom: 5px;
}
.cal__week span {
  text-align: center;
  font-size: 12px;
  color: var(--t3);
}
.cal__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}
.cal__cell {
  aspect-ratio: 1;
  border-radius: var(--ui-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: transform 0.14s;
}
.cal__cell.is-empty { background: transparent !important; }
.cal__legend {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 11px;
  justify-content: flex-end;
}
.cal__legend i { width: 12px; height: 12px; border-radius: 4px; display: block; }

/* ---------- 排行 ---------- */
.rank { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 11px; }
.rank__row { display: flex; align-items: center; gap: 10px; }
.rank__no {
  width: 21px;
  height: 21px;
  border-radius: var(--ui-radius-sm);
  background: var(--track-c);
  color: var(--t2);
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.rank__no--1 { background: var(--ui-signal-coral-soft); color: var(--ui-signal-coral); }
.rank__no--2 { background: var(--ui-accent-soft); color: var(--ui-accent); }
.rank__no--3 { background: var(--ui-signal-blue-soft); color: var(--ui-signal-blue); }
.rank__mid { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.rank__mid b { font-size: 12.5px; font-weight: 500; }

/* ---------- 其他 ---------- */
.inp--mini {
  width: auto;
  padding: 6px 12px;
  font-size: 12px;
  border-radius: var(--ui-radius);
  background: var(--card-soft);
}
.form { display: flex; flex-direction: column; gap: 15px; }
.swatches { display: flex; flex-wrap: wrap; gap: 8px; }
.swatch {
  width: 28px;
  height: 28px;
  border-radius: var(--ui-radius);
  border: 2px solid transparent;
  transition: transform 0.14s;
}
.swatch.is-on { border-color: var(--ui-surface); box-shadow: 0 0 0 2px var(--ui-accent); }

@media (hover: hover) and (pointer: fine) {
  .hz__item:hover { border-color: var(--ui-line-strong); }
  .hz__more:hover { background: var(--hover-c); color: var(--t1); }
  .cal__cell:not(.is-empty):hover { background: var(--ui-surface-2); }
  .swatch:hover { transform: scale(1.1); }
}

@media (max-width: 1080px) {
  .grid.g4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 860px) {
  .cols { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 520px) {
  .grid.g4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .check {
    width: 44px;
    height: 44px;
  }
  .hz__more {
    width: 44px;
    height: 44px;
  }
  .swatch {
    width: 44px;
    height: 44px;
  }
}
</style>
