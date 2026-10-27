<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { statsApi, habitApi } from '../api'
import { useAuthStore } from '../stores/auth'
import { useCoupleStore } from '../stores/couple'
import { toast } from '../utils/toast'
import { monthDay, money, pct, relativeDate } from '../utils/format'

const router = useRouter()
const auth = useAuthStore()
const couple = useCoupleStore()

const loading = ref(true)
const error = ref('')
const ov = ref(null)
const checking = ref(0)
const trend30 = ref([])

const hasValue = (value) => value !== null && value !== undefined && value !== ''
const formatMoney = (value) => (hasValue(value) ? `¥${money(Number(value))}` : '—')
const formatPercent = (value) => (hasValue(value) ? pct(Number(value), 1) : '—')
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

const habits = computed(() => ov.value?.todayHabits || [])
const doneCount = computed(() => habits.value.filter((h) => h.done).length)
const remainingCount = computed(() => Math.max(0, habits.value.length - doneCount.value))
const habitRate = computed(() =>
  habits.value.length ? (doneCount.value / habits.value.length) * 100 : 0
)
const progressScale = computed(() => habitRate.value / 100)
const displayName = computed(() => auth.user?.nickname || auth.user?.username || '你')

/* 全部完成时的庆祝态 */
const allDone = computed(() => habits.value.length > 0 && habits.value.every((h) => h.done))
const nextHabit = computed(() => habits.value.find((habit) => !habit.done) || null)

/* 近 30 天坚持条（真实打卡数据） */
const strip = computed(() =>
  (trend30.value || []).map((p) => {
    const total = Number(p.total || 0)
    const done = Number(p.done || 0)
    return { date: p.date, done, total, ratio: total ? done / total : 0 }
  })
)
const stripDone = computed(() => strip.value.reduce((s, c) => s + c.done, 0))

const todos = computed(() => ov.value?.todoCounts || {})
const goalPct = computed(() => Math.min(100, Math.max(0, ov.value?.topGoalPercent || 0)))
const goalPercentLabel = computed(() =>
  hasValue(ov.value?.topGoalPercent) ? pct(goalPct.value, 1) : '—'
)

/** 顶部问候语由后端给出，前端按本地时间兜底 */
const hello = computed(() => {
  if (ov.value?.greeting) return ov.value.greeting
  const h = new Date().getHours()
  const g = h < 6 ? '凌晨好' : h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'
  return g
})

const dateText = computed(() => {
  const d = ov.value?.date
  if (!d) return ov.value?.weekday || '今天'
  return `${monthDay(d)} ${ov.value?.weekday || ''}`
})

const maxStreakLabel = computed(() =>
  hasValue(ov.value?.maxStreak) ? `${ov.value.maxStreak} 天` : '—'
)
const maxStreakNote = computed(() =>
  ov.value?.maxStreakHabit ? `最长连续 · ${ov.value.maxStreakHabit}` : '最长连续'
)
const pendingTodo = computed(() => {
  const total = todos.value.todayTotal
  if (!hasValue(total)) return null
  return Math.max(0, Number(total) - Number(todos.value.todayDone || 0))
})
const todoFoot = computed(() => {
  if (!hasValue(todos.value.todayTotal)) return '暂无待办数据'
  const week =
    hasValue(todos.value.weekTotal)
      ? ` · 本周 ${todos.value.weekDone || 0}/${todos.value.weekTotal}`
      : ''
  return `今日 ${todos.value.todayDone || 0}/${todos.value.todayTotal}${week}`
})
const diaryFoot = computed(() => {
  const count = hasValue(ov.value?.todayDiaryCount) ? `${ov.value.todayDiaryCount} 篇` : '—'
  return `日记 ${count} · 今日心情 ${ov.value?.todayMood || '—'}`
})
const billFoot = computed(() => {
  if (!hasValue(ov.value?.todayIncome) && !hasValue(ov.value?.todayExpense)) {
    return '暂无收支数据'
  }
  return `收入 ${formatMoney(ov.value?.todayIncome)} · 支出 ${formatMoney(ov.value?.todayExpense)}`
})
const balanceFoot = computed(() => {
  if (!hasValue(ov.value?.monthIncome) && !hasValue(ov.value?.monthExpense)) {
    return '暂无本月收支数据'
  }
  return `收 ${formatMoney(ov.value?.monthIncome)} · 支 ${formatMoney(ov.value?.monthExpense)}`
})
const balanceTone = computed(() => {
  if (!hasValue(ov.value?.monthBalance)) return ''
  return Number(ov.value.monthBalance) >= 0 ? 'is-income' : 'is-expense'
})
const moodTone = computed(() => {
  const tones = {
    开心: 'is-positive',
    平静: 'is-calm',
    疲惫: 'is-tired',
    低落: 'is-low'
  }
  return tones[ov.value?.todayMood] || 'is-neutral'
})
const momentumSummary = computed(() =>
  strip.value.length ? `近 30 天完成 ${stripDone.value} 次` : '还没有足够的历史记录'
)
const recentSevenDays = computed(() =>
  strip.value.slice(-7).reduce((sum, cell) => sum + cell.done, 0)
)
const bestTrendDay = computed(() => {
  let best = null
  let bestRatio = -1
  for (const cell of strip.value) {
    if (!cell.total || !cell.done) continue
    const ratio = cell.done / cell.total
    if (ratio > bestRatio || (ratio === bestRatio && best && cell.done > best.done)) {
      best = cell
      bestRatio = ratio
    }
  }
  return best
})

