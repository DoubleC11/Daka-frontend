<script setup>
import { toast } from '../utils/toast'

/** v2：色点 → emoji 前缀 */
const EMOJI = { ok: '✅', err: '⚠️', info: '💡' }
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toast.state.list" :key="t.id" class="toast" :class="`toast--${t.type}`">
        <span class="toast__emoji">{{ EMOJI[t.type] || '💡' }}</span>
        <span class="toast__msg">{{ t.msg }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 999px;
  font-size: 12.5px;
  background: var(--card-solid);
  backdrop-filter: blur(14px);
  box-shadow: 0 14px 32px -14px rgba(31, 41, 55, 0.4);
  border: 0.5px solid var(--line-c);
  max-width: min(78vw, 420px);
}
.toast__emoji {
  font-size: 14px;
  line-height: 1;
  flex: 0 0 auto;
}
.toast__msg { color: var(--t1); }

.toast-enter-active, .toast-leave-active { transition: all 0.22s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-8px) scale(0.96); }
</style>
