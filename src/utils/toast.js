import { reactive } from 'vue'

/**
 * 极简全局提示。
 * 用法：toast.ok('已保存') / toast.err(e.message)
 */
const state = reactive({ list: [] })
let seed = 0

function push(type, msg, ttl = 2400) {
  const id = ++seed
  state.list.push({ id, type, msg })
  setTimeout(() => {
    const i = state.list.findIndex((t) => t.id === id)
    if (i > -1) state.list.splice(i, 1)
  }, ttl)
}

export const toast = {
  state,
  ok: (m) => push('ok', m),
  err: (m) => push('err', m, 3200),
  info: (m) => push('info', m)
}
