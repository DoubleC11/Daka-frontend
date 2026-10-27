import axios from 'axios'
import { getViewUserId } from '../utils/viewUser'

/**
 * 统一请求层。
 * 后端固定返回 { code, msg, data }，code===0 为成功。
 * 这里把 data 直接抛给调用方，非 0 抛 Error，页面只需 try/catch。
 */
const http = axios.create({
  baseURL: '/api',
  timeout: 15000
})

const TOKEN_KEY = 'daka_token'

/**
 * 登录态按「标签页」隔离，避免同浏览器两个窗口互相顶号：
 * - sessionStorage：本标签页自己的 token。两个窗口可以分别登录不同账号（A 看 A 的数据，B 看 B 的）；
 * - localStorage：作为“默认账号”兜底，新开标签页可以继承上次登录，不用每次都重登。
 * 顺序：先读本标签页，没有再回落到 localStorage 并接管。
 */
export function getToken() {
  const own = sessionStorage.getItem(TOKEN_KEY)
  if (own) return own
  const fallback = localStorage.getItem(TOKEN_KEY)
  if (fallback) {
    sessionStorage.setItem(TOKEN_KEY, fallback)
    return fallback
  }
  return ''
}

export function setToken(t) {
  if (t) {
    // 本标签页生效，同时更新“默认账号”（不影响其它标签页已加载的 sessionStorage）
    sessionStorage.setItem(TOKEN_KEY, t)
    localStorage.setItem(TOKEN_KEY, t)
  } else {
    sessionStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_KEY)
  }
}

http.interceptors.request.use((cfg) => {
  const t = getToken()
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  // 情侣空间：查看对方数据时，GET 请求统一带上 viewUserId（后端校验绑定关系）
  const view = getViewUserId()
  const method = String(cfg.method || 'get').toLowerCase()
  if (view && method === 'get') {
    cfg.params = { ...(cfg.params || {}), viewUserId: view }
  }
  // 只读模式：正在查看 TA 的空间时拦截所有写请求（绑定/登录接口除外）
  const exempt = ['/auth/', '/couple']
  if (view && method !== 'get' && !exempt.some((p) => String(cfg.url || '').startsWith(p))) {
    const err = new Error('正在查看 TA 的空间（只读），请先回到我的空间再记录')
    err.code = 403
    err.readonly = true
    return Promise.reject(err)
  }
  return cfg
})

http.interceptors.response.use(
  (res) => {
    const body = res.data
    // 非标准响应（理论上不会出现）直接返回
    if (!body || typeof body.code === 'undefined') return body
    if (body.code === 0) return body.data
    const err = new Error(body.msg || '请求失败')
    err.code = body.code
    return Promise.reject(err)
  },
  (err) => {
    const status = err.response?.status
    if (status === 401) {
      setToken('')
      // 交给路由守卫处理，这里只抛出可识别错误
      const e = new Error('登录已过期，请重新登录')
      e.code = 401
      e.unauthorized = true
      return Promise.reject(e)
    }
    const msg = err.response?.data?.msg || err.message || '网络异常'
    const e = new Error(msg)
    e.code = status || -1
    return Promise.reject(e)
  }
)

export default http
