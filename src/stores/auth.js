import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '../api'
import { setToken, getToken } from '../api/http'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const ready = ref(false)

  async function login(form) {
    const data = await authApi.login(form)
    setToken(data.token)
    user.value = data.user
    return data.user
  }

  async function register(form) {
    await authApi.register(form)
    return login({ username: form.username, password: form.password })
  }

  /** 应用启动时用已存 token 换回用户信息 */
  async function restore() {
    if (!getToken()) {
      ready.value = true
      return false
    }
    try {
      user.value = await authApi.me()
      return true
    } catch {
      setToken('')
      user.value = null
      return false
    } finally {
      ready.value = true
    }
  }

  function logout() {
    setToken('')
    user.value = null
  }

  return { user, ready, login, register, restore, logout }
})
