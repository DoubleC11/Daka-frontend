<script setup>
import { ref, computed, onMounted } from 'vue'
import { billApi, categoryApi, statsApi, exportCsv } from '../api'
import { toast } from '../utils/toast'
import { thisMonth, today, monthDay, money, pct, hexColor } from '../utils/format'
import { chartPalette } from '../utils/theme'
import Modal from '../components/Modal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import EChart from '../components/EChart.vue'

const COLOR_KEYS = ['violet', 'sky', 'emerald', 'amber', 'orange', 'pink', 'rose', 'teal', 'cyan', 'indigo', 'gray']

const loading = ref(true)
const bills = ref([])
const summary = ref(null)
const cats = ref({ 1: [], 2: [] })
const byCat = ref([])
const month = ref(thisMonth())
const type = ref(2)          // 2 支出 / 1 收入
const keyword = ref('')
const view = ref('list')     // list | chart

const showForm = ref(false)
const editing = ref(null)
const form = ref({ categoryId: null, amount: '', billDate: today(), title: '', note: '' })
const saving = ref(false)

const showCat = ref(false)
const catForm = ref({ name: '', type: 2, color: 'violet', iconText: '' })

const exporting = ref(false)

async function doExport() {
  if (exporting.value) return
  exporting.value = true
  try {
    await exportCsv(`/export/bills?month=${month.value}`, `账单_${month.value}.csv`)
    toast.ok('已导出')
  } catch (e) {
    toast.err(e.message)
  } finally {
    exporting.value = false
  }
}

const curCats = computed(() => cats.value[type.value] || [])
const selectedCat = computed(() => curCats.value.find((c) => c.id === form.value.categoryId))

const summaryCards = computed(() => {
  const s = summary.value || {}
  return {
    income: Number(s.income || 0),
    expense: Number(s.expense || 0),
    balance: Number(s.balance || 0),
    count: s.count || 0,
    saveRate: Number(s.saveRate || 0)
  }
})

function catGrad(c) {
  const key = String(c?.color || 'violet')
  return COLOR_KEYS.includes(key) ? `var(--c-${key}-g)` : 'var(--c-indigo-g)'
}
function catColor(c) {
  const key = String(c?.color || 'violet')
  return COLOR_KEYS.includes(key) ? `var(--c-${key})` : 'var(--c-indigo)'
}

const donut = computed(() => {
  const P = chartPalette()
  const arr = byCat.value.filter((c) => Number(c.amount) > 0)
  return {
    tooltip: {
      trigger: 'item',
      formatter: (p) => `${p.name}<br/>¥${money(p.value)}（${p.percent}%）`
    },
    legend: {
      bottom: 0, itemWidth: 8, itemHeight: 8, icon: 'circle',
      textStyle: { fontSize: 11, color: P.legend }
    },
    series: [{
      type: 'pie',
      radius: ['54%', '76%'],
      center: ['50%', '43%'],
      itemStyle: { borderRadius: 6, borderColor: P.pieBorder, borderWidth: 2 },
      label: { show: false },
      data: arr.map((c) => ({
        name: c.name,
        value: Number(c.amount),
        itemStyle: { color: hexColor(c.color) }
      }))
    }]
  }
})

const totalByCat = computed(() => byCat.value.reduce((s, c) => s + Number(c.amount || 0), 0))

/* ---------- 余额趋势（近 N 天累计结余） ---------- */
const trendDays = ref(30)
const trend = ref([])
const trendLoading = ref(true)

async function loadTrend() {
  trendLoading.value = true
  try {
    trend.value = await statsApi.billTrend(trendDays.value)
  } catch (e) {
    trend.value = []
    toast.err(e.message)
  } finally {
    trendLoading.value = false
  }
}

function setTrendDays(d) {
  if (trendDays.value === d) return
  trendDays.value = d
  loadTrend()
}

/** 期初结余 = 窗口首日结余 − 首日净额 */
const trendStart = computed(() => {
  const first = trend.value[0]
  return first ? Number(first.balance) - Number(first.net) : 0
})
const trendLast = computed(() => {
  const last = trend.value[trend.value.length - 1]
  return last ? Number(last.balance) : 0
})
const trendEnd = computed(() => {
  const last = trend.value[trend.value.length - 1]
  return last ? last.date.slice(5).replace('-', '/') : ''
})
const trendNet = computed(() => trendLast.value - trendStart.value)
const trendAvg = computed(() => (trendDays.value ? trendNet.value / trendDays.value : 0))
const trendUp = computed(() => trendNet.value >= 0)
/** 窗口内有流水、或期初本身有余额，才画曲线；否则给空态而不是一条贴着 0 的直线 */
const trendHasData = computed(() =>
  trend.value.some((p) => Number(p.income) > 0 || Number(p.expense) > 0)
  || Math.abs(trendStart.value) > 0.001
)

