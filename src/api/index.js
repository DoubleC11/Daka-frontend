import http from './http'

/* ---------------- 认证 ---------------- */
export const authApi = {
  register: (d) => http.post('/auth/register', d),
  login: (d) => http.post('/auth/login', d),
  me: () => http.get('/auth/me')
}

/* ---------------- 习惯打卡 ---------------- */
export const habitApi = {
  list: () => http.get('/habits'),
  create: (d) => http.post('/habits', d),
  update: (id, d) => http.put(`/habits/${id}`, d),
  remove: (id) => http.delete(`/habits/${id}`),
  check: (id, d) => http.post(`/habits/${id}/check`, d),
  calendar: (month) => http.get('/habits/calendar', { params: { month } }),
  stats: () => http.get('/habits/stats')
}

/* ---------------- 日记 ---------------- */
export const diaryApi = {
  list: (params) => http.get('/diaries', { params }),
  create: (d) => http.post('/diaries', d),
  update: (id, d) => http.put(`/diaries/${id}`, d),
  remove: (id) => http.delete(`/diaries/${id}`),
  stats: (month) => http.get('/diaries/stats', { params: { month } }),
  moods: () => http.get('/diaries/moods')
}

/* ---------------- 目标 ---------------- */
export const goalApi = {
  list: () => http.get('/goals'),
  create: (d) => http.post('/goals', d),
  update: (id, d) => http.put(`/goals/${id}`, d),
  remove: (id) => http.delete(`/goals/${id}`)
}

/* ---------------- 待办 ---------------- */
export const todoApi = {
  list: (scope) => http.get('/todos', { params: { scope } }),
  create: (d) => http.post('/todos', d),
  update: (id, d) => http.put(`/todos/${id}`, d),
  toggle: (id) => http.put(`/todos/${id}/toggle`),
  remove: (id) => http.delete(`/todos/${id}`)
}

/* ---------------- 分类 ---------------- */
export const categoryApi = {
  list: (type) => http.get('/categories', { params: { type } }),
  create: (d) => http.post('/categories', d),
  remove: (id) => http.delete(`/categories/${id}`)
}

/* ---------------- 记账 ---------------- */
export const billApi = {
  list: (params) => http.get('/bills', { params }),
  create: (d) => http.post('/bills', d),
  update: (id, d) => http.put(`/bills/${id}`, d),
  remove: (id) => http.delete(`/bills/${id}`),
  summary: (month) => http.get('/bills/summary', { params: { month } }),
  byCategory: (params) => http.get('/bills/by-category', { params })
}

/* ---------------- 统计 ---------------- */
export const statsApi = {
  overview: () => http.get('/stats/overview'),
  trend: (days = 14) => http.get('/stats/trend', { params: { days } }),
  monthlyBills: (months = 6) => http.get('/stats/monthly-bills', { params: { months } }),
  bills: (month) => http.get('/stats/bills', { params: { month } }),
  billTrend: (days = 30) => http.get('/stats/bill-trend', { params: { days } })
}

/* ---------------- 情侣空间 ---------------- */
export const coupleApi = {
  info: () => http.get('/couple'),
  // 当前有效邀请码（不生成）；带时间戳避免浏览器缓存导致读到别的账号的旧响应
  currentInvite: () => http.get('/couple/invite', { params: { _t: Date.now() } }),
  // refresh=true 时作废旧码并生成新码（“重新生成”按钮）
  invite: (refresh = false) => http.post('/couple/invite', null, { params: { refresh } }),
  bind: (code) => http.post('/couple/bind', { code }),
  unbind: () => http.delete('/couple'),
  // 共同日历（右侧栏）：一个月一批，双方读写同一份
  calendar: (month) => http.get('/couple/calendar', { params: { month, _t: Date.now() } }),
  // content 为空字符串 = 清空这一天
  saveCalendarDay: (d) => http.put('/couple/calendar', d),
  removeCalendarDay: (date) => http.delete('/couple/calendar', { params: { date } })
}

/* ---------------- 数据导出（CSV 下载） ---------------- */
export async function exportCsv(path, fallbackName) {
  const { getToken } = await import('./http')
  const res = await fetch('/api' + path, { headers: { Authorization: 'Bearer ' + getToken() } })
  if (!res.ok) {
    throw new Error('导出失败（HTTP ' + res.status + '）')
  }
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('csv')) {
    // 后端出错时返回 JSON，解析出具体原因
    let msg = '导出失败'
    try { msg = (await res.json()).msg || msg } catch { /* ignore */ }
    throw new Error(msg)
  }
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = fallbackName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}
