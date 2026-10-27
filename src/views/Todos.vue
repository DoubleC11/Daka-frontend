<script setup>
import { ref, computed, onMounted } from 'vue'
import { todoApi, goalApi, exportCsv } from '../api'
import ConfirmModal from '../components/ConfirmModal.vue'
import { toast } from '../utils/toast'
import { today, relativeDate, isOverdue } from '../utils/format'

const SCOPES = [
  { v: 'today', t: '今天' },
  { v: 'week', t: '本周' },
  { v: 'all', t: '全部未完成' },
  { v: 'done', t: '已完成' }
]
const TAGS = ['工作', '学习', '生活', '健康', '其他']

const loading = ref(true)
const list = ref([])
const goals = ref([])
const scope = ref('today')

const draft = ref({ title: '', tag: '', dueDate: today(), goalId: '' })
const adding = ref(false)
const busy = ref(0)

/* 编辑 */
const editing = ref(null)
const editForm = ref({ title: '', tag: '', dueDate: '', goalId: '' })

const goalMap = computed(() => {
  const m = {}
  goals.value.forEach((g) => (m[g.id] = g))
  return m
})

const exporting = ref(false)

async function doExport() {
  if (exporting.value) return
  exporting.value = true
  try {
    await exportCsv('/export/todos', `待办清单_${today()}.csv`)
    toast.ok('已导出')
  } catch (e) {
    toast.err(e.message)
  } finally {
    exporting.value = false
  }
}

const undone = computed(() => list.value.filter((t) => !t.done).length)

async function load() {
  loading.value = true
  try {
    const [ls, gs] = await Promise.all([todoApi.list(scope.value), goalApi.list()])
    list.value = ls
    goals.value = gs
  } catch (e) {
    toast.err(e.message)
  } finally {
    loading.value = false
  }
}

async function add() {
  const title = draft.value.title.trim()
  if (!title) {
    toast.err('请先输入待办内容')
    document.querySelector('.quick__inp')?.focus()
    return
  }
  if (adding.value) return
  adding.value = true
  try {
    await todoApi.create({
      title,
      tag: draft.value.tag || null,
      dueDate: draft.value.dueDate || null,
      goalId: draft.value.goalId ? Number(draft.value.goalId) : null
    })
    draft.value.title = ''
    toast.ok('已添加')
    await load()
  } catch (e) {
    toast.err(e.message)
  } finally {
    adding.value = false
  }
}

async function toggle(t) {
  if (busy.value) return
  busy.value = t.id
  try {
    const updated = await todoApi.toggle(t.id)
    if (scope.value === 'done' && !updated.done) {
      list.value = list.value.filter((x) => x.id !== t.id)
    } else if (scope.value !== 'done' && updated.done) {
      list.value = list.value.filter((x) => x.id !== t.id)
    } else {
      Object.assign(t, updated)
    }
  } catch (e) {
    toast.err(e.message)
  } finally {
    busy.value = 0
  }
}

function openEdit(t) {
  editing.value = t
  editForm.value = {
    title: t.title,
    tag: t.tag || '',
    dueDate: t.dueDate || '',
    goalId: t.goalId ? String(t.goalId) : ''
  }
}

async function saveEdit() {
  const title = editForm.value.title.trim()
  if (!title) return toast.err('请填写待办内容')
  try {
    const updated = await todoApi.update(editing.value.id, {
      title,
      tag: editForm.value.tag || null,
      dueDate: editForm.value.dueDate || null,
      goalId: editForm.value.goalId ? Number(editForm.value.goalId) : null
    })
    Object.assign(editing.value, updated)
    editing.value = null
    toast.ok('已保存')
  } catch (e) {
    toast.err(e.message)
  }
}

/* v2：主题化二次确认 */
const delShow = ref(false)
const delText = ref('')
const delFn = ref(null)

function remove(t) {
  delText.value = `删除待办「${t.title}」？`
  delFn.value = () => doRemove(t)
  delShow.value = true
}
async function doRemove(t) {
  try {
    await todoApi.remove(t.id)
    list.value = list.value.filter((x) => x.id !== t.id)
    if (editing.value?.id === t.id) editing.value = null
    toast.ok('已删除')
  } catch (e) {
    toast.err(e.message)
  }
}

function switchScope(v) {
  scope.value = v
  load()
}

onMounted(load)
</script>

