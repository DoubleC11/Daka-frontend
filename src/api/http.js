import axios from 'axios'

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

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}

http.interceptors.request.use((cfg) => {
  const t = getToken()
  if (t) cfg.headers.Authorization = `Bearer ${t}`
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