const balanceChart = computed(() => {
  const P = chartPalette()
  const arr = trend.value
  const n = arr.length
  return {
    grid: { left: 6, right: 10, top: 18, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      formatter: (ps) => {
        const d = arr[ps[0]?.dataIndex]
        if (!d) return ''
        return `${d.date}<br/>结余 ¥${money(d.balance)}<br/>收入 ¥${money(d.income)} · 支出 ¥${money(d.expense)}`
      }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: arr.map((p) => p.date.slice(5).replace('-', '/')),
      axisLine: { lineStyle: { color: P.axisLine } },
      axisTick: { show: false },
      axisLabel: { fontSize: 10, color: P.label, interval: Math.max(0, Math.ceil(n / 7) - 1) }
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitLine: { lineStyle: { color: P.splitLine } },
      axisLabel: {
        fontSize: 10,
        color: P.label,
        formatter: (v) => (Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'k' : v)
      }
    },
    series: [{
      name: '累计结余',
      type: 'line',
      smooth: true,
      symbol: 'none',
      data: arr.map((p) => Number(p.balance)),
      lineStyle: { width: 2.4, color: '#6366F1' },
      itemStyle: { color: '#6366F1' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(99,102,241,0.28)' },
            { offset: 1, color: 'rgba(99,102,241,0.02)' }
          ]
        }
      },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { type: 'dashed', color: P.muted, width: 1 },
        label: { formatter: '期初', fontSize: 10, color: P.label, position: 'insideEndTop' },
        data: [{ yAxis: trendStart.value }]
      }
    }]
  }
})

async function load() {
  loading.value = true
  try {
    const params = { month: month.value, type: type.value }
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    const [ls, sm, bc] = await Promise.all([
      billApi.list(params),
      billApi.summary(month.value),
      billApi.byCategory({ month: month.value, type: type.value })
    ])
    bills.value = ls
    summary.value = sm
    byCat.value = bc
    if (!cats.value[1].length || !cats.value[2].length) {
      const [inc, exp] = await Promise.all([categoryApi.list(1), categoryApi.list(2)])
      cats.value = { 1: inc, 2: exp }
    }
  } catch (e) {
    toast.err(e.message)
  } finally {
    loading.value = false
  }
}

function switchType(t) {
  type.value = t
  load()
}

function openCreate() {
  editing.value = null
  form.value = {
    categoryId: curCats.value[0]?.id || null,
    amount: '',
    billDate: today(),
    title: '',
    note: ''
  }
  showForm.value = true
}

function openEdit(b) {
  editing.value = b
  type.value = b.type
  form.value = {
    categoryId: b.categoryId,
    amount: String(b.amount),
    billDate: b.billDate,
    title: b.title,
    note: b.note || ''
  }
  showForm.value = true
}

function pickCat(c) {
  form.value.categoryId = c.id
  if (!form.value.title.trim()) form.value.title = c.name
}

