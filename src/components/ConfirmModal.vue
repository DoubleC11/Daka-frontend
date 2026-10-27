<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

/**
 * v2 主题化二次确认弹窗（替换原生 confirm）
 * 用法：<ConfirmModal v-model="del.show" :text="del.text" confirm-text="删除" @confirm="doDelete" />
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '确认操作' },
  text: { type: String, default: '' },
  confirmText: { type: String, default: '删除' },
  cancelText: { type: String, default: '取消' },
  danger: { type: Boolean, default: true }
})
const emit = defineEmits(['update:modelValue', 'confirm'])

const confirmBtn = ref(null)
const cancelBtn = ref(null)
const dialog = ref(null)
let previousFocus = null

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

function close() {
  emit('update:modelValue', false)
}
function ok() {
  emit('confirm')
  close()
}

function focusableItems() {
  if (!dialog.value) return []
  return [...dialog.value.querySelectorAll(FOCUSABLE)].filter(
    (el) => !el.hasAttribute('hidden') && el.getClientRects().length
  )
}

function isTopDialog() {
  const dialogs = [...document.querySelectorAll('[aria-modal="true"]')]
  return !!dialog.value && dialogs.at(-1) === dialog.value
}

function onKey(e) {
  if (!isTopDialog()) return
  if (e.key === 'Escape') {
    close()
    return
  }
  if (e.key !== 'Tab') return
  const items = focusableItems()
  if (!items.length) {
    e.preventDefault()
    dialog.value?.focus()
    return
  }
  const first = items[0]
  const last = items.at(-1)
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(
  () => props.modelValue,
  async (v) => {
    if (v) {
      previousFocus = document.activeElement
      document.addEventListener('keydown', onKey)
      await nextTick()
      ;(cancelBtn.value || dialog.value)?.focus()
    } else {
      document.removeEventListener('keydown', onKey)
      previousFocus?.focus?.()
      previousFocus = null
    }
  }
)
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  previousFocus?.focus?.()
  previousFocus = null
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="cmask" @click.self="close">
        <div ref="dialog" class="cdialog" role="alertdialog" aria-modal="true" tabindex="-1"
          :aria-label="title">
          <span class="cdialog__icon" :class="{ 'cdialog__icon--danger': danger }" aria-hidden="true">
            <svg v-if="danger" viewBox="0 0 24 24" width="22" height="22" fill="none"
              stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 8v5M12 17h.01M10.3 4.6 2.9 17.4A1.8 1.8 0 0 0 4.5 20h15a1.8 1.8 0 0 0 1.6-2.6L13.7 4.6a2 2 0 0 0-3.4 0Z" />
            </svg>
            <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12.5 9.5 17 19 7" />
            </svg>
          </span>
          <h2 class="cdialog__title">{{ title }}</h2>
          <p v-if="text" class="cdialog__text">{{ text }}</p>
          <div class="cdialog__acts">
            <button ref="cancelBtn" class="btn btn--ghost" type="button" @click="close">{{ cancelText }}</button>
            <button ref="confirmBtn" class="btn" type="button" :class="danger ? 'cdialog__ok' : ''" @click="ok">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cmask {
  position: fixed;
  inset: 0;
  z-index: 180;
  background: var(--ui-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.cdialog {
  width: 340px;
  max-width: 92vw;
  border: 1px solid var(--ui-line);
  background: var(--ui-surface);
  border-radius: var(--ui-radius-lg);
  box-shadow: 0 20px 48px -28px rgba(15, 23, 42, 0.42);
  padding: 24px 22px 20px;
  text-align: center;
}
.cdialog__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: 12px;
  border-radius: var(--ui-radius);
  background: var(--ui-accent-soft);
  color: var(--ui-accent);
}
.cdialog__icon--danger {
  background: var(--ui-signal-coral-soft);
  color: var(--ui-danger);
}
.cdialog__title {
  font-size: 15px;
  font-weight: 650;
}
.cdialog__text {
  font-size: 13px;
  color: var(--ui-text-muted);
  margin-top: 6px;
  line-height: 1.7;
  word-break: break-word;
}
.cdialog__acts {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}
.cdialog__acts .btn {
  flex: 1;
}
.cdialog__ok {
  border-color: var(--ui-danger);
  background: var(--ui-danger);
  color: #FFFFFF;
  box-shadow: none;
}

.modal-enter-active, .modal-leave-active { transition: opacity var(--ui-duration-base) var(--ui-ease-out); }
.modal-enter-active .cdialog, .modal-leave-active .cdialog { transition: transform var(--ui-duration-base) var(--ui-ease-out); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .cdialog, .modal-leave-to .cdialog { transform: translateY(10px) scale(0.98); }

@media (prefers-reduced-motion: reduce) {
  .modal-enter-active .cdialog,
  .modal-leave-active .cdialog {
    transition: none;
  }
  .modal-enter-from .cdialog,
  .modal-leave-to .cdialog {
    transform: none;
  }
}
</style>