function goalValue(value) {
  return hasValue(value) ? Number(value) : '—'
}

function goalDeadlineText(goal) {
  return goal?.deadline ? `截止 ${relativeDate(goal.deadline)}` : '无截止'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [o, tr] = await Promise.all([statsApi.overview(), statsApi.trend(30)])
    ov.value = o
    trend30.value = tr || []
  } catch (e) {
    error.value = e.message || '今天的记录暂时没有加载出来'
    toast.err(error.value)
  } finally {
    loading.value = false
  }
}

async function toggleHabit(h) {
  if (checking.value) return
  if (couple.viewing) return toast.info('正在查看 TA 的空间（只读）')
  checking.value = h.id
  try {
    const done = await habitApi.check(h.id, { date: ov.value.date, done: !h.done })
    h.done = !!done
    // 连续天数与 30 天坚持条会随打卡变化，静默刷新
    const [fresh, tr] = await Promise.all([statsApi.overview(), statsApi.trend(30)])
    ov.value = fresh
    trend30.value = tr || []
  } catch (e) {
    toast.err(e.message)
  } finally {
    checking.value = 0
  }
}

onMounted(load)
</script>

<template>
  <div v-if="loading" class="home home--loading" aria-busy="true" aria-label="正在加载今日记录">
    <section class="skeleton-surface skeleton-head">
      <div class="skeleton-copy">
        <span class="skeleton skeleton--short" />
        <span class="skeleton skeleton--title" />
        <span class="skeleton skeleton--line" />
        <span class="skeleton skeleton--line skeleton--line-short" />
      </div>
      <div class="skeleton-progress">
        <span class="skeleton skeleton--value" />
        <span class="skeleton skeleton--bar" />
      </div>
    </section>
    <div class="work-grid">
      <section class="skeleton-surface skeleton-track">
        <span class="skeleton skeleton--title" />
        <span v-for="i in 4" :key="i" class="skeleton skeleton--row" />
      </section>
      <aside class="skeleton-surface skeleton-side">
        <span class="skeleton skeleton--title" />
        <span class="skeleton skeleton--row" />
        <span class="skeleton skeleton--row" />
      </aside>
    </div>
  </div>

  <div v-else-if="error" class="state-page" role="alert">
    <span class="state-page__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
        stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 8v5M12 17h.01" />
        <path d="M10.3 4.6 2.9 17.4A1.8 1.8 0 0 0 4.5 20h15a1.8 1.8 0 0 0 1.6-2.6L13.7 4.6a2 2 0 0 0-3.4 0Z" />
      </svg>
    </span>
    <h2>今天的记录暂时没有加载出来</h2>
    <p>{{ error }}</p>
    <button class="action-button action-button--primary" type="button" @click="load">重新加载</button>
  </div>

  <div v-else-if="ov" class="home">
    <section class="today-head">
      <div class="today-head__copy">
        <p class="date-line">{{ dateText }}</p>
        <h2 class="greeting">{{ hello }}，{{ displayName }}</h2>
        <p class="today-summary">
          <template v-if="habits.length">
            <template v-if="allDone">
              今天已完成 <strong>{{ doneCount }}</strong> 个习惯，今日轨道全部走完。
            </template>
            <template v-else>
              今天已完成 <strong>{{ doneCount }}</strong> 个习惯，
              还有 <strong>{{ remainingCount }}</strong> 个节点等你完成。
            </template>
          </template>
          <template v-else>今天还没有安排习惯，先从一件小事开始。</template>
        </p>
        <div class="today-actions">
          <template v-if="!couple.viewing">
            <button class="action-button" type="button" @click="router.push('/bills')">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              记一笔
            </button>
            <button class="action-button" type="button" @click="router.push('/diary')">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
                <path d="m14.5 7.5 3 3" />
              </svg>
              写日记
            </button>
          </template>
          <button class="action-button" type="button" @click="router.push('/todos')">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 7h3l1.6 1.6L12 5.2M4 14h3l1.6 1.6L12 12.2M16 7.5h4M16 14.5h4" />
            </svg>
            看待办
          </button>
        </div>
      </div>

      <div class="track-progress">
        <p class="track-progress__label">今日进度</p>
        <p class="track-progress__value">
          {{ doneCount }}<span>/{{ habits.length }}</span>
        </p>
        <div class="progress-track" role="progressbar" aria-label="今日习惯完成度"
          aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(habitRate)">
          <i :style="{ transform: `scaleX(${progressScale})` }" />
        </div>
        <p class="track-progress__note">{{ Math.round(habitRate) }}% · {{ maxStreakNote }} {{ maxStreakLabel }}</p>
        <div v-if="nextHabit" class="next-habit">
          <span>下一项</span>
          <b>{{ nextHabit.name || '未命名习惯' }}</b>
        </div>
        <p v-else-if="habits.length" class="next-habit next-habit--done">
          <span>今日完成</span>
          <b>所有习惯都已完成</b>
        </p>
      </div>
    </section>

    <section class="momentum" aria-labelledby="momentum-title">
      <header class="section-head">
        <div>
          <h3 id="momentum-title">近 30 天节律</h3>
          <p>{{ momentumSummary }}</p>
        </div>
        <RouterLink class="text-link" to="/habits">
          查看习惯
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </RouterLink>
      </header>
      <ol v-if="strip.length" class="momentum-track" aria-label="近 30 天打卡完成情况">
        <li v-for="cell in strip" :key="cell.date" class="momentum-cell"
          :class="{ 'is-today': cell.date === ov.date, 'is-empty': !cell.done }"
          :style="{ opacity: 0.18 + cell.ratio * 0.82 }"
          :title="`${cell.date} 完成 ${cell.done}/${cell.total}`">
          <span class="sr-only">{{ cell.date }}，完成 {{ cell.done }} 项，共 {{ cell.total }} 项</span>
        </li>
      </ol>
      <div v-if="strip.length" class="momentum-meta">
        <span>近 7 天完成 {{ recentSevenDays }} 次</span>
        <span v-if="bestTrendDay">
          最佳一天 {{ monthDay(bestTrendDay.date) }} · {{ bestTrendDay.done }}/{{ bestTrendDay.total }}
        </span>
      </div>
      <p v-else class="inline-empty">完成几次打卡后，这里会出现你的节律。</p>
    </section>

    <div class="work-grid">
      <section class="track-panel" aria-labelledby="today-track-title">
        <header class="section-head section-head--panel">
          <div>
            <h3 id="today-track-title">今日轨道</h3>
            <p>{{ habits.length ? `${habits.length} 个节点已安排` : "今天还没有待完成的节点" }}</p>
          </div>
          <RouterLink class="text-link" to="/habits">
            全部
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </RouterLink>
        </header>

        <div v-if="!habits.length" class="track-empty">
          <span class="track-empty__symbol" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <div>
            <b>添加第一个习惯</b>
            <p>从一个每天都能完成的小动作开始。</p>
          </div>
          <RouterLink class="action-button" to="/habits">添加习惯</RouterLink>
        </div>

        <ul v-else class="track-list">
          <li v-for="h in habits" :key="h.id" class="track-step"
            :class="{ 'is-done': h.done, 'is-next': nextHabit?.id === h.id }">
            <button class="track-step__button" type="button" :disabled="checking === h.id"
              :aria-pressed="!!h.done" :aria-disabled="couple.viewing ? 'true' : null"
              :aria-label="`${h.name || '未命名习惯'}，${h.done ? '已完成' : '待完成'}`"
              @click="toggleHabit(h)">
              <span class="track-step__node"
                :style="{ '--habit-color': `var(--c-${h.color || 'indigo'})` }">
                <span v-if="checking === h.id" class="check-spinner" aria-hidden="true" />
                <svg v-else-if="h.done" viewBox="0 0 24 24" width="13" height="13" fill="none"
                  stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
                  aria-hidden="true">
                  <path d="M5 12.5 9.5 17 19 7" />
                </svg>
              </span>
              <span class="track-step__copy">
                <b>{{ h.name || '未命名习惯' }}</b>
                <span>{{ h.done ? '今天已经完成' : '等待你完成' }}</span>
              </span>
              <span class="track-step__state">
                {{
                  checking === h.id
                    ? '保存中'
                    : h.done
                      ? '已完成'
                      : nextHabit?.id === h.id
                        ? '下一项'
                        : '待完成'
                }}
              </span>
            </button>
          </li>
        </ul>
      </section>

      <aside class="context-stack">
        <section class="context-panel" aria-labelledby="goal-title">
          <header class="section-head section-head--compact">
            <h3 id="goal-title">进行中的目标</h3>
            <RouterLink class="text-link" to="/goals">全部</RouterLink>
          </header>
          <template v-if="ov.topGoal">
            <div class="goal-summary">
              <div class="goal-summary__top">
                <b>{{ ov.topGoal.title || '未命名目标' }}</b>
                <span>{{ goalPercentLabel }}</span>
              </div>
              <div class="goal-progress">
                <i :style="{
                  transform: `scaleX(${goalPct / 100})`,
                  background: `var(--c-${ov.topGoal.color || 'indigo'}-g)`
                }" />
              </div>
              <div class="goal-summary__meta">
                <span>
                  {{ goalValue(ov.topGoal.currentValue) }} /
                  {{ goalValue(ov.topGoal.targetValue) }}
                  {{ ov.topGoal.unit || '' }}
                </span>
                <span :class="{ 'is-overdue': ov.topGoal.deadline && ov.topGoal.deadline < (ov.date || '') }">
                  {{ goalDeadlineText(ov.topGoal) }}
                </span>
              </div>
            </div>
          </template>
          <p v-else class="context-empty">暂无进行中的目标。 <RouterLink to="/goals">去设定目标</RouterLink></p>
        </section>

        <section class="context-panel" aria-labelledby="mood-title">
          <header class="section-head section-head--compact">
            <h3 id="mood-title">今日心情</h3>
            <RouterLink class="text-link" to="/diary">记录</RouterLink>
          </header>
          <div class="mood-summary">
            <span class="mood-dot" :class="moodTone" aria-hidden="true" />
            <div>
              <b>{{ ov.todayMood || '未记录' }}</b>
              <p>
                {{ hasValue(ov.todayDiaryCount) ? `今天已写 ${ov.todayDiaryCount} 篇日记` : '日记数据暂未返回' }}
              </p>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <section class="metric-rail" aria-label="今日生活指标">
      <div class="metric">
        <span class="metric__label">今日支出</span>
        <b class="metric__value is-expense">{{ formatMoney(ov.todayExpense) }}</b>
        <span class="metric__foot">{{ billFoot }}</span>
      </div>
      <div class="metric">
        <span class="metric__label">本月结余</span>
        <b class="metric__value" :class="balanceTone">{{ formatMoney(ov.monthBalance) }}</b>
        <span class="metric__foot">{{ balanceFoot }}</span>
      </div>
      <div class="metric">
        <span class="metric__label">待办</span>
        <b class="metric__value">{{ pendingTodo === null ? '—' : pendingTodo }}</b>
        <span class="metric__foot">{{ todoFoot }}</span>
      </div>
      <div class="metric">
        <span class="metric__label">本月打卡率</span>
        <b class="metric__value">{{ formatPercent(ov.monthRate) }}</b>
        <span class="metric__foot">{{ diaryFoot }}</span>
      </div>
    </section>

    <section class="ledger-panel" aria-labelledby="ledger-title">
      <header class="section-head section-head--panel">
        <div>
          <h3 id="ledger-title">今日流水</h3>
          <p>{{ ov.todayBills?.length ? `共 ${ov.todayBills.length} 笔记录` : '今天的收支会出现在这里' }}</p>
        </div>
        <RouterLink class="text-link" to="/bills">
          全部
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </RouterLink>
      </header>

      <div v-if="!ov.todayBills?.length" class="ledger-empty">
        <p>今天还没有记录流水。</p>
        <button v-if="!couple.viewing" class="action-button" type="button" @click="router.push('/bills')">
          记一笔
        </button>
      </div>
      <ul v-else class="bill-list">
        <li v-for="b in ov.todayBills" :key="b.id" class="bill-row">
          <span class="bill-icon"
            :style="{ background: `var(--c-${b.categoryColor || 'indigo'}-g)` }" aria-hidden="true">
            {{ b.categoryIcon || firstGlyph(b.categoryName) }}
          </span>
          <span class="bill-copy">
            <b>{{ b.title || '—' }}</b>
            <span>{{ b.categoryName || '未分类' }}</span>
          </span>
          <span class="bill-amount" :class="b.type === 1 ? 'is-income' : 'is-expense'">
            <template v-if="hasValue(b.amount)">
              {{ b.type === 1 ? '+' : '-' }}{{ money(Number(b.amount)) }}
            </template>
            <template v-else>—</template>
          </span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