async function save() {
  if (!form.value.categoryId) return toast.err('请选择分类')
  const amt = Number(form.value.amount)
  if (!amt || amt <= 0) return toast.err('请填写大于 0 的金额')
  saving.value = true
  const payload = {
    categoryId: form.value.categoryId,
    type: type.value,
    amount: amt,
    billDate: form.value.billDate || today(),
    title: form.value.title.trim() || selectedCat.value?.name || '支出',
    note: form.value.note.trim()
  }
  try {
    if (editing.value) await billApi.update(editing.value.id, payload)
    else await billApi.create(payload)
    showForm.value = false
    toast.ok(editing.value ? '已更新' : '已记录')
    await Promise.all([load(), loadTrend()])
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
function confirmThen(text, fn) {
  delText.value = text
  delFn.value = fn
  delShow.value = true
}

function remove(b) {
  confirmThen(`删除「${b.title}」这笔记录？`, () => doRemove(b))
}
async function doRemove(b) {
  try {
    await billApi.remove(b.id)
    showForm.value = false
    toast.ok('已删除')
    await Promise.all([load(), loadTrend()])
  } catch (e) {
    toast.err(e.message)
  }
}

async function addCategory() {
  const name = catForm.value.name.trim()
  if (!name) return toast.err('请填写分类名称')
  try {
    const c = await categoryApi.create({
      name,
      type: catForm.value.type,
      color: catForm.value.color,
      iconText: catForm.value.iconText.trim() || name.slice(0, 1)
    })
    cats.value[catForm.value.type] = [...cats.value[catForm.value.type], c]
    catForm.value = { name: '', type: catForm.value.type, color: 'violet', iconText: '' }
    toast.ok('分类已添加')
  } catch (e) {
    toast.err(e.message)
  }
}

async function delCategory(c) {
  if (c.userId == null) return toast.err('系统预置分类不可删除')
  confirmThen(`删除分类「${c.name}」？`, () => doDelCategory(c))
}
async function doDelCategory(c) {
  try {
    await categoryApi.remove(c.id)
    cats.value[c.type] = cats.value[c.type].filter((x) => x.id !== c.id)
    toast.ok('已删除')
  } catch (e) {
    toast.err(e.message)
  }
}

/** 按日分组，便于阅读流水 */
const grouped = computed(() => {
  const map = new Map()
  bills.value.forEach((b) => {
    if (!map.has(b.billDate)) map.set(b.billDate, [])
    map.get(b.billDate).push(b)
  })
  return [...map.entries()].map(([date, items]) => ({
    date,
    items,
    total: items.reduce((s, x) => s + Number(x.amount || 0), 0)
  }))
})

onMounted(() => {
  load()
  loadTrend()
})
</script>

<template>
  <div class="page">
    <!-- 汇总 -->
    <section class="grid g4 strip">
      <div class="card tile tile--income">
        <span class="tile__k">本月收入</span>
        <b class="tile__v">¥{{ money(summaryCards.income) }}</b>
      </div>
      <div class="card tile tile--expense">
        <span class="tile__k">本月支出</span>
        <b class="tile__v">¥{{ money(summaryCards.expense) }}</b>
      </div>
      <div class="card tile">
        <span class="tile__k">本月结余</span>
        <b class="tile__v" :style="{ color: summaryCards.balance >= 0 ? 'var(--income)' : 'var(--expense)' }">
          ¥{{ money(summaryCards.balance) }}
        </b>
        <span class="tile__f">结余率 {{ pct(summaryCards.saveRate, 1) }} · {{ summaryCards.count }} 笔</span>
      </div>
      <div class="card tile tile--act">
        <span class="tile__k">当前月份</span>
        <input v-model="month" type="month" class="inp inp--mini inp--month" :max="thisMonth()" @change="load" />
        <button class="btn btn--sm tile__btn" @click="openCreate">+ 记一笔</button>
        <button class="mini" :disabled="exporting" @click="doExport">导出本月 CSV</button>
      </div>
    </section>

    <!-- 余额趋势 -->
    <section class="card">
      <div class="row--between head">
        <div>
          <h3 class="card-title">余额趋势</h3>
          <span class="hint trend__hint">累计结余 · 近 {{ trendDays }} 天<template v-if="trend.length">（期初 ¥{{ money(trendStart) }}）</template></span>
        </div>
        <div class="seg">
          <button v-for="d in [7, 30, 90]" :key="d" class="seg__item"
            :class="{ 'seg__item--on': trendDays === d }" @click="setTrendDays(d)">{{ d }} 天</button>
        </div>
      </div>

      <div v-if="trendLoading" class="sk trend__sk" />
      <div v-else-if="!trendHasData" class="empty">
        <span class="e-emoji">💸</span>
        <b>这段时间还没有记账</b>
        换成 90 天看看，或点上方「记一笔」开始
      </div>
      <template v-else>
        <div class="trend__nums">
          <div>
            <span class="trend__k">期末结余（截至 {{ trendEnd }}）</span>
            <b class="trend__v">¥{{ money(trendLast) }}</b>
          </div>
          <div>
            <span class="trend__k">近 {{ trendDays }} 天{{ trendUp ? '净增' : '净减' }}</span>
            <b class="trend__v2" :class="trendUp ? 'is-income' : 'is-expense'">
              {{ trendUp ? '+' : '-' }}¥{{ money(Math.abs(trendNet)) }}
            </b>
          </div>
          <span class="chip">日均 {{ trendUp ? '+' : '-' }}¥{{ money(Math.abs(trendAvg)) }}</span>
          <span class="trend__legend"><i />累计结余（元）</span>
        </div>
        <EChart :option="balanceChart" :height="240" />
      </template>
    </section>

    <div class="cols">
      <!-- 流水 -->
      <section class="card">
        <div class="row--between head">
          <div class="seg">
            <button class="seg__item" :class="{ 'seg__item--on': type === 2 }" @click="switchType(2)">支出</button>
            <button class="seg__item" :class="{ 'seg__item--on': type === 1 }" @click="switchType(1)">收入</button>
          </div>
          <div class="filters">
            <button class="mini" @click="showCat = true">管理分类</button>
            <input v-model="keyword" class="inp inp--mini inp--search" placeholder="搜索事项" @keyup.enter="load" />
          </div>
        </div>

        <div v-if="loading" class="empty">加载中…</div>
        <div v-else-if="!bills.length" class="empty">
          <span class="e-emoji">🫙</span>
          <b>本月还没有{{ type === 2 ? '支出' : '收入' }}记录</b>
          点右上角「记一笔」添加
        </div>
        <div v-else class="days">
          <div v-for="gp in grouped" :key="gp.date" class="day">
            <div class="day__head">
              <span>{{ monthDay(gp.date) }}</span>
              <span class="day__total" :class="type === 1 ? 'is-income' : 'is-expense'">
                {{ type === 1 ? '+' : '-' }}¥{{ money(gp.total) }}
              </span>
            </div>
            <ul class="bl">
              <li v-for="b in gp.items" :key="b.id" class="bl__row">
                <span class="icon-box icon-box--sm" :style="{ background: catGrad({ color: b.categoryColor }) }">
                  {{ b.categoryIcon || b.categoryName?.slice(0, 1) }}
                </span>
                <span class="bl__mid">
                  <b>{{ b.title }}</b>
                  <i>{{ b.categoryName }}<template v-if="b.note"> · {{ b.note }}</template></i>
                </span>
                <span class="bl__amt" :class="b.type === 1 ? 'is-income' : 'is-expense'">
                  {{ b.type === 1 ? '+' : '-' }}{{ money(b.amount) }}
                </span>
                <button class="mini" @click="openEdit(b)">编辑</button>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- 分类占比 -->
      <div class="side-col">
        <section class="card">
          <div class="row--between head">
            <h3 class="card-title">{{ type === 2 ? '支出' : '收入' }}构成</h3>
            <span class="hint">合计 ¥{{ money(totalByCat) }}</span>
          </div>
          <div v-if="!byCat.length" class="empty">暂无数据</div>
          <template v-else>
            <EChart :option="donut" :height="196" />
            <ul class="cs">
              <li v-for="c in byCat" :key="c.categoryId" class="cs__row">
                <span class="icon-box icon-box--sm" :style="{ background: catGrad(c) }">
                  {{ c.iconText || c.name?.slice(0, 1) }}
                </span>
                <span class="cs__mid">
                  <span class="row--between">
                    <b>{{ c.name }}</b>
                    <span class="cs__amt" :class="type === 1 ? 'is-income' : 'is-expense'">¥{{ money(c.amount) }}</span>
                  </span>
                  <span class="bar bar--thin cs__bar">
                    <i :style="{ width: c.ratio + '%', background: catGrad(c) }" />
                  </span>
                </span>
                <span class="cs__r">{{ pct(c.ratio, 1) }}</span>
              </li>
            </ul>
          </template>
        </section>
      </div>
    </div>

    <!-- 记账弹窗 -->
    <Modal v-model="showForm" :title="editing ? '编辑记录' : '记一笔'" width="500px">
      <div class="form">
        <div class="seg form__type">
          <button class="seg__item" :class="{ 'seg__item--on': type === 1 }" @click="type = 1">收入</button>
          <button class="seg__item" :class="{ 'seg__item--on': type === 2 }" @click="type = 2">支出</button>
        </div>

        <div class="amount">
          <span class="amount__cur">¥</span>
          <input v-model="form.amount" class="amount__inp" type="number" step="0.01" inputmode="decimal" placeholder="0.00" />
        </div>

        <div class="field">
          <span>选择分类</span>
          <div class="catgrid">
            <button v-for="c in curCats" :key="c.id" class="catcell"
              :class="{ 'is-on': form.categoryId === c.id }" @click="pickCat(c)"
              @contextmenu.prevent="delCategory(c)">
              <span class="catcell__ico" :style="{ background: catGrad(c) }">{{ c.iconText || c.name.slice(0, 1) }}</span>
              <span class="catcell__n">{{ c.name }}</span>
            </button>
          </div>
          <span class="hint">长按右键可删除自定义分类</span>
        </div>

        <div class="form__row">
          <label class="field">
            <span>事项</span>
            <input v-model="form.title" class="inp" placeholder="如：午餐" maxlength="40" />
          </label>
          <label class="field">
            <span>日期</span>
            <input v-model="form.billDate" type="date" class="inp" />
          </label>
        </div>

        <label class="field">
          <span>备注（可选）</span>
          <input v-model="form.note" class="inp" placeholder="补充说明" maxlength="80" />
        </label>
      </div>
      <template #footer>
        <button v-if="editing" class="btn btn--ghost btn--sm foot__del" @click="remove(editing)">删除</button>
        <span class="spacer" />
        <button class="btn btn--ghost btn--sm" @click="showForm = false">取消</button>
        <button class="btn btn--sm" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
      </template>
    </Modal>

    <!-- 分类管理 -->
    <Modal v-model="showCat" title="分类管理" width="460px">
      <div class="catman">
        <div class="catman__add">
          <input v-model="catForm.name" class="inp" placeholder="新分类名称" maxlength="10" />
          <input v-model="catForm.iconText" class="inp catman__ico" placeholder="图标字" maxlength="2" />
          <select v-model.number="catForm.type" class="inp catman__type">
            <option :value="2">支出</option>
            <option :value="1">收入</option>
          </select>
          <button class="btn btn--sm" @click="addCategory">添加</button>
        </div>
        <div class="swatches">
          <button v-for="c in COLOR_KEYS" :key="c" class="swatch" :class="{ 'is-on': catForm.color === c }"
            :style="{ background: `var(--c-${c}-g)` }" @click="catForm.color = c" />
        </div>

        <div class="catman__list">
          <div v-for="t in [2, 1]" :key="t" class="catman__group">
            <span class="catman__gt">{{ t === 2 ? '支出分类' : '收入分类' }}</span>
            <div class="catman__chips">
              <span v-for="c in cats[t]" :key="c.id" class="chip" :class="c.userId == null ? '' : 'chip--on'">
                {{ c.iconText }} {{ c.name }}
                <button v-if="c.userId != null" class="catman__x" @click="delCategory(c)">×</button>
              </span>
            </div>
          </div>
          <span class="hint">高亮的是你自定义的分类，可删除；系统预置分类不可删除。</span>
        </div>
      </div>
    </Modal>

    <ConfirmModal v-model="delShow" :text="delText" @confirm="delFn && delFn()" />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 14px; }

/* ---------- 汇总砖 ---------- */
.tile { display: flex; flex-direction: column; gap: 5px; position: relative; overflow: hidden; }
.tile__k { font-size: 12px; color: var(--t2); }
.tile__v { font-size: 22px; font-weight: 600; letter-spacing: -0.7px; line-height: 1.15; }
.tile__f { font-size: 12px; color: var(--t3); }
.tile--income .tile__v { color: var(--income); }
.tile--expense .tile__v { color: var(--expense); }
.tile--act { justify-content: center; }
.tile__btn { align-self: flex-start; margin-top: 4px; }
.inp--mini { width: auto; padding: 6px 12px; font-size: 12px; border-radius: 10px; background: var(--card-soft); }

.cols {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.95fr);
  gap: 14px;
  align-items: start;
}
.side-col { display: flex; flex-direction: column; gap: 14px; }
.head { margin-bottom: 12px; }
.filters { display: flex; align-items: center; gap: 8px; }
.inp--search { width: 132px; }

