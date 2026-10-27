<script setup>
import { ref, computed, onMounted } from 'vue'
import { statsApi, habitApi, diaryApi } from '../api'
import { toast } from '../utils/toast'
import { thisMonth, monthDay, money, pct, hexColor } from '../utils/format'
import { chartPalette } from '../utils/theme'
import EChart from '../components/EChart.vue'

const COLOR_KEYS = ['violet', 'sky', 'emerald', 'amber', 'orange', 'pink', 'rose', 'teal', 'cyan', 'indigo', 'gray']

const loading = ref(true)
const trend = ref([])
const monthly = ref([])
const bundle = ref(null)
const habitStats = ref(null)
const diaryStats = ref(null)
const month = ref(thisMonth())
const days = ref(14)

/* ---------- 打卡趋势 ---------- */
const trendChart = computed(() => {
  const P = chartPalette()
  return {
  grid: { left: 6, right: 8, top: 16, bottom: 4, containLabel: true },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: trend.value.map((p) => monthDay(p.date).replace('月', '/').replace('日', '')),
    axisLine: { lineStyle: { color: P.axisLine } },
    axisTick: { show: false },
    axisLabel: { fontSize: 10, color: P.label }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: P.splitLine } },
    axisLabel: { fontSize: 10, color: P.label }
  },
  series: [
    {
      name: '已完成',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      data: trend.value.map((p) => p.done),
      lineStyle: { width: 2.4, color: '#4F46E5' },
      itemStyle: { color: '#4F46E5' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(79,70,229,0.28)' },
            { offset: 1, color: 'rgba(79,70,229,0.02)' }
          ]
        }
      }
    },
    {
      name: '计划总数',
      type: 'line',
      smooth: true,
      symbol: 'none',
      data: trend.value.map((p) => p.total),
      lineStyle: { width: 1.6, type: 'dashed', color: P.muted }
    }
  ]
  }
})

/* ---------- 月度收支 ---------- */
const monthlyChart = computed(() => {
  const P = chartPalette()
  const labels = monthly.value.map((m) => `${Number(m.month.slice(5))}月`)
  return {
    grid: { left: 6, right: 8, top: 24, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => `¥${money(v)}`
    },
    legend: { top: 0, itemWidth: 9, itemHeight: 9, icon: 'roundRect', textStyle: { fontSize: 11, color: P.legend } },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: P.axisLine } },
      axisTick: { show: false },
      axisLabel: { fontSize: 10, color: P.label }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: P.splitLine } },
      axisLabel: { fontSize: 10, color: P.label, formatter: (v) => (v >= 1000 ? v / 1000 + 'k' : v) }
    },
    series: [
      {
        name: '收入', type: 'bar', barWidth: 13, barGap: '18%',
        itemStyle: { borderRadius: [5, 5, 0, 0], color: P.income },
        data: monthly.value.map((m) => Number(m.income))
      },
      {
        name: '支出', type: 'bar', barWidth: 13,
        itemStyle: { borderRadius: [5, 5, 0, 0], color: P.expense },
        data: monthly.value.map((m) => Number(m.expense))
      }
    ]
  }
})

/* ---------- 支出构成 ---------- */
const expensePie = computed(() => {
  const P = chartPalette()
  const arr = (bundle.value?.expenseByCategory || []).filter((c) => Number(c.amount) > 0)
  return {
    tooltip: { trigger: 'item', formatter: (p) => `${p.name}<br/>¥${money(p.value)}（${p.percent}%）` },
    legend: { bottom: 0, itemWidth: 8, itemHeight: 8, icon: 'circle', textStyle: { fontSize: 11, color: P.legend } },
    series: [{
      type: 'pie',
      radius: ['52%', '74%'],
      center: ['50%', '42%'],
      itemStyle: { borderRadius: 6, borderColor: P.pieBorder, borderWidth: 2 },
      label: { show: false },
      data: arr.map((c) => ({ name: c.name, value: Number(c.amount), itemStyle: { color: hexColor(c.color) } }))
    }]
  }
})

