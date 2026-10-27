/**
 * 情侣空间：正在查看的用户 id。
 * 放在模块级而非 Pinia 里，避免 http.js 与 store 循环依赖。
 * 仅对 GET 生效（见 api/http.js），写操作永远作用于登录用户本人。
 */
let current = null

export function getViewUserId() {
  return current
}

export function setViewUserId(id) {
  current = id ? Number(id) : null
}