/* ============================================================
   v3「今日轨道」
   ============================================================ */
.home {
  gap: var(--ui-space-4);
}

.home--loading {
  gap: var(--ui-space-4);
}

.skeleton-surface,
.today-head,
.track-panel,
.context-panel,
.ledger-panel,
.metric-rail {
  border: 1px solid var(--ui-line);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
}

.today-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 228px;
  gap: var(--ui-space-6);
  align-items: stretch;
  padding: var(--ui-space-6);
  box-shadow: var(--ui-shadow);
}
.today-head__copy {
  min-width: 0;
}
.date-line {
  color: var(--ui-text-subtle);
  font-size: 12px;
  line-height: 1.4;
}
.greeting {
  margin-top: 5px;
  color: var(--ui-text);
  font-size: 28px;
  font-weight: 650;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
.today-summary {
  max-width: 62ch;
  margin-top: 8px;
  color: var(--ui-text-muted);
  font-size: 14px;
  line-height: 1.65;
}
.today-summary strong {
  color: var(--ui-text);
  font-family: var(--ui-font-data);
  font-weight: 650;
}
.today-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ui-space-2);
  margin-top: var(--ui-space-5);
}
.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 13px;
  border: 1px solid var(--ui-line);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
  color: var(--ui-text-muted);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
  text-decoration: none;
  transition: color var(--ui-duration-fast) var(--ui-ease-out),
    background-color var(--ui-duration-fast) var(--ui-ease-out),
    border-color var(--ui-duration-fast) var(--ui-ease-out),
    transform var(--ui-duration-fast) var(--ui-ease-out);
}
.action-button--primary {
  border-color: var(--ui-accent);
  background: var(--ui-accent);
  color: var(--ui-on-accent);
}
.action-button:active {
  transform: scale(0.98);
}
.action-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
}
.track-progress {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-width: 0;
  padding: var(--ui-space-5);
  border-radius: var(--ui-radius);
  background: var(--ui-spotlight);
  color: var(--ui-on-spotlight);
}
.track-progress__label {
  color: var(--ui-on-spotlight-muted);
  font-size: 12px;
}
.track-progress__value {
  margin-top: 4px;
  color: var(--ui-on-spotlight);
  font-family: var(--ui-font-data);
  font-size: 44px;
  font-weight: 650;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.track-progress__value span {
  color: var(--ui-on-spotlight-muted);
  font-size: 20px;
  font-weight: 500;
}
.progress-track {
  height: 8px;
  margin-top: 14px;
  overflow: hidden;
  border-radius: var(--ui-radius-pill);
  background: var(--ui-spotlight-track);
}
.progress-track i {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: var(--ui-on-spotlight);
  transform-origin: left center;
  transition: transform var(--ui-duration-slow) var(--ui-ease-out);
}
.track-progress__note {
  margin-top: 9px;
  color: var(--ui-on-spotlight-muted);
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.next-habit {
  margin-top: 13px;
  padding-top: 11px;
  border-top: 1px solid var(--ui-spotlight-line);
}
.next-habit span {
  display: block;
  color: var(--ui-on-spotlight-muted);
  font-size: 12px;
  line-height: 1.4;
}
.next-habit b {
  display: block;
  margin-top: 2px;
  color: var(--ui-on-spotlight);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.next-habit--done b {
  color: var(--ui-on-spotlight);
}

.momentum {
  padding: 2px 2px 0;
}
.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ui-space-4);
}
.section-head h3 {
  color: var(--ui-text);
  font-size: 15px;
  font-weight: 650;
  line-height: 1.35;
}
.section-head p {
  margin-top: 3px;
  color: var(--ui-text-subtle);
  font-size: 12px;
  line-height: 1.5;
}
.section-head--panel {
  margin-bottom: var(--ui-space-4);
}
.section-head--compact {
  align-items: center;
  margin-bottom: var(--ui-space-3);
}
.text-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: 0 0 auto;
  min-height: 32px;
  color: var(--ui-accent);
  font-size: 12px;
  font-weight: 550;
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 4px;
  transition: text-decoration-color var(--ui-duration-fast) var(--ui-ease-out);
}
.momentum-track {
  display: grid;
  grid-template-columns: repeat(30, minmax(0, 1fr));
  gap: 3px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.momentum-cell {
  height: 18px;
  border-radius: 3px;
  background: var(--ui-accent);
}
.momentum-cell.is-empty {
  background: var(--ui-line);
}
.momentum-cell.is-today {
  outline: 2px solid var(--ui-signal-blue);
  outline-offset: 2px;
}
.momentum-meta {
  display: flex;
  justify-content: space-between;
  gap: var(--ui-space-4);
  margin-top: 10px;
  color: var(--ui-text-subtle);
  font-size: 12px;
  line-height: 1.5;
}
.inline-empty {
  margin-top: 10px;
  color: var(--ui-text-subtle);
  font-size: 12px;
}

.work-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.85fr);
  gap: var(--ui-space-4);
  align-items: start;
}
.track-panel,
.context-panel,
.ledger-panel {
  padding: var(--ui-space-5);
}

