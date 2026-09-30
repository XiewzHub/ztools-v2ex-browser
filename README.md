# V2EX 帖子浏览

一个基于 Vue 3 + Vite 开发的 ZTools 插件，用于免 Token 查看 V2EX 的热门和最新帖子。

## 功能

- 查看 V2EX 最热和最新帖子。
- 在当前列表中按标题、节点或作者过滤。
- 阅读帖子正文和回复。
- 在系统浏览器打开 V2EX 原帖。
- 在网络异常、超时或 V2EX 服务不可用时显示可重试提示，并保留已加载内容。

## ZTools 指令

| 指令 | 初始列表 |
| --- | --- |
| `v2ex` | 最热 |
| `V2EX 热门` | 最热 |
| `V2EX 最新` | 最新 |

## 开发

本机需要 Node.js 18 或更高版本。当前机器可通过 NVM 使用最新 Node：

```bash
nvm exec 26 npm install
nvm exec 26 npm run dev
```

开发服务默认运行在 `http://localhost:5173`，ZTools 会根据 `src-ztools/plugin.json` 的 `development.main` 地址加载开发版本。

## 验证与构建

```bash
nvm exec 26 npm test
nvm exec 26 npm run build
```

构建产物输出至 `src-ztools/dist/`，与 `src-ztools/plugin.json`、`src-ztools/preload/` 和图标共同组成可发布的 ZTools 插件目录。

## 使用的公开接口

- `https://www.v2ex.com/api/topics/hot.json`
- `https://www.v2ex.com/api/topics/latest.json`
- `https://www.v2ex.com/api/topics/show.json?id=<帖子ID>`
- `https://www.v2ex.com/api/replies/show.json?topic_id=<帖子ID>`

这些接口不需要 Token。插件不收集、不保存 V2EX 账号或访问凭据。

请求由 ZTools Preload 中的 Node HTTPS 代理 Agent 发起：它读取 macOS 系统 HTTPS 代理设置，通过该代理访问 V2EX，因此不受浏览器跨域限制，也不依赖 ZTools 是否自动继承系统代理。
