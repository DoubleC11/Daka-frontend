<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { statsApi, habitApi } from '../api'
import { useAuthStore } from '../stores/auth'
import { toast } from '../utils/toast'
import { monthDay, money, pct, relativeDate } from '../utils/format'

const MOOD_EMOJI = { 开心: '😄', 平静: '😌', 疲惫: '😪', 低落: '😔' }

const router = useRouter()
const auth = useAuthStore()

const loading = ref(true)
const ov = ref(null)
const checking = ref(0)

const habits = computed(() => ov.value?.todayHabits || [])
const doneCount = computed(() => habits.value.filter((h) => h.done).length)
const habitRate = computed(() =>
  habits.value.length ? (doneCount.value / habits.value.length) * 100 : 0
)

const todos = computed(() => ov.value?.todoCounts || {})
const goalPct = computed(() => Math.min(100, Math.max(0, ov.value?.topGoalPercent || 0)))

/** 顶部问候语由后端给出，前端按本地时间兜底 */
const hello = computed(() => {
  if (ov.value?.greeting) return ov.value.greeting
  const h = new Date().getHours()
  const g = h < 6 ? '凌晨好' : h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'
  return g
})

const dateText = computed(() => {
  const d = ov.value?.date
  if (!d) return ''
  return `${monthDay(d)} ${ov.value?.weekday || ''}`
})

const ring = computed(() => {
  const r = 46
  const c = 2 * Math.PI * r
  const on = (habitRate.value / 100) * c
  return { r, c, on, off: c - on }
})

const billTrend = computed(() => {
  const inc = Number(ov.value?.todayIncome || 0)
  const exp = Number(ov.value?.todayExpense || 0)
  const bal = Number(ov.value?.todayBalance || 0)
  return { inc, exp, bal }
})

async function load() {
  loading.value = true
  try {
    ov.value = await statsApi.overview()
  } catch (e) {
    toast.err(e.message)
  } finally {
    loading.value = false
  }
}

async function toggleHabit(h) {
  if (checking.value) return
  checking.value = h.id
  try {
    const done = await habitApi.check(h.id, { date: ov.value.date, done: !h.done })
    h.done = !!done
    // 连续天数会随打卡变化，静默刷新概览
    const fresh = await statsApi.overview()
    ov.value = fresh
  } catch (e) {
    toast.err(e.message)
  } finally {
    checking.value = 0
  }
}

onMounted(load)
</script>

