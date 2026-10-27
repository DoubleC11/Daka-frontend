import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { coupleApi } from '../api'
import { setViewUserId } from '../utils/viewUser'

/**
 * 情侣空间状态。
 * info 为 null 表示未绑定；viewUserId 非空表示正在查看对方空间（只读）。
 */
export const useCoupleStore = defineStore('couple', () => {
  const info = ref(null)
  const invite = ref(null)
  /** 拿到邀请码响应的本地时刻，用于 expireAt 缺失时兜底算倒计时 */
  const inviteAt = ref(0)
  const viewUserId = ref(null)
  const loading = ref(false)

  const bound = computed(() => !!info.value)
  const viewing = computed(() => !!viewUserId.value)
  const partner = computed(() => info.value?.partner || null)

  async function load() {
    loading.value = true
    try {
      info.value = (await coupleApi.info()) || null
    } catch {
      info.value = null
    } finally {
      loading.value = false
    }
  }

  /** 拉取当前有效邀请码（不生成新码），页面刷新后仍能看到自己没被使用的码 */
  async function loadInvite() {
    try {
      invite.value = (await coupleApi.currentInvite()) || null
    } catch {
      invite.value = null
    }
    inviteAt.value = Date.now()
    return invite.value
  }

  /** refresh=true 表示重新生成：旧码立即失效 */
  async function createInvite(refresh = false) {
    invite.value = await coupleApi.invite(refresh)
    inviteAt.value = Date.now()
    return invite.value
  }

  async function bind(code) {
    info.value = (await coupleApi.bind(code)) || null
    invite.value = null
    return info.value
  }

  async function unbind() {
    await coupleApi.unbind()
    reset()
  }

  function enterView() {
    const id = info.value?.partner?.id
    if (!id) return false
    viewUserId.value = id
    setViewUserId(id)
    return true
  }

  function exitView() {
    viewUserId.value = null
    setViewUserId(null)
  }

  function toggleView() {
    return viewing.value ? (exitView(), false) : enterView()
  }

  function reset() {
    info.value = null
    invite.value = null
    inviteAt.value = 0
    exitView()
  }

  return {
    info, invite, inviteAt, viewUserId, loading,
    bound, viewing, partner,
    load, loadInvite, createInvite, bind, unbind, enterView, exitView, toggleView, reset
  }
})