/* ---------- 当月每日收支 ---------- */
const dailyChart = computed(() => {
  const P = chartPalette()
  const arr = bundle.value?.daily || []
  return {
    grid: { left: 6, right: 8, top: 16, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', valueFormatter: (v) => `¥${money(v)}` },
    xAxis: {
      type: 'category',
      data: arr.map((d) => Number(d.date.slice(8))),
      axisLine: { lineStyle: { color: P.axisLine } },
      axisTick: { show: false },
      axisLabel: { fontSize: 10, color: P.label, interval: 2 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: P.splitLine } },
      axisLabel: { fontSize: 10, color: P.label }
    },
    series: [{
      type: 'line',
      smooth: true,
      symbol: 'none',
      data: arr.map((d) => Number(d.expense)),
      lineStyle: { width: 2.2, color: P.expense },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: P.expenseArea },
            { offset: 1, color: P.expenseAreaFade }
          ]
        }
      }
    }]
  }
})

const maxRank = computed(() =>
  Math.max(1, ...(habitStats.value?.ranking || []).map((r) => r.count))
)

const bundleSummary = computed(() => bundle.value?.summary || {})

async function load() {
  loading.value = true
  try {
    const [tr, mb, bd, hs, ds] = await Promise.all([
      statsApi.trend(days.value),
      statsApi.monthlyBills(6),
      statsApi.bills(month.value),
      habitApi.stats(),
      diaryApi.stats(month.value)
    ])
    trend.value = tr
    monthly.value = mb
    bundle.value = bd
    habitStats.value = hs
    diaryStats.value = ds
  } catch (e) {
    toast.err(e.message)
  } finally {
    loading.value = false
  }
}

async function changeDays(n) {
  days.value = n
  try {
    trend.value = await statsApi.trend(n)
  } catch (e) {
    toast.err(e.message)
  }
}

async function changeMonth() {
  try {
    const [bd, ds] = await Promise.all([statsApi.bills(month.value), diaryApi.stats(month.value)])
    bundle.value = bd
    diaryStats.value = ds
  } catch (e) {
    toast.err(e.message)
  }
}

function rankGrad(c) {
  const key = String(c || 'violet')
  return COLOR_KEYS.includes(key) ? `var(--c-${key}-g)` : 'var(--c-indigo-g)'
}

onMounted(load)
</script>

