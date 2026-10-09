import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import './styles/tokens.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 启动时用本地 token 恢复会话，避免刷新后掉登录
const auth = useAuthStore()
auth.restore().finally(() => {
  app.mount('#app')
})
