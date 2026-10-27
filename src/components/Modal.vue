<script setup>
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '460px' }
})
const emit = defineEmits(['update:modelValue'])
const titleId = useId()
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
  async (open) => {
    if (open) {
      previousFocus = document.activeElement
      document.addEventListener('keydown', onKey)
      await nextTick()
      ;(focusableItems()[0] || dialog.value)?.focus()
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
      <div v-if="modelValue" class="mask" @click.self="close">
        <div ref="dialog" class="dialog" :style="{ width }" role="dialog" aria-modal="true" tabindex="-1"
          :aria-labelledby="title ? titleId : undefined">
          <header class="dialog__head">
            <h2 :id="titleId">{{ title }}</h2>
            <button class="dialog__x" type="button" @click="close" aria-label="关闭">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </header>
          <div class="dialog__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="dialog__foot">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
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
.dialog {
  max-width: 94vw;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ui-line);
  background: var(--ui-surface);
  border-radius: var(--ui-radius-lg);
  box-shadow: 0 20px 48px -28px rgba(15, 23, 42, 0.42);
  overflow: hidden;
}
.dialog__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
}
.dialog__head h2 {
  font-size: 15px;
  font-weight: 650;
}
.dialog__x {
  border: none;
  background: transparent;
  color: var(--ui-text-subtle);
  width: 32px;
  height: 32px;
  border-radius: var(--ui-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--ui-duration-fast) var(--ui-ease-out),
    background-color var(--ui-duration-fast) var(--ui-ease-out);
}
.dialog__body {
  padding: 4px 20px 18px;
  overflow-y: auto;
}
.dialog__foot {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--ui-line);
  background: var(--ui-surface-2);
}

.modal-enter-active, .modal-leave-active { transition: opacity var(--ui-duration-base) var(--ui-ease-out); }
.modal-enter-active .dialog, .modal-leave-active .dialog { transition: transform var(--ui-duration-base) var(--ui-ease-out); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .dialog, .modal-leave-to .dialog { transform: translateY(10px) scale(0.98); }

@media (hover: hover) and (pointer: fine) {
  .dialog__x:hover {
    background: var(--ui-surface-2);
    color: var(--ui-text);
  }
}

@media (prefers-reduced-motion: reduce) {
  .modal-enter-active .dialog,
  .modal-leave-active .dialog {
    transition: none;
  }
  .modal-enter-from .dialog,
  .modal-leave-to .dialog {
    transform: none;
  }
}
</style>