<template>
  <div class="page">
    <!-- 快速添加 -->
    <section class="card card--lg quick">
      <div class="quick__row">
        <span class="quick__mark">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6"
            stroke-linecap="round"><path d="M12 6v12M6 12h12" /></svg>
        </span>
        <input v-model="draft.title" class="quick__inp" placeholder="要做什么？回车即可添加"
          aria-label="新待办内容" enterkeyhint="done" @keyup.enter="add" maxlength="80" />
        <button class="btn btn--sm" :disabled="adding" @click="add">添加</button>
      </div>
      <div class="quick__opts">
        <label class="quick__opt">
          <span>截止</span>
          <input v-model="draft.dueDate" type="date" class="inp inp--mini" />
        </label>
        <label class="quick__opt">
          <span>标签</span>
          <select v-model="draft.tag" class="inp inp--mini">
            <option value="">无</option>
            <option v-for="t in TAGS" :key="t" :value="t">{{ t }}</option>
          </select>
        </label>
        <label class="quick__opt">
          <span>关联目标</span>
          <select v-model="draft.goalId" class="inp inp--mini">
            <option value="">不关联</option>
            <option v-for="g in goals" :key="g.id" :value="String(g.id)">{{ g.title }}</option>
          </select>
        </label>
      </div>
    </section>

    <section class="card">
      <div class="row--between head">
        <div class="seg">
          <button v-for="s in SCOPES" :key="s.v" class="seg__item" :class="{ 'seg__item--on': scope === s.v }"
            @click="switchScope(s.v)">{{ s.t }}</button>
        </div>
        <div class="row--between" style="gap: 10px">
          <button class="mini" :disabled="exporting" @click="doExport">导出 CSV</button>
          <span class="hint">{{ scope === 'done' ? `已完成 ${list.length} 项` : `待完成 ${undone} 项` }}</span>
        </div>
      </div>

      <div v-if="loading" class="empty">加载中…</div>
      <div v-else-if="!list.length" class="empty">
        <span class="empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 7h3l1.6 1.6L12 5.2M4 14h3l1.6 1.6L12 12.2M16 7.5h4M16 14.5h4" />
          </svg>
        </span>
        <b>{{ scope === 'done' ? '还没有已完成的待办' : '太棒了，全部搞定' }}</b>
        {{ scope === 'done' ? '完成一个待办后会出现在这里' : '在上方输入框添加新待办' }}
      </div>
      <ul v-else class="td">
        <li v-for="t in list" :key="t.id" class="td__row" :class="{ 'is-done': t.done }">
          <button class="td__box" :class="{ 'is-on': t.done }" type="button"
            :aria-label="`${t.title}：${t.done ? '标记为未完成' : '标记为已完成'}`"
            :disabled="busy === t.id" @click="toggle(t)">
            <svg v-if="t.done" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="3.2"
              stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 9.5 17 19 7" /></svg>
          </button>

          <div class="td__mid">
            <div class="td__top">
              <b>{{ t.title }}</b>
              <span v-if="t.tag" class="chip chip--outline" :title="t.tag">{{ t.tag }}</span>
            </div>
            <div class="td__meta">
              <span v-if="t.dueDate" class="hint"
                :class="{ 'is-over': !t.done && isOverdue(t.dueDate) }">
                {{ relativeDate(t.dueDate) }}
              </span>
              <span v-if="t.dueDate && t.goalId" class="hint">·</span>
              <span v-if="t.goalId" class="hint hint--icon">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
                  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="7.5" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
                {{ goalMap[t.goalId]?.title || '目标' }}
              </span>
            </div>
          </div>

          <div class="td__acts">
            <button class="mini" @click="openEdit(t)">编辑</button>
            <button class="mini mini--del" @click="remove(t)">删除</button>
          </div>
        </li>
      </ul>
    </section>

    <!-- 编辑 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="editing" class="mask" @click.self="editing = null">
          <div class="sheet">
            <h2 class="sheet__t">编辑待办</h2>
            <label class="field">
              <span>内容</span>
              <input v-model="editForm.title" class="inp" maxlength="80" />
            </label>
            <div class="sheet__row">
              <label class="field">
                <span>截止日期</span>
                <input v-model="editForm.dueDate" type="date" class="inp" />
              </label>
              <label class="field">
                <span>标签</span>
                <select v-model="editForm.tag" class="inp">
                  <option value="">无</option>
                  <option v-for="t in TAGS" :key="t" :value="t">{{ t }}</option>
                </select>
              </label>
            </div>
            <label class="field">
              <span>关联目标</span>
              <select v-model="editForm.goalId" class="inp">
                <option value="">不关联</option>
                <option v-for="g in goals" :key="g.id" :value="String(g.id)">{{ g.title }}</option>
              </select>
            </label>
            <div class="sheet__foot">
              <button class="btn btn--ghost btn--sm foot__del" @click="remove(editing)">删除</button>
              <span class="spacer" />
              <button class="btn btn--ghost btn--sm" @click="editing = null">取消</button>
              <button class="btn btn--sm" @click="saveEdit">保存</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmModal v-model="delShow" :text="delText" @confirm="delFn && delFn()" />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: var(--ui-space-4); }

