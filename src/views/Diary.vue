<script setup>
import { ref, computed, onMounted } from 'vue'
import { diaryApi, exportCsv } from '../api'
import { toast } from '../utils/toast'
import { thisMonth, today, monthDay, monthLabel, hexColor } from '../utils/format'
import { chartPalette } from '../utils/theme'
import Modal from '../components/Modal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import EChart from '../components/EChart.vue'

const MOOD_COLOR = { 开心: '#F59E0B', 平静: '#10B981', 疲惫: '#0EA5E9', 低落: '#8B5CF6' }
const MOOD_TONE = { 开心: 'is-positive', 平静: 'is-calm', 疲惫: 'is-tired', 低落: 'is-low' }

const loading = ref(true)
const list = ref([])
const stats = ref(null)
const moods = ref([])
const month = ref('')
const keyword = ref('')
const exporting = ref(false)

async function doExport() {
  if (exporting.value) return
  exporting.value = true
  try {
    await exportCsv(`/export/diaries?month=${month.value || thisMonth()}`,
      `心情日记_${month.value || thisMonth()}.csv`)
    toast.ok('已导出')
  } catch (e) {
    toast.err(e.message)
  } finally {
    exporting.value = false
  }
}

const showForm = ref(false)
const editing = ref(null)
const form = ref({ diaryDate: today(), mood: '平静', content: '', tags: '' })
const saving = ref(false)

/** 清空月份筛选，回到「全部时间」 */
function clearMonth() {
  month.value = ''
  load()
}

function moodOf(m) {
  return m || '平静'
}
function moodTone(m) {
  return MOOD_TONE[m] || 'is-neutral'
}

const moodChart = computed(() => {
  const P = chartPalette()
  const arr = (stats.value?.moods || []).filter((m) => m.count > 0)
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 11, color: P.legend } },
    series: [{
      type: 'pie',
      radius: ['52%', '74%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: P.pieBorder, borderWidth: 2 },
      label: { show: false },
      data: arr.map((m) => ({
        name: m.mood,
        value: m.count,
        itemStyle: { color: hexColor(MOOD_COLOR[m.mood], MOOD_COLOR[m.mood]) }
      }))
    }]
  }
})