/* ---------- 流水 ---------- */
.days { display: flex; flex-direction: column; gap: 14px; }
.day__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--t2);
  padding: 0 4px 7px;
  border-bottom: 0.5px dashed var(--line-c);
  margin-bottom: 4px;
}
.day__total { font-weight: 600; }
.bl { list-style: none; margin: 0; padding: 0; }
.bl__row { display: flex; align-items: center; gap: 11px; padding: 8px 4px; }
.bl__mid { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.35; }
.bl__mid b { font-size: 12.5px; font-weight: 500; }
.bl__mid i {
  font-size: 12px;
  color: var(--t3);
  font-style: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bl__amt { font-size: 13px; font-weight: 600; }
.is-income { color: var(--income); }
.is-expense { color: var(--expense); }

/* ---------- 分类占比 ---------- */
.cs { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; gap: 11px; }
.cs__row { display: flex; align-items: center; gap: 10px; }
.cs__mid { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.cs__mid b { font-size: 12.5px; font-weight: 500; }
.cs__amt { font-size: 12px; font-weight: 600; }
.cs__r { font-size: 12px; color: var(--t3); width: 42px; text-align: right; }

/* ---------- 余额趋势 ---------- */
.trend__nums {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  margin: 16px 0 2px;
}
.trend__k { display: block; font-size: 12px; color: var(--t3); }
.trend__v {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.8px;
  font-variant-numeric: tabular-nums;
}
.trend__v2 {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.4px;
  font-variant-numeric: tabular-nums;
}
.trend__legend {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--t3);
}
.trend__legend i {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--c-indigo);
}
.trend__sk { height: 240px; border-radius: var(--r-tile); margin-top: 16px; }