/* ---------- 快速添加 ---------- */
.quick { display: flex; flex-direction: column; gap: 13px; }
.quick__row { display: flex; align-items: center; gap: 11px; }
.quick__mark {
  width: 34px;
  height: 34px;
  border-radius: var(--ui-radius);
  background: var(--ui-accent);
  color: var(--ui-on-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  box-shadow: none;
}
.quick__inp {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  padding: 4px 0;
  min-width: 0;
}
.quick__inp::placeholder { color: var(--t3); }
.quick__opts { display: flex; flex-wrap: wrap; gap: 16px; padding-left: 45px; }
.quick__opt { display: flex; align-items: center; gap: 7px; }
.quick__opt > span { font-size: 12px; color: var(--t2); }

.head { margin-bottom: var(--ui-space-3); }

/* ---------- 列表 ---------- */
.td { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.td__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 6px;
  border-bottom: 0.5px solid var(--line-c);
}
.td__row:last-child { border-bottom: none; }
.td__box {
  width: 23px;
  height: 23px;
  border-radius: var(--ui-radius-sm);
  border: 1.7px solid var(--line-c);
  background: var(--card-solid);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  transition: background-color var(--ui-duration-fast) var(--ui-ease-out),
    border-color var(--ui-duration-fast) var(--ui-ease-out),
    transform var(--ui-duration-fast) var(--ui-ease-out);
}
.td__box.is-on {
  background: var(--ui-accent);
  border-color: transparent;
  box-shadow: none;
}
.td__mid { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.td__top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.td__top .chip {
  max-width: 100%;
  flex-shrink: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.td__top b { font-size: 13px; font-weight: 500; word-break: break-word; }
.is-done .td__top b { color: var(--t3); text-decoration: line-through; }
.td__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-width: 0; }
.hint--icon { display: inline-flex; align-items: center; gap: 4px; min-width: 0; overflow-wrap: anywhere; }
.is-over { color: var(--danger); }
.td__acts { display: flex; gap: 2px; opacity: 0; transition: opacity 0.16s; }
.td__row:focus-within .td__acts { opacity: 1; }

.mini {
  border: none;
  background: transparent;
  color: var(--ui-accent);
  font-size: 12px;
  padding: 3px 8px;
  border-radius: var(--ui-radius-sm);
}
.mini--del { color: var(--danger); }

.inp--mini { width: auto; padding: 6px 12px; font-size: 12px; border-radius: var(--ui-radius); background: var(--card-soft); }

/* ---------- 编辑浮层 ---------- */
.mask {
  position: fixed;
  inset: 0;
  z-index: 150;
  background: var(--ui-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.sheet {
  width: 430px;
  max-width: 94vw;
  border: 1px solid var(--ui-line);
  background: var(--ui-surface);
  border-radius: var(--ui-radius-lg);
  padding: 20px 22px 18px;
  box-shadow: 0 20px 48px -28px rgba(15, 23, 42, 0.42);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.sheet__t { font-size: 14.5px; font-weight: 600; margin-bottom: 2px; }
.sheet__row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.sheet__foot { display: flex; align-items: center; gap: 9px; margin-top: 4px; }
.foot__del { color: var(--danger); border-color: var(--danger-line); }

@media (hover: hover) and (pointer: fine) {
  .td__box:hover { border-color: var(--ui-accent); }
  .td__row:hover .td__acts { opacity: 1; }
  .mini:hover { background: var(--ui-accent-soft); }
  .mini--del:hover { background: var(--ui-signal-coral-soft); }
}

@media (max-width: 620px) {
  .quick__opts { display: grid; grid-template-columns: minmax(0, 1fr); padding-left: 0; }
  .quick__opt { display: grid; grid-template-columns: 64px minmax(0, 1fr); align-items: center; }
  .quick__opt .inp--mini { width: 100%; min-width: 0; }
  .td__acts { opacity: 1; }
  .sheet__row { grid-template-columns: minmax(0, 1fr); }
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
  .td__top b {
    flex: 1 1 100%;
  }
  .td__box {
    width: 44px;
    height: 44px;
  }
}
</style>