async function load() {
  loading.value = true
  try {
    const params = {}
    if (month.value) params.month = month.value
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    const [ls, st] = await Promise.all([
      diaryApi.list(params),
      diaryApi.stats(month.value || undefined)
    ])
    list.value = ls
    stats.value = st
    if (!moods.value.length) moods.value = await diaryApi.moods()
  } catch (e) {
    toast.err(e.message)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { diaryDate: today(), mood: '平静', content: '', tags: '' }
  showForm.value = true
}
function openEdit(d) {
  editing.value = d
  form.value = {
    diaryDate: d.diaryDate,
    mood: moodOf(d.mood),
    content: d.content,
    tags: d.tags || ''
  }
  showForm.value = true
}

async function save() {
  const content = form.value.content.trim()
  if (!content) return toast.err('写点什么再保存吧')
  saving.value = true
  const payload = {
    diaryDate: form.value.diaryDate || today(),
    mood: form.value.mood,
    content,
    tags: form.value.tags.trim()
  }
  try {
    if (editing.value) await diaryApi.update(editing.value.id, payload)
    else await diaryApi.create(payload)
    showForm.value = false
    toast.ok(editing.value ? '已更新' : '已记录')
    await load()
  } catch (e) {
    toast.err(e.message)
  } finally {
    saving.value = false
  }
}

/* v2：主题化二次确认 */
const delShow = ref(false)
const delText = ref('')
const delFn = ref(null)

function remove(d) {
  delText.value = '删除这篇日记？'
  delFn.value = () => doRemove(d)
  delShow.value = true
}
async function doRemove(d) {
  try {
    await diaryApi.remove(d.id)
    showForm.value = false
    toast.ok('已删除')
    await load()
  } catch (e) {
    toast.err(e.message)
  }
}

function tagList(d) {
  return (d.tags || '').split(/[,，\s]+/).filter(Boolean)
}

onMounted(load)
</script>

<template>
  <div class="page">
    <!-- 统计条 -->
    <section class="grid g4 strip">
      <div class="card tile">
        <span class="tile__k">本月篇数</span>
        <b class="tile__v grad-text">{{ stats?.monthCount || 0 }}</b>
      </div>
      <div class="card tile">
        <span class="tile__k">累计篇数</span>
        <b class="tile__v">{{ stats?.totalCount || 0 }}</b>
      </div>
      <div class="card tile">
        <span class="tile__k">最常心情</span>
        <b class="tile__v tile__v--mood">
          <span class="mood-dot" :class="moodTone(stats?.topMood)" />
          {{ stats?.topMood || '—' }}
        </b>
      </div>
      <div class="card tile tile--act">
        <span class="tile__k">今天</span>
        <b class="tile__v tile__v--mood">
          <span class="mood-dot" :class="moodTone(list[0]?.diaryDate === today() ? moodOf(list[0]?.mood) : '')" />
          {{ list[0]?.diaryDate === today() ? moodOf(list[0]?.mood) : '未记录' }}
        </b>
        <button class="btn btn--sm tile__btn" @click="openCreate">+ 写日记</button>
      </div>
    </section>

    <div class="cols">
      <!-- 时间轴 -->
      <section class="card">
        <div class="row--between head">
          <h2 class="card-title">日记时间轴</h2>
          <div class="filters">
            <input v-model="month" type="month" class="inp inp--mini inp--month"
              aria-label="日记筛选月份" :max="today()" placeholder="全部时间" @change="load" />
            <button v-if="month" class="mini" @click="clearMonth">全部</button>
            <input v-model="keyword" class="inp inp--mini inp--search" placeholder="搜索内容 / 标签"
              aria-label="搜索日记内容或标签" enterkeyhint="search" @keyup.enter="load" />
            <button class="btn btn--ghost btn--sm" :disabled="exporting" @click="doExport">导出</button>
          </div>
        </div>

        <div v-if="loading" class="empty">加载中…</div>
        <div v-else-if="!list.length" class="empty">
          <span class="empty__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 3h9l4 4v14H6zM15 3v4h4M9 12h6M9 16h6" />
            </svg>
          </span>
          <b>还没有日记</b>
          点右上角写下今天的第一篇吧
        </div>
        <ul v-else class="tl">
          <li v-for="d in list" :key="d.id" class="tl__item">
            <span class="tl__dot" :style="{ background: MOOD_COLOR[moodOf(d.mood)] }" />
            <div class="tl__card">
              <div class="tl__head">
                <span class="mood-dot" :class="moodTone(moodOf(d.mood))" />
                <b>{{ monthDay(d.diaryDate) }}</b>
                <span class="chip">{{ moodOf(d.mood) }}</span>
                <span class="spacer" />
                <button class="mini" @click="openEdit(d)">编辑</button>
              </div>
              <p class="tl__content">{{ d.content }}</p>
              <div v-if="tagList(d).length" class="tl__tags">
                <span v-for="t in tagList(d)" :key="t" class="chip chip--outline">#{{ t }}</span>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <!-- 右侧：心情分布 + 记录日历 -->
      <div class="side-col">
        <section class="card">
          <h2 class="card-title head">心情分布 · {{ month ? monthLabel(month) : '全部' }}</h2>
          <div v-if="!stats?.moods?.some((m) => m.count)" class="empty">暂无数据</div>
          <EChart v-else :option="moodChart" :height="210" label="本月心情分布" />
        </section>

        <section class="card">
          <h2 class="card-title head">本月记录天数</h2>
          <div class="dayl">
            <span v-for="d in stats?.recordedDays || []" :key="d" class="dayl__c">{{ Number(d.slice(8)) }}</span>
            <span v-if="!stats?.recordedDays?.length" class="empty">本月还没有记录</span>
          </div>
        </section>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <Modal v-model="showForm" :title="editing ? '编辑日记' : '写日记'" width="520px">
      <div class="form">
        <div class="form__row">
          <label class="field">
            <span>日期</span>
            <input v-model="form.diaryDate" type="date" class="inp" />
          </label>
          <div class="field">
            <span>今天心情</span>
            <div class="moods">
              <button v-for="m in (moods.length ? moods : ['开心','平静','疲惫','低落'])" :key="m"
                class="mood" :class="{ 'is-on': form.mood === m }" @click="form.mood = m">
                <span class="mood-dot" :class="moodTone(m)" />
                {{ m }}
              </button>
            </div>
          </div>
        </div>

        <label class="field">
          <span>内容</span>
          <textarea v-model="form.content" class="inp" rows="7" placeholder="今天发生了什么？有什么想记下来的？" />
        </label>

        <label class="field">
          <span>标签（逗号分隔，可选）</span>
          <input v-model="form.tags" class="inp" placeholder="如：工作, 运动" />
        </label>
      </div>
      <template #footer>
        <button v-if="editing" class="btn btn--ghost btn--sm foot__del" @click="remove(editing)">删除</button>
        <span class="spacer" />
        <button class="btn btn--ghost btn--sm" @click="showForm = false">取消</button>
        <button class="btn btn--sm" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
      </template>
    </Modal>

    <ConfirmModal v-model="delShow" :text="delText" @confirm="delFn && delFn()" />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: var(--ui-space-4); }

