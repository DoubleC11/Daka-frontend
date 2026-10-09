<script setup>
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '460px' }
})
const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}
function onKey(e) {
  if (e.key === 'Escape') close()
}

/* v2：Esc 关闭 */
watch(
  () => props.modelValue,
  (v) => {
    if (v) document.addEventListener('keydown', onKey)
    else document.removeEventListener('keydown', onKey)
  }
)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="mask" @click.self="close">
        <div class="dialog" :style="{ width }">
          <header class="dialog__head">
            <h3>{{ title }}</h3>
            <button class="dialog__x" @click="close" aria-label="关闭">
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
  background: var(--mask-c);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
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
  background: var(--card-solid);
  border-radius: 22px;
  box-shadow: 0 30px 70px -24px rgba(17, 24, 39, 0.5);
  overflow: hidden;
}
.dialog__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
}
.dialog__head h3 {
  font-size: 14.5px;
  font-weight: 600;
}
.dialog__x {
  border: none;
  background: transparent;
  color: var(--t3);
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.dialog__x:hover {
  background: var(--card-soft);
  color: var(--t1);
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
  border-top: 0.5px solid var(--line-c);
  background: var(--panel-c);
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-active .dialog, .modal-leave-active .dialog { transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .dialog, .modal-leave-to .dialog { transform: translateY(14px) scale(0.97); }
</style>
