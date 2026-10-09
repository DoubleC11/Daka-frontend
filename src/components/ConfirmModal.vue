<script setup>
import { watch, ref, nextTick } from 'vue'

/**
 * v2 主题化二次确认弹窗（替换原生 confirm）
 * 用法：<ConfirmModal v-model="del.show" :text="del.text" confirm-text="删除" @confirm="doDelete" />
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '确认操作' },
  text: { type: String, default: '' },
  emoji: { type: String, default: '🗑️' },
  confirmText: { type: String, default: '删除' },
  cancelText: { type: String, default: '取消' },
  danger: { type: Boolean, default: true }
})
const emit = defineEmits(['update:modelValue', 'confirm'])

const confirmBtn = ref(null)

function close() {
  emit('update:modelValue', false)
}
function ok() {
  emit('confirm')
  close()
}
function onKey(e) {
  if (e.key === 'Escape') close()
}

watch(
  () => props.modelValue,
  async (v) => {
    if (v) {
      document.addEventListener('keydown', onKey)
      await nextTick()
      confirmBtn.value?.focus()
    } else {
      document.removeEventListener('keydown', onKey)
    }
  }
)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="cmask" @click.self="close">
        <div class="cdialog" role="alertdialog" :aria-label="title">
          <span class="cdialog__emoji">{{ emoji }}</span>
          <h3 class="cdialog__title">{{ title }}</h3>
          <p v-if="text" class="cdialog__text">{{ text }}</p>
          <div class="cdialog__acts">
            <button class="btn btn--ghost" @click="close">{{ cancelText }}</button>
            <button ref="confirmBtn" class="btn" :class="danger ? 'cdialog__ok' : ''" @click="ok">
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
  background: var(--mask-c);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.cdialog {
  width: 340px;
  max-width: 92vw;
  background: var(--card-solid);
  border-radius: 22px;
  box-shadow: 0 30px 70px -24px rgba(17, 24, 39, 0.5);
  padding: 24px 22px 20px;
  text-align: center;
}
.cdialog__emoji {
  font-size: 38px;
  line-height: 1;
  display: block;
  margin-bottom: 12px;
}
.cdialog__title {
  font-size: 15px;
  font-weight: 600;
}
.cdialog__text {
  font-size: 13px;
  color: var(--t2);
  margin-top: 6px;
  line-height: 1.7;
  word-break: break-all;
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
  background: linear-gradient(135deg, #F87171, #DC2626);
  box-shadow: 0 10px 22px -10px rgba(220, 38, 38, 0.7);
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-active .cdialog, .modal-leave-active .cdialog { transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .cdialog, .modal-leave-to .cdialog { transform: translateY(14px) scale(0.96); }
</style>
