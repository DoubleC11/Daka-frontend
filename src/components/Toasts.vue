<script setup>
import { toast } from '../utils/toast'
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toast.state.list" :key="t.id" class="toast" :class="`toast--${t.type}`">
        <span class="toast__icon" aria-hidden="true">
          <svg v-if="t.type === 'ok'" viewBox="0 0 24 24" width="16" height="16" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12.5 9.5 17 19 7" />
          </svg>
          <svg v-else-if="t.type === 'err'" viewBox="0 0 24 24" width="16" height="16" fill="none"
            stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 8v5M12 17h.01M10.3 4.6 2.9 17.4A1.8 1.8 0 0 0 4.5 20h15a1.8 1.8 0 0 0 1.6-2.6L13.7 4.6a2 2 0 0 0-3.4 0Z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none"
            stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 11v5M12 8h.01" />
          </svg>
        </span>
        <span class="toast__msg">{{ t.msg }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  top: calc(18px + env(safe-area-inset-top, 0px));
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
  border: 1px solid var(--ui-line);
  border-radius: var(--ui-radius);
  font-size: 12.5px;
  background: var(--ui-surface);
  box-shadow: 0 12px 28px -22px rgba(15, 23, 42, 0.5);
  max-width: min(78vw, 420px);
}
.toast__icon {
  display: inline-flex;
  flex: 0 0 auto;
  color: var(--ui-accent);
}
.toast--ok .toast__icon {
  color: var(--ui-success);
}
.toast--err .toast__icon {
  color: var(--ui-danger);
}
.toast__msg { color: var(--ui-text); }

.toast-enter-active, .toast-leave-active {
  transition: opacity var(--ui-duration-base) var(--ui-ease-out),
    transform var(--ui-duration-base) var(--ui-ease-out);
}
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-8px) scale(0.96); }

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: opacity 120ms linear;
  }
  .toast-enter-from,
  .toast-leave-to {
    transform: none;
  }
}
</style>
