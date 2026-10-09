import { createRouter, createWebHashHistory } from 'vue-router'
import { getToken } from '../api/http'

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { public: true } },
  { path: '/', name: 'home', component: () => import('../views/Home.vue'), meta: { title: '今日', nav: 'home' } },
  { path: '/habits', name: 'habits', component: () => import('../views/Habits.vue'), meta: { title: '习惯打卡', nav: 'habits' } },
  { path: '/diary', name: 'diary', component: () => import('../views/Diary.vue'), meta: { title: '心情日记', nav: 'diary' } },
  { path: '/goals', name: 'goals', component: () => import('../views/Goals.vue'), meta: { title: '目标进度', nav: 'goals' } },
  { path: '/todos', name: 'todos', component: () => import('../views/Todos.vue'), meta: { title: '待办清单', nav: 'todos' } },
  { path: '/bills', name: 'bills', component: () => import('../views/Bills.vue'), meta: { title: '记账流水', nav: 'bills' } },
  { path: '/stats', name: 'stats', component: () => import('../views/Stats.vue'), meta: { title: '数据统计', nav: 'stats' } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach((to) => {
  if (to.meta.public) return true
  if (!getToken()) return { name: 'login', query: { redirect: to.fullPath } }
  return true
})

export default router