.track-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}
.track-step {
  position: relative;
}
.track-step:not(:last-child)::before {
  content: '';
  position: absolute;
  top: 38px;
  bottom: -8px;
  left: 15px;
  width: 2px;
  background: var(--ui-line);
  transition: background-color var(--ui-duration-base) var(--ui-ease-out);
}
.track-step.is-done:not(:last-child)::before {
  background: var(--ui-accent);
}
.track-step.is-next .track-step__button {
  background: var(--ui-accent-soft);
}
.track-step.is-next .track-step__node {
  border-color: var(--ui-accent);
  box-shadow: 0 0 0 3px var(--ui-accent-soft);
}
.track-step.is-next .track-step__state {
  color: var(--ui-accent);
  font-weight: 600;
}
.track-step__button {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--ui-space-3);
  width: 100%;
  min-height: 58px;
  padding: 10px 8px;
  border: 0;
  border-radius: var(--ui-radius);
  background: transparent;
  color: var(--ui-text);
  text-align: left;
  transition: background-color var(--ui-duration-fast) var(--ui-ease-out),
    transform var(--ui-duration-fast) var(--ui-ease-out);
}
.track-step__button:active {
  transform: scale(0.99);
}
.track-step__button:disabled {
  cursor: wait;
}
.track-step__node {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1.5px solid var(--ui-line-strong);
  border-radius: var(--ui-radius-pill);
  background: var(--ui-surface);
  color: transparent;
  transition: background-color var(--ui-duration-base) var(--ui-ease-out),
    border-color var(--ui-duration-base) var(--ui-ease-out),
    color var(--ui-duration-base) var(--ui-ease-out);
}
.is-done .track-step__node {
  border-color: transparent;
  background: var(--habit-color, var(--ui-accent));
  color: #FFFFFF;
}
.track-step__copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.track-step__copy b {
  color: var(--ui-text);
  font-size: 14px;
  font-weight: 550;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.track-step__copy span {
  color: var(--ui-text-subtle);
  font-size: 12px;
  line-height: 1.45;
}
.track-step__state {
  color: var(--ui-text-subtle);
  font-size: 12px;
  white-space: nowrap;
}
.is-done .track-step__state {
  color: var(--ui-accent);
}
.check-spinner {
  width: 13px;
  height: 13px;
  border: 2px solid var(--ui-line);
  border-top-color: var(--ui-accent);
  border-radius: var(--ui-radius-pill);
  animation: spin 700ms linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.track-empty {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--ui-space-3);
  padding: 20px 0 4px;
}
.track-empty__symbol {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--ui-radius);
  background: var(--ui-accent-soft);
  color: var(--ui-accent);
}
.track-empty b {
  color: var(--ui-text);
  font-size: 14px;
  font-weight: 600;
}
.track-empty p {
  margin-top: 2px;
  color: var(--ui-text-subtle);
  font-size: 12px;
}

