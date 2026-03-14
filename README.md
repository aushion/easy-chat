# Easy Chat

一个面向局域网 / 内网环境的轻量网页版聊天工具。

当前技术栈：

- 前端：`Vue 3` + `TypeScript` + `Vite` + `Pinia` + `Vue Router`
- 后端：`Node.js` + `TypeScript` + `Fastify` + `WebSocket`
- 持久化：`SQLite`

## 环境要求

- `Node.js 22.15.x`
- `npm 8+`

说明：

- 项目根目录提供了 `.nvmrc`
- 如果你使用 `nvm`，进入项目后执行 `nvm use`
- 服务端会优先使用 `server/data.sqlite`
- 如果检测到旧的 `server/data.json` 且 SQLite 还是空库，会自动做一次数据迁移

## 测试账号

项目提供了 3 个默认测试账号。初始化脚本可重复执行，已存在的账号不会被覆盖。

- `alice / secret123`
- `bob / secret123`
- `charlie / secret123`

这些账号会被分配固定的内网测试 IP：

- `192.168.0.11`
- `192.168.0.12`
- `192.168.0.13`

这样既满足“同一 IP 只能注册一个用户”的规则，也方便本地联调。

## 启动方式

### 方式一：一键启动

在项目根目录执行：

```bash
npm run dev:all
```

这个脚本会按顺序执行：

1. 初始化测试账号
2. 启动后端开发服务
3. 启动前端开发服务

脚本行为补充：

- 如果 `3001` 已被占用，脚本会自动选择下一个可用后端端口
- 前端会自动把 `/api` 和 `/ws` 代理到该后端端口
- 如果 `5173` 已被占用，Vite 会自动切到 `5174` 或更高端口

启动后可访问：

- 本机：`http://localhost:5173`
- 局域网：`http://你的内网IP:5173`

### 方式二：分开启动

先初始化测试账号：

```bash
npm run init:test-users
```

再分别启动：

```bash
npm run dev:server
npm run dev:web
```

## 常用命令

```bash
# 初始化测试账号
npm run init:test-users

# 启动后端
npm run dev:server

# 启动前端
npm run dev:web

# 一键启动前后端
npm run dev:all

# 构建
npm run build
```

## 数据与文件位置

- SQLite 数据库：`/Users/aoshengchen/code/easy-chat/server/data.sqlite`
- 旧版 JSON 数据：`/Users/aoshengchen/code/easy-chat/server/data.json`
- 上传文件目录：`/Users/aoshengchen/code/easy-chat/server/src/storage/uploads`

## 当前已实现

- 注册 / 登录 / 退出
- 单账号单在线，新登录踢掉旧会话
- 默认大厅
- 群聊创建
- 私聊创建
- 文本消息发送
- 小文件上传 / 下载
- 在线用户列表
- 修改昵称

## 已知约束

- 头像上传接口已实现，但前端主界面还没有完整接入头像编辑
- 群权限目前较轻，只有群主拉人 / 移人
- 未实现已读、撤回、搜索、音视频
