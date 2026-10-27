# Daka Frontend

打卡生活前端，一个用于记录日常习惯、心情、目标、待办和收支的 Vue 3 单页应用。项目同时提供情侣空间，支持账号绑定、共同日历以及查看伴侣空间。

## 功能

- 今日总览：集中查看当天打卡、待办、目标和收支概况
- 习惯打卡：创建习惯、每日打卡、查看日历和连续记录
- 心情日记：按日期记录心情与文字，支持月度回顾
- 目标进度：设定目标并维护当前进度
- 待办清单：创建、完成和整理日常任务
- 记账流水：记录收入与支出，按分类汇总
- 数据统计：通过 ECharts 展示趋势、分类和月度统计
- 情侣空间：使用邀请码绑定账号，共享日历并查看伴侣空间
- 登录鉴权：路由访问控制和统一的 API 鉴权处理
- 响应式界面：适配桌面端与移动端

## 技术栈

- [Vue 3](https://vuejs.org/)
- [Vite 8](https://vite.dev/)
- [Vue Router 5](https://router.vuejs.org/)
- [Pinia 4](https://pinia.vuejs.org/)
- [Axios](https://axios-http.com/)
- [ECharts 6](https://echarts.apache.org/)

## 环境要求

- Node.js 20.19+ 或 22.12+
- npm
- 打卡生活后端服务，默认地址为 `http://127.0.0.1:8080`

## 本地开发

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

默认访问地址为 `http://127.0.0.1:5173`。

开发环境会将 `/api` 请求代理到 `http://127.0.0.1:8080`。如果后端地址不同，请修改 `vite.config.js` 中的 `server.proxy` 配置。

## 构建与预览

生成生产构建：

```bash
npm run build
```

构建产物输出到 `dist/`。

本地预览构建结果：

```bash
npm run preview
```

部署时需要由 Web 服务器托管 `dist/`，并将 `/api` 反向代理到对应的后端服务。

## 项目结构

```text
.
├── src/
│   ├── api/          # Axios 请求层与业务 API
│   ├── components/   # 通用组件
│   ├── router/       # 路由与登录守卫
│   ├── stores/       # Pinia 状态
│   ├── styles/       # 全局设计变量与样式
│   ├── utils/        # 通用工具
│   └── views/        # 页面视图
├── index.html
├── vite.config.js
└── package.json
```

## 页面

| 路径 | 页面 |
| --- | --- |
| `/login` | 登录与注册 |
| `/` | 今日总览 |
| `/habits` | 习惯打卡 |
| `/diary` | 心情日记 |
| `/goals` | 目标进度 |
| `/todos` | 待办清单 |
| `/bills` | 记账流水 |
| `/stats` | 数据统计 |
| `/couple` | 情侣空间 |

项目使用 Hash 路由，生产环境无需额外配置前端路由回退规则。

## 接口约定

前端统一通过 `/api` 访问后端。接口响应格式如下：

```json
{
  "code": 0,
  "msg": "ok",
  "data": {}
}
```

`code` 为 `0` 时表示请求成功，业务数据位于 `data` 字段。登录凭证通过 `Authorization: Bearer <token>` 请求头传递。

