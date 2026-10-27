<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCoupleStore } from '../stores/couple'
import { useAuthStore } from '../stores/auth'
import { toast } from '../utils/toast'
import ConfirmModal from '../components/ConfirmModal.vue'

const couple = useCoupleStore()
const auth = useAuthStore()
const router = useRouter()

const code = ref('')
const busy = ref(false)
const showUnbind = ref(false)

const partnerName = computed(
  () => couple.partner?.nickname || couple.partner?.username || 'TA'
)
const bindDate = computed(() => (couple.info?.bindTime || '').slice(0, 10))

/** 每秒走一次的“当前时刻”，倒计时靠它驱动 */
const now = ref(Date.now())
let ticker = null

/** 邀请码剩余秒数；优先用后端给的绝对失效时刻，缺失时用响应快照兜底 */
const remainSeconds = computed(() => {
  const inv = couple.invite
  if (!inv) return -1
  if (inv.expireAt) {
    const s = Math.ceil((inv.expireAt - now.value) / 1000)
    // 封顶 30 分钟，避免服务器与浏览器时钟差出现 30:01 这种怪数
    return Math.max(Math.min(s, 30 * 60), 0)
  }
  const passed = Math.floor((now.value - (couple.inviteAt || now.value)) / 1000)
  return Math.max((inv.expireSeconds ?? 0) - passed, 0)
})

const expired = computed(() => !!couple.invite && remainSeconds.value <= 0)