.sk {
  background: linear-gradient(100deg, var(--sk-a) 30%, var(--sk-b) 50%, var(--sk-a) 70%);
  background-size: 220% 100%;
  animation: sk 1.2s infinite;
}
@keyframes sk { from { background-position: 130% 0; } to { background-position: -30% 0; } }

/* ---------- 表单 ---------- */
.form { display: flex; flex-direction: column; gap: 15px; }
.form__type { display: flex; width: 100%; }
.form__type .seg__item { flex: 1; text-align: center; }
.form__row { display: grid; grid-template-columns: minmax(0, 1fr) 140px; gap: 12px; }
.amount {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 18px;
  border-radius: 18px;
  background: var(--card-soft);
}
.amount__cur { font-size: 20px; color: var(--t3); }
.amount__inp {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -1px;
  min-width: 0;
}
.catgrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
  gap: 8px;
  margin-top: 3px;
}
.catcell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 9px 4px;
  border-radius: 14px;
  border: 1.5px solid transparent;
  background: var(--card-soft);
  transition: all 0.15s;
}
.catcell:hover { background: var(--hover-c); }
.catcell.is-on { border-color: var(--c-indigo); background: rgba(99, 102, 241, 0.08); }
.catcell__ico {
  width: 32px;
  height: 32px;
  border-radius: 11px;
  color: #fff;
  font-size: 12.5px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}