<template>
  <div v-if="loading" class="grid g4">
    <div v-for="i in 4" :key="i" class="card sk" />
    <div class="card sk sk--wide" />
  </div>

  <div v-else-if="ov" class="home">
    <!-- 首屏问候 + 习惯进度 -->
    <section class="hero card card--lg">
      <div class="hero__left">
        <span class="chip chip--outline">{{ dateText }}</span>
        <h2 class="hero__hi">{{ hello }}，{{ auth.user?.nickname || auth.user?.username }}</h2>
        <p class="hero__sub">
          今天已打卡 <b class="grad-text">{{ doneCount }}</b> / {{ habits.length }} 个习惯，
          连续最长 <b class="grad-text--pop">{{ ov.maxStreak }}</b> 天
          <template v-if="ov.maxStreakHabit">（{{ ov.maxStreakHabit }}）</template>
        </p>
        <div class="hero__acts">
          <button class="btn btn--sm" @click="router.push('/bills')">记一笔</button>
          <button class="btn btn--ghost btn--sm" @click="router.push('/diary')">写日记</button>
          <button class="btn btn--ghost btn--sm" @click="router.push('/todos')">看待办</button>
        </div>
      </div>

      <div class="ring">
        <svg viewBox="0 0 120 120" width="128" height="128">
          <circle cx="60" cy="60" :r="ring.r" fill="none" stroke-width="11" style="stroke: var(--track-c)" />
          <circle cx="60" cy="60" :r="ring.r" fill="none" stroke="url(#ringGrad)" stroke-width="11"
            stroke-linecap="round" :stroke-dasharray="`${ring.on} ${ring.off}`" transform="rotate(-90 60 60)"
            class="ring__bar" />
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#6366F1" />
              <stop offset="55%" stop-color="#8B5CF6" />
              <stop offset="100%" stop-color="#38BDF8" />
            </linearGradient>
          </defs>
        </svg>
        <div class="ring__txt">
          <b>{{ Math.round(habitRate) }}<i>%</i></b>
          <span>今日完成度</span>
        </div>
      </div>
    </section>

    <!-- Bento 数据卡 -->
    <section class="grid g4">
      <div class="card tile">
        <span class="tile__k">今日支出</span>
        <b class="tile__v" style="color: var(--expense)">¥{{ money(billTrend.exp) }}</b>
        <span class="tile__f">收入 ¥{{ money(billTrend.inc) }}</span>
      </div>
      <div class="card tile">
        <span class="tile__k">本月结余</span>
        <b class="tile__v" :style="{ color: Number(ov.monthBalance) >= 0 ? 'var(--income)' : 'var(--expense)' }">
          ¥{{ money(ov.monthBalance) }}
        </b>
        <span class="tile__f">收 {{ money(ov.monthIncome) }} · 支 {{ money(ov.monthExpense) }}</span>
      </div>
      <div class="card tile">
        <span class="tile__k">待办</span>
        <b class="tile__v">{{ (todos.todayTotal || 0) - (todos.todayDone || 0) }}</b>
        <span class="tile__f">今日 {{ todos.todayDone || 0 }}/{{ todos.todayTotal || 0 }} · 本周 {{ todos.weekDone || 0 }}/{{ todos.weekTotal || 0 }}</span>
      </div>
      <div class="card tile">
        <span class="tile__k">本月打卡率</span>
        <b class="tile__v grad-text">{{ pct(ov.monthRate, 1) }}</b>
        <span class="tile__f">日记 {{ ov.todayDiaryCount }} 篇 · 本月心情 {{ ov.todayMood || '—' }}</span>
      </div>
    </section>

    <!-- 主体两栏 -->
    <section class="body-grid">
      <!-- 今日习惯 -->
      <div class="card">
        <div class="row--between card__head">
          <h3 class="card-title">今日习惯</h3>
          <RouterLink class="link" to="/habits">全部 →</RouterLink>
        </div>
        <div v-if="!habits.length" class="empty">还没有习惯，去「习惯」页添加第一个吧</div>
        <ul v-else class="hlist">
          <li v-for="h in habits" :key="h.id" class="hlist__row" :class="{ 'is-done': h.done }"
            @click="toggleHabit(h)">
            <span class="hlist__box" :style="{ '--c': `var(--c-${h.color || 'indigo'})` }">
              <svg v-if="h.done" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="3.2"
                stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 9.5 17 19 7" /></svg>
            </span>
            <span class="hlist__name">{{ h.name }}</span>
            <span v-if="checking === h.id" class="hint">…</span>
          </li>
        </ul>
      </div>

      <!-- 目标 -->
      <div class="card">
        <div class="row--between card__head">
          <h3 class="card-title">进行中的目标</h3>
          <RouterLink class="link" to="/goals">全部 →</RouterLink>
        </div>
        <template v-if="ov.topGoal">
          <div class="goal">
            <div class="row--between">
              <b class="goal__name">{{ ov.topGoal.title }}</b>
              <span class="goal__pct">{{ pct(goalPct, 1) }}</span>
            </div>
            <div class="bar bar--thick goal__bar">
              <i :style="{ width: goalPct + '%', background: `var(--c-${ov.topGoal.color || 'indigo'}-g)` }" />
            </div>
            <div class="row--between goal__meta">
              <span class="hint">{{ Number(ov.topGoal.currentValue || 0) }} / {{ Number(ov.topGoal.targetValue || 0) }} {{ ov.topGoal.unit || '' }}</span>
              <span class="hint" :class="{ 'is-over': ov.topGoal.deadline && ov.topGoal.deadline < (ov.date || '') }">
                {{ ov.topGoal.deadline ? '截止 ' + relativeDate(ov.topGoal.deadline) : '无截止' }}
              </span>
            </div>
          </div>
        </template>
        <div v-else class="empty">
          <span class="e-emoji">🎯</span>
          <b>暂无进行中的目标</b>
        </div>

        <div class="divider" />
        <div class="row--between card__head card__head--tight">
          <h3 class="card-title">今日心情</h3>
          <RouterLink class="link" to="/diary">去记录 →</RouterLink>
        </div>
        <div class="mood">
          <span class="mood__emoji">{{ MOOD_EMOJI[ov.todayMood] || '🫥' }}</span>
          <span class="mood__txt">
            {{ ov.todayMood ? '今天记录了心情：' + ov.todayMood : '今天还没有写日记' }}
          </span>
        </div>
      </div>
    </section>

    <!-- 今日流水 -->
    <section class="card">
      <div class="row--between card__head">
        <h3 class="card-title">今日流水</h3>
        <RouterLink class="link" to="/bills">全部 →</RouterLink>
      </div>
      <div v-if="!ov.todayBills?.length" class="empty">
        <span class="e-emoji">🫙</span>
        <b>今天还没有记账</b>
      </div>
      <ul v-else class="bills">
        <li v-for="b in ov.todayBills" :key="b.id" class="bills__row">
          <span class="icon-box icon-box--sm"
            :style="{ background: `var(--c-${b.categoryColor || 'indigo'}-g)` }">
            {{ b.categoryIcon || b.categoryName?.slice(0, 1) }}
          </span>
          <span class="bills__mid">
            <b>{{ b.title }}</b>
            <i>{{ b.categoryName }}</i>
          </span>
          <span class="bills__amt" :class="b.type === 1 ? 'is-income' : 'is-expense'">
            {{ b.type === 1 ? '+' : '-' }}{{ money(b.amount) }}
          </span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ---------- 骨架 ---------- */