/** 剩余有效期，mm:ss */
const expireText = computed(() => {
  if (!couple.invite) return ''
  if (expired.value) return '已过期'
  const s = remainSeconds.value
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} 后失效`
})

const genBtnText = computed(() => {
  if (!couple.invite) return '生成邀请码'
  return expired.value ? '生成新邀请码' : '重新生成（旧码立即失效）'
})

// 倒计时归零时提示一次
watch(expired, (v) => {
  if (v) toast.info('邀请码已过期，请重新生成后再发给对方')
})

onMounted(async () => {
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 1000)
  await couple.load()
  // 刷新页面后把还没被使用的邀请码捞回来，否则状态丢了会让“重新生成”看起来没反应
  if (!couple.bound) await couple.loadInvite()
})

onBeforeUnmount(() => {
  if (ticker) clearInterval(ticker)
  ticker = null
})

async function genInvite() {
  const isRefresh = !!couple.invite
  busy.value = true
  try {
    const res = await couple.createInvite(isRefresh)
    toast.ok(isRefresh ? `新邀请码 ${res.code} 已生成，旧码已失效` : '邀请码已生成，30 分钟内有效')
  } catch (e) {
    toast.err(e.message)
  } finally {
    busy.value = false
  }
}

async function copyInvite() {
  const c = couple.invite?.code
  if (!c) return
  try {
    await navigator.clipboard.writeText(c)
    toast.ok('已复制邀请码')
  } catch {
    toast.err('复制失败，请手动选中复制')
  }
}

async function doBind() {
  const c = code.value.trim()
  if (!c) return toast.err('请输入对方的邀请码')
  busy.value = true
  try {
    await couple.bind(c)
    code.value = ''
    toast.ok('绑定成功')
  } catch (e) {
    toast.err(e.message)
  } finally {
    busy.value = false
  }
}

async function doUnbind() {
  try {
    await couple.unbind()
    toast.info('已解除绑定')
  } catch (e) {
    toast.err(e.message)
  }
}

function enterSpace() {
  if (!couple.enterView()) return
  router.push('/')
  toast.info(`正在查看 ${partnerName.value} 的空间（只读）`)
}

function exitSpace() {
  couple.exitView()
  toast.info('已回到我的空间')
}
</script>

<template>
  <div class="couple">
    <!-- ---------- 未绑定 ---------- -->
    <template v-if="!couple.bound">
      <section class="card card--lg c-hero">
        <span class="c-hero__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.8 5.8a5.2 5.2 0 0 0-7.4 0L12 7.2l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 22l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z" />
          </svg>
        </span>
        <h2 class="c-hero__title">情侣空间</h2>
        <p class="hint">
          绑定后双方可以查看对方的习惯、日记、目标、待办、记账和统计，<b>全部只读</b>；
          新增与修改始终记在自己名下。右侧还会多出一块「我们的日历」，那个是
          <b>双方共享、都能编辑</b>的。
        </p>
        <p class="c-me">
          当前登录：<b>@{{ auth.user?.username || '未登录' }}</b>
          <span v-if="auth.user?.nickname">（{{ auth.user.nickname }}）</span>
          ——请确认邀请码发给的是对方账号
        </p>
      </section>

      <div class="c-grid">
        <section class="card c-block">
          <h3 class="card-title">① 生成我的邀请码</h3>
          <p class="hint">把邀请码发给对方，30 分钟内有效。</p>
          <button class="btn btn--block" :disabled="busy" @click="genInvite">
            {{ genBtnText }}
          </button>
          <div v-if="couple.invite" class="c-code" :class="{ 'c-code--expired': expired }">
            <b>{{ couple.invite.code }}</b>
            <span class="hint">{{ expireText }}</span>
            <button v-if="!expired" class="btn btn--ghost btn--sm" @click="copyInvite">复制</button>
            <span v-else class="hint c-expired-tip">旧码已作废，点上面按钮换一个新的</span>
          </div>
        </section>

        <section class="card c-block">
          <h3 class="card-title">② 输入对方的邀请码</h3>
          <label class="field">
            <span>邀请码</span>
            <input
              v-model="code"
              class="inp"
              placeholder="6 位邀请码"
              maxlength="10"
              autocapitalize="characters"
              autocorrect="off"
              spellcheck="false"
              @keyup.enter="doBind"
            />
          </label>
          <button class="btn btn--block" :disabled="busy" @click="doBind">立即绑定</button>
          <p class="hint">绑定成功后本页会显示对方昵称与「在一起」天数。</p>
        </section>
      </div>
    </template>

    <!-- ---------- 已绑定 ---------- -->
    <template v-else>
      <section class="card card--lg c-hero">
        <span class="c-hero__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.8 5.8a5.2 5.2 0 0 0-7.4 0L12 7.2l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 22l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z" />
          </svg>
        </span>
        <h2 class="c-hero__title">和 {{ partnerName }} 在一起</h2>
        <p class="hint">
          @{{ couple.partner?.username }} · 绑定于 {{ bindDate }} · 第 {{ couple.info.days }} 天
        </p>
        <div class="c-acts">
          <button v-if="!couple.viewing" class="btn" @click="enterSpace">进入 TA 的空间</button>
          <button v-else class="btn btn--ghost" @click="exitSpace">回到我的空间</button>
          <button class="btn btn--danger btn--sm" @click="showUnbind = true">解除绑定</button>
        </div>
      </section>

      <section class="card c-block">
        <h3 class="card-title">查看范围</h3>
        <ul class="c-list">
          <li>今日概览、习惯、日记、目标、待办、记账、统计：切换到 TA 后<b>全部只读</b></li>
          <li>任何新增、打卡、编辑、删除都只作用于你自己的数据</li>
          <li>右侧栏「我们的日历」例外：两个人读写同一份，谁写的那天谁都能改</li>
          <li>数据导出（CSV）始终只导出你自己的记录</li>
          <li>任一方解除绑定后，另一方立即失去查看权限</li>
        </ul>
      </section>
    </template>

    <ConfirmModal
      v-model="showUnbind"
      title="解除情侣绑定？"
      :text="`解除后 ${partnerName} 将无法再查看你的数据，此操作不可撤销。`"
      confirm-text="解除绑定"
      @confirm="doUnbind"
    />
  </div>
</template>

<style scoped>
.couple {
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-4);
}

.c-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}
.c-hero__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--ui-radius);
  background: var(--ui-accent-soft);
  color: var(--ui-accent);
}
.c-hero__title {
  font-size: 20px;
  font-weight: 650;
}
.c-me {
  font-size: 13px;
  color: var(--ui-text-subtle);
  line-height: 1.7;
}
.c-me b {
  color: var(--ui-text);
  font-weight: 600;
}

.c-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
.c-block {
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-3);
}

.c-code {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-radius: var(--ui-radius);
  background: var(--card-soft);
  border: 1px solid var(--ui-line);
}
.c-code b {
  font-family: var(--ui-font-data);
  font-size: 26px;
  font-weight: 650;
  letter-spacing: 4px;
  font-variant-numeric: tabular-nums;
  color: var(--ui-accent);
}
/* 倒计时用等宽数字，避免每秒刷新时宽度跳动 */
.c-code .hint {
  font-variant-numeric: tabular-nums;
}
.c-code--expired {
  opacity: 0.75;
}
.c-code--expired b {
  color: var(--ui-text-subtle);
  text-decoration: line-through;
}
.c-code .c-expired-tip {
  color: var(--ui-danger);
}

.c-acts {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 6px;
}

.c-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.c-list li {
  font-size: 13px;
  color: var(--ui-text-muted);
  line-height: 1.75;
}
</style>
