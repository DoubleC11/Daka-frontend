import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    // 不清空输出目录：避免构建工具批量删除文件时被系统的安全删除守卫拦截。
    // 旧 hash 资源会残留，index.html 始终指向最新产物，不影响使用。
    emptyOutDir: false,
    chunkSizeWarningLimit: 1200
  }
})