.sk {
  height: 96px;
  background: linear-gradient(100deg, var(--sk-a) 30%, var(--sk-b) 50%, var(--sk-a) 70%);
  background-size: 220% 100%;
  animation: sk 1.2s infinite;
}
.sk--wide { grid-column: span 4; height: 150px; }
@keyframes sk { from { background-position: 130% 0; } to { background-position: -30% 0; } }

/* ---------- 首屏 ---------- */
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  background: var(--card);
  backdrop-filter: blur(20px);
  overflow: hidden;
  position: relative;
}
.hero::after {
  content: '';
  position: absolute;
  right: -60px;
  top: -70px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.18), transparent 68%);
  pointer-events: none;
}
.hero__left { min-width: 0; }
.hero__hi {
  margin: 12px 0 6px;
  font-size: 25px;
  font-weight: 600;
  letter-spacing: -0.7px;
}
.hero__sub {
  font-size: 12.5px;
  color: var(--t2);
  line-height: 1.8;
}
.hero__sub b { font-weight: 600; }
.hero__acts {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ring { position: relative; flex: 0 0 auto; }
.ring__bar { transition: stroke-dasharray 0.7s cubic-bezier(0.22, 1, 0.36, 1); }
.ring__txt {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
}
.ring__txt b {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -1px;
  line-height: 1;
}
.ring__txt b i { font-size: 12px; font-style: normal; color: var(--t3); }
.ring__txt span { font-size: 10.5px; color: var(--t3); }

/* ---------- 数据砖 ---------- */
.tile {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.tile__k { font-size: 11.5px; color: var(--t2); }
.tile__v {
  font-size: 23px;
  font-weight: 600;
  letter-spacing: -0.7px;
  line-height: 1.15;
}
.tile__f { font-size: 10.5px; color: var(--t3); }

/* ---------- 两栏 ---------- */
.body-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
}
.card__head { margin-bottom: 12px; }
.card__head--tight { margin-bottom: 10px; }
.link { font-size: 11.5px; color: var(--c-indigo); }

.hlist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.hlist__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  border-radius: 14px;
  background: var(--card-soft);
  cursor: pointer;
  transition: all 0.16s;
}
.hlist__row:hover { background: var(--hover-c); }
.hlist__row.is-done { background: rgba(16, 185, 129, 0.08); }
.hlist__box {
  width: 21px;
  height: 21px;
  border-radius: 7px;
  border: 1.6px solid var(--c, var(--c-indigo));
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  transition: all 0.16s;
}
.is-done .hlist__box { background: var(--c, var(--c-indigo)); border-color: transparent; }
.hlist__name { font-size: 12.5px; }
.is-done .hlist__name { color: var(--t2); text-decoration: line-through; }

.goal__name { font-size: 13.5px; font-weight: 500; }
.goal__pct { font-size: 12px; color: var(--c-indigo); font-weight: 500; }
.goal__bar { margin: 10px 0 8px; }
.goal__meta .is-over { color: var(--danger); }

.divider { height: 0.5px; background: var(--line-c); margin: 16px 0; }

.mood { display: flex; align-items: center; gap: 11px; }
.mood__emoji {
  font-size: 24px;
  width: 44px;
  height: 44px;
  border-radius: 15px;
  background: var(--card-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.mood__txt { font-size: 12.5px; color: var(--t2); }

/* ---------- 流水 ---------- */
.bills { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.bills__row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 4px;
  border-bottom: 0.5px solid var(--line-c);
}
.bills__row:last-child { border-bottom: none; }
.bills__mid { display: flex; flex-direction: column; flex: 1; min-width: 0; line-height: 1.35; }
.bills__mid b { font-size: 12.5px; font-weight: 500; }
.bills__mid i { font-size: 10.5px; color: var(--t3); font-style: normal; }
.bills__amt { font-size: 13px; font-weight: 500; }
.bills__amt.is-income { color: var(--income); }
.bills__amt.is-expense { color: var(--expense); }

@media (max-width: 1080px) {
  .grid.g4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sk--wide { grid-column: span 2; }
}
@media (max-width: 780px) {
  .hero { flex-direction: column; align-items: flex-start; }
  .ring { align-self: center; }
  .body-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 520px) {
  .grid.g4 { grid-template-columns: minmax(0, 1fr); }
  .sk--wide { grid-column: span 1; }
  .hero__hi { font-size: 21px; }
}
</style>
