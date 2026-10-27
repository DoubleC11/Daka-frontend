<script setup>
import { ref, computed, onMounted } from 'vue'
import { goalApi, exportCsv } from '../api'
import { toast } from '../utils/toast'
import { today, relativeDate, isOverdue } from '../utils/format'
import Modal from '../components/Modal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'

const COLOR_KEYS = ['violet', 'sky', 'emerald', 'amber', 'orange', 'pink', 'rose', 'teal', 'cyan', 'indigo', 'gray']
const PALETTE = COLOR_KEYS

const STATUS = {
  1: { label: '进行中', chip: 'chip--on' },
  2: { label: '已完成', chip: 'chip--fresh' },
  3: { label: '已放弃', chip: 'chip--outline' }
}

const exporting = ref(false)

async function doExport() {
  if (exporting.value) return
  exporting.value = true
  try {
    await exportCsv('/export/goals', `目标进度_${today()}.csv`)
    toast.ok('已导出')
  } catch (e) {
    toast.err(e.message)
  } finally {
    exporting.value = false
  }
}

const loading = ref(true)
const goals = ref([])
const filter = ref('all')
const showForm = ref(false)
const editing = ref(null)
const form = ref({ title: '', targetValue: 100, currentValue: 0, unit: '', color: 'violet', deadline: '' })
const quick = ref({ id: 0, value: 1 })

function gcolor(g, suffix = '-g') {
  const c = String(g.color || 'violet').trim()
  return COLOR_KEYS.includes(c) ? `var(--c-${c}${suffix})` : 'var(--c-indigo' + suffix + ')'
}

function percent(g) {
  const t = Number(g.targetValue || 0)
  if (!t) return 0
  return Math.min(100, Math.round((Number(g.currentValue || 0) / t) * 1000) / 10)
}

const filtered = computed(() => {
  if (filter.value === 'all') return goals.value
  return goals.value.filter((g) => g.status === Number(filter.value))
})

const summary = computed(() => {
  const running = goals.value.filter((g) => g.status === 1)
  const done = goals.value.filter((g) => g.status === 2)
  const overdue = running.filter((g) => isOverdue(g.deadline))
  const avg = running.length
    ? running.reduce((s, g) => s + percent(g), 0) / running.length
    : 0
  return { running: running.length, done: done.length, overdue: overdue.length, avg }
})