.context-stack {
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-4);
}
.goal-summary {
  padding: 2px 0 4px;
}
.goal-summary__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ui-space-3);
}
.goal-summary__top b {
  color: var(--ui-text);
  font-size: 14px;
  font-weight: 550;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.goal-summary__top span {
  flex: 0 0 auto;
  color: var(--ui-signal-blue);
  font-family: var(--ui-font-data);
  font-size: 13px;
  font-weight: 650;
}
.goal-progress {
  height: 6px;
  margin-top: 12px;
  overflow: hidden;
  border-radius: var(--ui-radius-pill);
  background: var(--ui-surface-2);
}
.goal-progress i {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  transform-origin: left center;
  transition: transform var(--ui-duration-slow) var(--ui-ease-out);
}
.goal-summary__meta {
  display: flex;
  justify-content: space-between;
  gap: var(--ui-space-3);
  margin-top: 8px;
  color: var(--ui-text-subtle);
  font-size: 12px;
  line-height: 1.5;
}
.goal-summary__meta .is-overdue {
  color: var(--ui-danger);
}
.context-empty {
  color: var(--ui-text-subtle);
  font-size: 12.5px;
  line-height: 1.6;
}
.context-empty a {
  color: var(--ui-accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.mood-summary {
  display: flex;
  align-items: center;
  gap: var(--ui-space-3);
}
.mood-dot {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  border-radius: var(--ui-radius-pill);
  background: var(--ui-line-strong);
}
.mood-dot.is-positive {
  background: var(--ui-signal-lemon);
}
.mood-dot.is-calm {
  background: var(--ui-accent);
}
.mood-dot.is-tired {
  background: var(--ui-signal-blue);
}
.mood-dot.is-low {
  background: var(--ui-signal-coral);
}
.mood-summary b {
  color: var(--ui-text);
  font-size: 14px;
  font-weight: 600;
}
.mood-summary p {
  margin-top: 2px;
  color: var(--ui-text-subtle);
  font-size: 12px;
}

.metric-rail {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
}
.metric {
  min-width: 0;
  padding: 17px 18px;
  border-left: 1px solid var(--ui-line);
}
.metric:first-child {
  border-left: 0;
}
.metric__label {
  display: block;
  color: var(--ui-text-subtle);
  font-size: 12px;
  line-height: 1.4;
}
.metric__value {
  display: block;
  margin-top: 5px;
  color: var(--ui-text);
  font-family: var(--ui-font-data);
  font-size: 26px;
  font-weight: 650;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.metric__value.is-income {
  color: var(--income);
}
.metric__value.is-expense {
  color: var(--expense);
}
.metric__foot {
  display: block;
  margin-top: 5px;
  color: var(--ui-text-subtle);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.ledger-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ui-space-3);
  padding-top: var(--ui-space-3);
  border-top: 1px solid var(--ui-line);
  color: var(--ui-text-subtle);
  font-size: 13px;
}
.bill-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.bill-row {
  display: flex;
  align-items: center;
  gap: var(--ui-space-3);
  padding: 12px 0;
  border-top: 1px solid var(--ui-line);
}
.bill-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  border-radius: var(--ui-radius);
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 600;
}
.bill-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  line-height: 1.4;
}
.bill-copy b {
  color: var(--ui-text);
  font-size: 13px;
  font-weight: 550;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bill-copy span {
  color: var(--ui-text-subtle);
  font-size: 12px;
}
.bill-amount {
  flex: 0 0 auto;
  font-family: var(--ui-font-data);
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.bill-amount.is-income {
  color: var(--income);
}
.bill-amount.is-expense {
  color: var(--expense);
}

.state-page {
  width: min(100%, 640px);
  margin: 40px auto;
  padding: 36px 28px;
  border: 1px solid var(--ui-line);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
  box-shadow: var(--ui-shadow);
  text-align: center;
}
.state-page__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--ui-radius);
  background: var(--ui-signal-coral-soft);
  color: var(--ui-danger);
}
.state-page h2 {
  margin-top: 16px;
  color: var(--ui-text);
  font-size: 20px;
  font-weight: 650;
  line-height: 1.35;
}
.state-page p {
  margin: 7px auto 18px;
  max-width: 48ch;
  color: var(--ui-text-muted);
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.skeleton {
  display: block;
  height: 14px;
  border-radius: var(--ui-radius-sm);
  background: linear-gradient(
    90deg,
    var(--ui-surface-2) 25%,
    var(--ui-surface) 50%,
    var(--ui-surface-2) 75%
  );
  background-size: 200% 100%;
  animation: skeleton 1.35s linear infinite;
}
.skeleton-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 228px;
  gap: var(--ui-space-6);
  padding: var(--ui-space-6);
}
.skeleton-copy,
.skeleton-progress {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.skeleton--short {
  width: 34%;
  height: 12px;
}
.skeleton--title {
  width: 58%;
  height: 28px;
}
.skeleton--line {
  width: 92%;
  height: 14px;
}
.skeleton--line-short {
  width: 70%;
}
.skeleton--value {
  width: 120px;
  height: 44px;
}
.skeleton--bar {
  width: 100%;
  height: 8px;
  margin-top: 12px;
}
.skeleton-track,
.skeleton-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: var(--ui-space-5);
}
.skeleton--row {
  width: 100%;
  height: 44px;
}
.skeleton--row:last-child {
  width: 72%;
}
@keyframes skeleton {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (hover: hover) and (pointer: fine) {
  .action-button:hover {
    border-color: var(--ui-line-strong);
    background: var(--ui-surface-2);
    color: var(--ui-text);
  }
  .action-button--primary:hover {
    border-color: var(--ui-accent-hover);
    background: var(--ui-accent-hover);
    color: var(--ui-on-accent);
  }
  .text-link:hover {
    text-decoration-color: currentColor;
  }
  .track-step__button:hover {
    background: var(--ui-surface-2);
  }
}

@media (max-width: 1100px) {
  .work-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .context-stack {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .today-head,
  .skeleton-head {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
    padding: var(--ui-space-4);
  }
  .track-progress {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    column-gap: 12px;
    row-gap: 6px;
    padding: var(--ui-space-4);
  }
  .track-progress__label {
    grid-column: 1 / -1;
  }
  .track-progress__value {
    grid-row: 2 / 4;
    align-self: center;
    margin-top: 0;
    font-size: 32px;
  }
  .progress-track {
    align-self: center;
    margin-top: 0;
  }
  .track-progress__note {
    margin-top: 0;
  }
  .next-habit {
    grid-column: 1 / -1;
    margin-top: 4px;
  }
  .momentum-meta {
    flex-wrap: wrap;
    gap: 4px 16px;
  }
  .text-link {
    min-height: 44px;
    min-width: 44px;
  }
  .context-empty a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }
  .context-stack {
    grid-template-columns: minmax(0, 1fr);
  }
  .metric-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .metric:nth-child(odd) {
    border-left: 0;
  }
  .metric:nth-child(n + 3) {
    border-top: 1px solid var(--ui-line);
  }
  .track-empty {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .track-empty .action-button {
    grid-column: 2;
    justify-self: start;
  }
}

@media (max-width: 520px) {
  .greeting {
    font-size: 24px;
  }
  .today-actions {
    gap: 7px;
  }
  .action-button {
    min-height: 44px;
    padding: 0 11px;
  }
  .momentum-track {
    gap: 2px;
  }
  .momentum-cell {
    height: 14px;
  }
  .track-panel,
  .context-panel,
  .ledger-panel {
    padding: var(--ui-space-4);
  }
  .track-step__button {
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 10px;
    padding-right: 0;
  }
  .track-step__state {
    grid-column: 2;
    margin-top: -6px;
    font-size: 12px;
  }
  .track-step:not(:last-child)::before {
    left: 13px;
  }
  .metric {
    padding: 15px 14px;
  }
  .metric__value {
    font-size: 23px;
  }
  .ledger-empty {
    align-items: flex-start;
    flex-direction: column;
  }
  .state-page {
    margin: 20px auto;
    padding: 28px 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton,
  .check-spinner {
    animation: none;
  }
  .action-button,
  .track-step__button,
  .track-step__node,
  .track-step::before,
  .progress-track i,
  .goal-progress i {
    transition: none;
  }
  .action-button:active,
  .track-step__button:active {
    transform: none;
  }
}
</style>