<template>
  <div class="page">
    <!-- 关键指标 -->
    <section class="grid g4 strip">
      <div class="card tile">
        <span class="tile__k">本月打卡率</span>
        <b class="tile__v grad-text">{{ pct(habitStats?.monthRate || 0, 1) }}</b>
        <span class="tile__f">最长连续 {{ habitStats?.maxStreak || 0 }} 天</span>
      </div>
      <div class="card tile">
        <span class="tile__k">本月支出</span>
        <b class="tile__v" style="color: var(--expense)">¥{{ money(bundleSummary.expense) }}</b>
        <span class="tile__f">收入 ¥{{ money(bundleSummary.income) }}</span>
      </div>
      <div class="card tile">
        <span class="tile__k">本月结余率</span>
        <b class="tile__v" :style="{ color: Number(bundleSummary.saveRate) >= 0 ? 'var(--income)' : 'var(--expense)' }">
          {{ pct(bundleSummary.saveRate, 1) }}
        </b>
        <span class="tile__f">结余 ¥{{ money(bundleSummary.balance) }} · {{ bundleSummary.count || 0 }} 笔</span>
      </div>
      <div class="card tile">
        <span class="tile__k">本月日记</span>
        <b class="tile__v">{{ diaryStats?.monthCount || 0 }}</b>
        <span class="tile__f">最常心情 {{ diaryStats?.topMood || '—' }}</span>
      </div>
    </section>

    <!-- 打卡趋势 -->
    <section class="card">
      <div class="row--between head">
        <h2 class="card-title">打卡趋势</h2>
        <div class="seg">
          <button v-for="n in [7, 14, 30]" :key="n" class="seg__item" :class="{ 'seg__item--on': days === n }"
            @click="changeDays(n)">近 {{ n }} 天</button>
        </div>
      </div>
      <EChart :option="trendChart" :height="250" label="近段时间习惯打卡趋势" />
    </section>

    <div class="cols">
      <!-- 月度收支 -->
      <section class="card">
        <div class="row--between head">
          <h2 class="card-title">近 6 个月收支</h2>
          <span class="hint">收入 <b style="color: var(--income)">红</b> · 支出 <b style="color: var(--expense)">绿</b></span>
        </div>
        <EChart :option="monthlyChart" :height="250" label="近 6 个月收支趋势" />
      </section>

      <!-- 支出构成 -->
      <section class="card">
        <div class="row--between head">
          <h2 class="card-title">本月支出构成</h2>
          <input v-model="month" type="month" class="inp inp--mini inp--month"
            aria-label="统计月份" :max="thisMonth()" @change="changeMonth" />
        </div>
        <div v-if="!bundle?.expenseByCategory?.length" class="empty">本月暂无支出</div>
        <EChart v-else :option="expensePie" :height="250" label="本月支出分类占比" />
      </section>
    </div>

    <div class="cols">
      <!-- 习惯排行 -->
      <section class="card">
        <h2 class="card-title head">习惯打卡排行（本月）</h2>
        <div v-if="!habitStats?.ranking?.length" class="empty">暂无数据</div>
        <ul v-else class="rank">
          <li v-for="(r, i) in habitStats.ranking" :key="r.name" class="rank__row">
            <span class="rank__no" :class="`rank__no--${i + 1}`">{{ i + 1 }}</span>
            <span class="rank__mid">
              <span class="row--between">
                <b>{{ r.name }}</b>
                <span class="hint">{{ r.count }} 次 · {{ pct(r.ratio, 0) }}</span>
              </span>
              <span class="bar bar--thin rank__bar">
                <i :style="{ width: (r.count / maxRank) * 100 + '%', background: rankGrad(r.color) }" />
              </span>
            </span>
          </li>
        </ul>
      </section>

      <!-- 心情分布 -->
      <section class="card">
        <h2 class="card-title head">心情分布（本月）</h2>
        <div v-if="!diaryStats?.moods?.some((m) => m.count)" class="empty">本月暂无日记</div>
        <ul v-else class="moods">
          <li v-for="m in diaryStats.moods" :key="m.mood" class="moods__row">
            <span class="moods__name">{{ m.mood }}</span>
            <span class="bar bar--thin moods__bar">
              <i :style="{ width: (m.count / Math.max(1, diaryStats.monthCount)) * 100 + '%' }" />
            </span>
            <span class="moods__n">{{ m.count }}</span>
          </li>
        </ul>
        <div v-if="diaryStats?.recordedDays?.length" class="moods__foot">
          <span class="hint">本月记录 {{ diaryStats.recordedDays.length }} 天 · 累计 {{ diaryStats.totalCount }} 篇</span>
        </div>
      </section>
    </div>

    <!-- 当月每日支出 -->
    <section class="card">
      <div class="row--between head">
        <h2 class="card-title">当月每日支出</h2>
        <span class="hint">单位：元</span>
      </div>
      <div v-if="!bundle?.daily?.length" class="empty">暂无数据</div>
      <EChart v-else :option="dailyChart" :height="210" label="当月每日支出趋势" />
    </section>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: var(--ui-space-4); }

.tile { display: flex; flex-direction: column; gap: 5px; }
.tile__k { font-size: 12px; color: var(--t2); }
.tile__v { font-family: var(--ui-font-data); font-size: 24px; font-weight: 650; letter-spacing: 0; line-height: 1.15; }
.tile__f { font-size: 12px; color: var(--t3); }

.head { margin-bottom: var(--ui-space-3); }
.cols {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ui-space-4);
  align-items: start;
}

.inp--mini { width: auto; padding: 6px 12px; font-size: 12px; border-radius: var(--ui-radius); background: var(--card-soft); }

/* ---------- 排行 ---------- */
.rank { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
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

/* ---------- 心情 ---------- */
.moods { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.moods__row { display: flex; align-items: center; gap: 11px; }
.moods__name { width: 40px; font-size: 12.5px; }
.moods__bar { flex: 1; }
.moods__bar i { background: var(--ui-accent); }
.moods__n { width: 26px; text-align: right; font-size: 12px; color: var(--t2); }
.moods__foot { margin-top: 14px; }

@media (max-width: 1080px) {
  .grid.g4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .cols { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 520px) {
  .grid.g4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