async function load() {
  loading.value = true
  try {
    goals.value = await goalApi.list()
  } catch (e) {
    toast.err(e.message)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { title: '', targetValue: 100, currentValue: 0, unit: '', color: 'violet', deadline: '' }
  showForm.value = true
}
function openEdit(g) {
  editing.value = g
  form.value = {
    title: g.title,
    targetValue: Number(g.targetValue || 0),
    currentValue: Number(g.currentValue || 0),
    unit: g.unit || '',
    color: g.color || 'violet',
    deadline: g.deadline || ''
  }
  showForm.value = true
}

async function save() {
  const title = form.value.title.trim()
  if (!title) return toast.err('请填写目标名称')
  const payload = {
    title,
    targetValue: Number(form.value.targetValue) || 1,
    currentValue: Number(form.value.currentValue) || 0,
    unit: form.value.unit.trim(),
    color: form.value.color,
    deadline: form.value.deadline || null
  }
  try {
    if (editing.value) await goalApi.update(editing.value.id, payload)
    else await goalApi.create(payload)
    showForm.value = false
    toast.ok(editing.value ? '已更新' : '已创建')
    await load()
  } catch (e) {
    toast.err(e.message)
  }
}

/** 快捷推进进度 */
async function bump(g, delta) {
  const next = Math.max(0, Number(g.currentValue || 0) + delta)
  try {
    const updated = await goalApi.update(g.id, {
      title: g.title,
      targetValue: Number(g.targetValue),
      currentValue: next,
      unit: g.unit,
      color: g.color,
      deadline: g.deadline
    })
    Object.assign(g, updated)
    if (updated.status === 2 && g.status !== 2) toast.ok(`「${g.title}」已达成`)
  } catch (e) {
    toast.err(e.message)
  }
}

async function setStatus(g, status) {
  try {
    const updated = await goalApi.update(g.id, {
      title: g.title,
      targetValue: Number(g.targetValue),
      currentValue: Number(g.currentValue || 0),
      unit: g.unit,
      color: g.color,
      deadline: g.deadline,
      status
    })
    Object.assign(g, updated)
    toast.ok(status === 2 ? '已标记完成' : status === 3 ? '已放弃该目标' : '已恢复进行中')
  } catch (e) {
    toast.err(e.message)
  }
}

/* v2：主题化二次确认 */
const delShow = ref(false)
const delText = ref('')
const delFn = ref(null)

function remove(g) {
  delText.value = `删除目标「${g.title}」？`
  delFn.value = () => doRemove(g)
  delShow.value = true
}
async function doRemove(g) {
  try {
    await goalApi.remove(g.id)
    showForm.value = false
    toast.ok('已删除')
    await load()
  } catch (e) {
    toast.err(e.message)
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <section class="grid g4 strip">
      <div class="card tile">
        <span class="tile__k">进行中</span>
        <b class="tile__v grad-text">{{ summary.running }}</b>
      </div>
      <div class="card tile">
        <span class="tile__k">已完成</span>
        <b class="tile__v" style="color: var(--ui-success)">{{ summary.done }}</b>
      </div>
      <div class="card tile">
        <span class="tile__k">平均进度</span>
        <b class="tile__v">{{ summary.avg.toFixed(1) }}<i class="tile__u">%</i></b>
      </div>
      <div class="card tile tile--act">
        <span class="tile__k">已逾期</span>
        <b class="tile__v" :style="{ color: summary.overdue ? 'var(--danger)' : 'var(--t1)' }">{{ summary.overdue }}</b>
        <button class="btn btn--sm tile__btn" @click="openCreate">+ 新目标</button>
      </div>
    </section>

    <section class="card">
      <div class="row--between head">
        <div class="seg">
          <button v-for="f in [{ v: 'all', t: '全部' }, { v: '1', t: '进行中' }, { v: '2', t: '已完成' }, { v: '3', t: '已放弃' }]" :key="f.v"
            class="seg__item" :class="{ 'seg__item--on': filter === f.v }" @click="filter = f.v">{{ f.t }}</button>
        </div>
        <div class="row--between" style="gap: 10px">
          <button class="btn btn--ghost btn--sm" :disabled="exporting" @click="doExport">导出 CSV</button>
          <span class="hint">共 {{ filtered.length }} 个</span>
        </div>
      </div>

      <div v-if="loading" class="empty">加载中…</div>
      <div v-else-if="!filtered.length" class="empty">
        <span class="empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="8.5" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </span>
        <b>还没有目标</b>
        点右上角创建第一个吧
      </div>
      <div v-else class="gl">
        <article v-for="g in filtered" :key="g.id" class="gcard"
          :class="{ 'is-done': g.status === 2, 'is-off': g.status === 3 }">
          <header class="gcard__head">
            <span class="gcard__bar" :style="{ background: gcolor(g) }" />
            <b class="gcard__title" :title="g.title">{{ g.title }}</b>
            <span class="chip" :class="STATUS[g.status]?.chip">{{ STATUS[g.status]?.label }}</span>
            <span class="spacer" />
            <button class="mini" @click="openEdit(g)">编辑</button>
          </header>

          <div class="gcard__nums">
            <b>{{ Number(g.currentValue || 0) }}</b>
            <span class="gcard__of">/ {{ Number(g.targetValue || 0) }} {{ g.unit || '' }}</span>
            <span class="spacer" />
            <span class="gcard__pct">{{ percent(g) }}%</span>
          </div>

          <div class="bar bar--thick gcard__barwrap">
            <i :style="{ width: percent(g) + '%', background: gcolor(g) }" />
          </div>

          <footer class="gcard__foot">
            <span class="hint" :class="{ 'is-over': g.status === 1 && isOverdue(g.deadline) }">
              {{ g.deadline ? (g.status === 1 && isOverdue(g.deadline) ? '已逾期 · ' : '截止 ') + relativeDate(g.deadline) : '未设截止' }}
            </span>
            <span class="spacer" />
            <div v-if="g.status === 1" class="bump">
              <button class="bump__b" :aria-label="`${g.title}：进度减 1`" @click="bump(g, -1)">−</button>
              <button class="bump__b bump__b--plus" :aria-label="`${g.title}：进度加 1`"
                :style="{ background: gcolor(g) }" @click="bump(g, 1)">＋1</button>
              <button class="bump__b bump__b--done" :aria-label="`将${g.title}标记为达成`"
                @click="setStatus(g, 2)">达成</button>
              <button class="bump__b bump__b--off" :aria-label="`放弃目标${g.title}`"
                @click="setStatus(g, 3)">放弃</button>
            </div>
            <template v-else-if="g.status === 2">
              <button class="mini" @click="setStatus(g, 1)">重新开始</button>
            </template>
            <button v-else-if="g.status === 3" class="mini" @click="setStatus(g, 1)">恢复</button>
          </footer>
        </article>
      </div>
    </section>

    <Modal v-model="showForm" :title="editing ? '编辑目标' : '新建目标'">
      <div class="form">
        <label class="field">
          <span>目标名称</span>
          <input v-model="form.title" class="inp" placeholder="如：读完 12 本书" maxlength="50" />
        </label>
        <div class="form__row">
          <label class="field">
            <span>当前进度</span>
            <input v-model="form.currentValue" type="number" step="0.01" class="inp" />
          </label>
          <label class="field">
            <span>目标值</span>
            <input v-model="form.targetValue" type="number" step="0.01" inputmode="decimal" class="inp" />
          </label>
          <label class="field">
            <span>单位</span>
            <input v-model="form.unit" class="inp" placeholder="本 / 公里 / 元" maxlength="10" />
          </label>
        </div>
        <label class="field">
          <span>截止日期（可选）</span>
          <input v-model="form.deadline" type="date" class="inp" />
        </label>
        <div class="field">
          <span>主题色</span>
          <div class="swatches">
            <button v-for="c in PALETTE" :key="c" class="swatch" :class="{ 'is-on': form.color === c }"
              :aria-label="`选择${c}色`" type="button"
              :style="{ background: `var(--c-${c}-g)` }" @click="form.color = c" />
          </div>
        </div>
      </div>
      <template #footer>
        <button v-if="editing" class="btn btn--ghost btn--sm foot__del" @click="remove(editing)">删除</button>
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
.tile__u { font-size: 12px; font-weight: 400; color: var(--t3); font-style: normal; margin-left: 2px; }
.tile--act { justify-content: center; }
.tile__btn { align-self: flex-start; margin-top: 4px; }

.head { margin-bottom: var(--ui-space-3); }

/* ---------- 目标卡 ---------- */
.gl {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(288px, 1fr));
  gap: 13px;
}
.gcard {
  padding: 15px 16px;
  border: 1px solid transparent;
  border-radius: var(--ui-radius);
  background: var(--card-soft);
  display: flex;
  flex-direction: column;
  gap: 11px;
  transition: border-color var(--ui-duration-fast) var(--ui-ease-out),
    background-color var(--ui-duration-fast) var(--ui-ease-out);
}
.gcard.is-done { background: var(--ui-accent-soft); }
.gcard.is-off { opacity: 0.62; }
.gcard__head { display: flex; align-items: center; gap: 8px; }
.gcard__bar { width: 4px; height: 15px; border-radius: 3px; flex: 0 0 auto; }
.gcard__title {
  font-size: 13.5px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gcard__nums { display: flex; align-items: baseline; gap: 6px; }
.gcard__nums b { font-family: var(--ui-font-data); font-size: 22px; font-weight: 650; letter-spacing: 0; }
.gcard__of { min-width: 0; font-size: 12px; color: var(--t3); overflow-wrap: anywhere; }
.gcard__pct { font-size: 13px; font-weight: 600; }
.gcard__barwrap { height: 9px; border-radius: 5px; }
.gcard__foot { display: flex; align-items: center; gap: 8px; }
.is-over { color: var(--danger); }

.bump { display: flex; gap: 5px; }
.bump__b {
  border: 1px solid var(--line-c);
  background: var(--card-solid);
  border-radius: var(--ui-radius);
  padding: 5px 11px;
  font-size: 12px;
  color: var(--t2);
  transition: color var(--ui-duration-fast) var(--ui-ease-out),
    border-color var(--ui-duration-fast) var(--ui-ease-out),
    background-color var(--ui-duration-fast) var(--ui-ease-out);
}
.bump__b--plus { border-color: transparent; color: #fff; font-weight: 600; }
.bump__b--done { border-color: transparent; background: var(--ui-success); color: var(--ui-on-success); }

.mini {
  border: none;
  background: transparent;
  color: var(--ui-accent);
  font-size: 12px;
  padding: 3px 8px;
  border-radius: var(--ui-radius-sm);
}

/* ---------- 表单 ---------- */
.form { display: flex; flex-direction: column; gap: 15px; }
.form__row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.swatches { display: flex; flex-wrap: wrap; gap: 8px; }
.swatch { width: 28px; height: 28px; border-radius: var(--ui-radius); border: 2px solid transparent; transition: transform var(--ui-duration-fast) var(--ui-ease-out); }
.swatch.is-on { border-color: var(--ui-surface); box-shadow: 0 0 0 2px var(--ui-accent); }
.foot__del { color: var(--danger); border-color: var(--danger-line); }

@media (hover: hover) and (pointer: fine) {
  .gcard:hover { border-color: var(--ui-line-strong); }
  .bump__b:hover { border-color: var(--t3); color: var(--t1); }
  .bump__b--plus:hover { color: #fff; background: var(--ui-accent-hover); }
  .bump__b--done:hover { color: var(--ui-on-success); }
  .bump__b--off:hover { color: var(--danger); border-color: var(--danger-line); }
  .mini:hover { background: var(--ui-accent-soft); }
  .swatch:hover { transform: scale(1.1); }
}

@media (max-width: 1080px) {
  .grid.g4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 520px) {
  .grid.g4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .gl { grid-template-columns: minmax(0, 1fr); }
  .row--between.head {
    align-items: stretch;
    flex-direction: column;
  }
  .row--between.head .seg {
    width: 100%;
  }
  .row--between.head .seg__item {
    flex: 1;
    padding-inline: 8px;
  }
  .row--between.head > .row--between {
    flex-wrap: wrap;
  }
  .bump__b {
    min-height: 44px;
  }
  .gcard__nums,
  .gcard__foot,
  .bump {
    flex-wrap: wrap;
  }
  .swatch {
    width: 44px;
    height: 44px;
  }
  .form__row { grid-template-columns: minmax(0, 1fr); }
}
</style>