.tile { display: flex; flex-direction: column; gap: 5px; }
.tile__k { font-size: 12px; color: var(--t2); }
.tile__v { font-family: var(--ui-font-data); font-size: 24px; font-weight: 650; letter-spacing: 0; line-height: 1.15; display: flex; align-items: center; gap: 8px; }
.tile__v--mood { font-family: var(--ui-font-sans); font-size: 18px; }
.tile--act { justify-content: center; }
.tile__btn { align-self: flex-start; margin-top: 4px; }

.cols {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.9fr);
  gap: var(--ui-space-4);
  align-items: start;
}
.side-col { display: flex; flex-direction: column; gap: var(--ui-space-4); }
.head { margin-bottom: var(--ui-space-3); }
.filters { display: flex; gap: 8px; }
.inp--mini { width: auto; padding: 6px 12px; font-size: 12px; border-radius: var(--ui-radius); background: var(--card-soft); }
.inp--search { width: 150px; }

/* ---------- 时间轴 ---------- */
.tl { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.tl__item { display: flex; gap: 12px; position: relative; }
.tl__item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 18px;
  bottom: -6px;
  width: 1.5px;
  background: var(--line-c);
}
.tl__dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  flex: 0 0 auto;
  margin-top: 13px;
  box-shadow: 0 0 0 3px var(--card-solid);
  z-index: 1;
}
.tl__card {
  flex: 1;
  min-width: 0;
  padding: 11px 14px;
  border-radius: var(--ui-radius);
  background: var(--card-soft);
  margin-bottom: 10px;
}
.tl__head { display: flex; align-items: center; gap: 8px; }
.tl__head b { font-size: 12.5px; font-weight: 500; }
.tl__content {
  margin-top: 7px;
  font-size: 12.5px;
  line-height: 1.85;
  color: var(--t1);
  white-space: pre-wrap;
  word-break: break-word;
}
.tl__tags { margin-top: 9px; display: flex; flex-wrap: wrap; gap: 5px; }
.tl__tags .chip {
  max-width: 100%;
  flex-shrink: 1;
  white-space: normal;
  overflow-wrap: anywhere;
}
.mini {
  border: none;
  background: transparent;
  color: var(--ui-accent);
  font-size: 12px;
  padding: 3px 8px;
  border-radius: var(--ui-radius-sm);
}

/* ---------- 记录天数 ---------- */
.dayl { display: flex; flex-wrap: wrap; gap: 6px; }
.dayl__c {
  width: 27px;
  height: 27px;
  border-radius: var(--ui-radius-sm);
  background: var(--ui-accent-soft);
  color: var(--ui-accent);
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ---------- 表单 ---------- */
.form { display: flex; flex-direction: column; gap: 15px; }
.form__row { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 14px; }
.moods { display: flex; flex-wrap: wrap; gap: 7px; }
.mood {
  display: flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--line-c);
  background: var(--card-solid);
  border-radius: var(--ui-radius);
  padding: 5px 13px;
  font-size: 12px;
  color: var(--t2);
  transition: color var(--ui-duration-fast) var(--ui-ease-out),
    border-color var(--ui-duration-fast) var(--ui-ease-out),
    background-color var(--ui-duration-fast) var(--ui-ease-out);
}
.mood.is-on {
  background: var(--ui-accent-soft);
  color: var(--ui-accent);
  border-color: var(--ui-accent);
  font-weight: 600;
  box-shadow: none;
}

.mood-dot {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  border-radius: var(--ui-radius-pill);
  background: var(--ui-line-strong);
}
.mood-dot.is-positive { background: var(--ui-signal-lemon); }
.mood-dot.is-calm { background: var(--ui-accent); }
.mood-dot.is-tired { background: var(--ui-signal-blue); }
.mood-dot.is-low { background: var(--ui-signal-coral); }

@media (hover: hover) and (pointer: fine) {
  .mini:hover { background: var(--ui-accent-soft); }
  .mood:hover { border-color: var(--t3); }
}

.foot__del { color: var(--danger); border-color: var(--danger-line); }

@media (max-width: 1080px) {
  .grid.g4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 860px) {
  .cols { grid-template-columns: minmax(0, 1fr); }
  .form__row { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 520px) {
  .grid.g4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filters { flex-direction: column; }
  .inp--search { width: 100%; }
  .mood {
    min-height: 44px;
  }
}
</style>