.catcell__n { font-size: 12px; color: var(--t2); }

/* ---------- 分类管理 ---------- */
.catman { display: flex; flex-direction: column; gap: 14px; }
.catman__add { display: flex; gap: 8px; }
.catman__ico { width: 78px; }
.catman__type { width: 84px; }
.swatches { display: flex; flex-wrap: wrap; gap: 8px; }
.swatch { width: 26px; height: 26px; border-radius: 9px; border: 2px solid transparent; transition: transform 0.14s; }
.swatch:hover { transform: scale(1.1); }
.swatch.is-on { border-color: var(--card-solid); box-shadow: 0 0 0 2px var(--c-indigo); }
.catman__list { display: flex; flex-direction: column; gap: 12px; }
.catman__group { display: flex; flex-direction: column; gap: 8px; }
.catman__gt { font-size: 12px; color: var(--t2); }
.catman__chips { display: flex; flex-wrap: wrap; gap: 6px; }
.catman__x {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 13px;
  line-height: 1;
  padding: 0 2px;
  opacity: 0.7;
}
.catman__x:hover { opacity: 1; }

.mini {
  border: none;
  background: transparent;
  color: var(--c-indigo);
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 8px;
  white-space: nowrap;
}
.mini:hover { background: rgba(99, 102, 241, 0.1); }
.foot__del { color: var(--danger); border-color: var(--danger-line); }

@media (max-width: 1080px) {
  .grid.g4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .cols { grid-template-columns: minmax(0, 1fr); }
  .trend__legend { margin-left: 0; }
}
@media (max-width: 520px) {
  .grid.g4 { grid-template-columns: minmax(0, 1fr); }
  .form__row { grid-template-columns: minmax(0, 1fr); }
  .filters { flex-direction: column; align-items: stretch; }
  .inp--search { width: 100%; }
}
</style>
