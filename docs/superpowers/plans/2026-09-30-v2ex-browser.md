# V2EX 帖子浏览插件实施计划

> **执行方式：** 必须使用 `subagent-driven-development`（推荐）或 `executing-plans` Skill 逐任务执行。步骤使用复选框（`- [ ]`）语法追踪。

**目标：** 在 ZTools 的 Vue 插件骨架中实现免 Token 的 V2EX 热门、最新、详情和回复浏览器。

**架构：** 将 V2EX API、数据标准化、关键词过滤和时间格式化封装在独立的 `src/v2ex/` 模块中。`V2exBrowser` 组件协调列表与详情状态，根组件只负责将 ZTools 的插件进入事件转交给该组件。页面通过浏览器原生 `fetch` 调用公开接口，不依赖 Preload 或额外第三方库。

**技术栈：** Vue 3、TypeScript、Vite、Vue TSC、Node 内置测试运行器。

## 全局约束

- 仅调用无需 Token 的 V2EX 公开 API，不保存任何账号信息。
- 仅保留一个 `v2ex` ZTools 功能入口，支持 `v2ex`、`V2EX 热门`、`V2EX 最新` 指令。
- 搜索只过滤当前已加载的列表，不提供服务端搜索。
- 详情与回复的加载、空态和错误状态必须彼此独立。
- 刷新失败时保留上次成功显示的列表、详情或回复。
- 构建产物必须输出到 `src-ztools/dist/`。
- 当前目录未初始化 Git；不得初始化 Git 或执行提交。

---

## 文件结构

- `src/v2ex/types.ts`：V2EX API 与 UI 领域类型。
- `src/v2ex/client.ts`：公开 API 请求、HTTP 错误转换、详情与回复并发查询。
- `src/v2ex/presentation.ts`：进入指令解析、帖子过滤与相对时间格式化。
- `src/v2ex/presentation.test.ts`：纯展示逻辑自动化测试。
- `src/v2ex/client.test.ts`：请求层自动化测试。
- `src/V2exBrowser/index.vue`：帖子列表与详情 UI 和异步状态协调。
- `src/App.vue`：将原有多个演示功能替换为 V2EX 功能入口。
- `src/main.css`：全局主题变量与基础样式。
- `src-ztools/plugin.json`：单一 V2EX 插件功能配置。
- `package.json`：增加 `test` 脚本，保持现有构建脚本。
- `README.md`：更新为实际功能、开发和构建说明。

### 任务 1：建立可测试的 V2EX 领域模型与展示逻辑

**文件：**
- 创建：`src/v2ex/types.ts`
- 创建：`src/v2ex/presentation.ts`
- 创建：`src/v2ex/presentation.test.ts`
- 修改：`package.json`

**接口：**
- 产出：`FeedKind = 'hot' | 'latest'`、`TopicSummary`、`getInitialFeed(command?: string): FeedKind`、`filterTopics(topics: TopicSummary[], keyword: string): TopicSummary[]`、`formatRelativeTime(epochSeconds: number, now?: number): string`。

- [ ] **步骤 1：编写失败的测试**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { filterTopics, formatRelativeTime, getInitialFeed } from './presentation'

test('最新指令进入时加载最新列表', () => {
  assert.equal(getInitialFeed('V2EX 最新'), 'latest')
  assert.equal(getInitialFeed('v2ex'), 'hot')
})

test('按标题、节点和作者过滤帖子', () => {
  const topics = [{ title: 'Vue 使用心得', node: { name: 'javascript' }, member: { username: 'alice' } }]
  assert.equal(filterTopics(topics, 'alice').length, 1)
  assert.equal(filterTopics(topics, 'javascript').length, 1)
  assert.equal(filterTopics(topics, 'react').length, 0)
})

test('将 Unix 秒级时间格式化为相对时间', () => {
  assert.equal(formatRelativeTime(970, 1_000), '刚刚')
  assert.equal(formatRelativeTime(880, 1_000), '2 分钟前')
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- src/v2ex/presentation.test.ts`

预期：FAIL，提示无法找到 `./presentation` 模块。

- [ ] **步骤 3：编写最小实现**

```ts
export function getInitialFeed(command = ''): FeedKind {
  return command.includes('最新') ? 'latest' : 'hot'
}

export function filterTopics(topics: TopicSummary[], keyword: string): TopicSummary[] {
  const query = keyword.trim().toLocaleLowerCase()
  if (!query) return topics
  return topics.filter((topic) => [topic.title, topic.node.name, topic.member.username]
    .some((value) => value.toLocaleLowerCase().includes(query)))
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test -- src/v2ex/presentation.test.ts`

预期：PASS。

### 任务 2：实现 API 客户端与失败隔离

**文件：**
- 创建：`src/v2ex/client.ts`
- 创建：`src/v2ex/client.test.ts`

**接口：**
- 消费：`FeedKind`、`TopicSummary`。
- 产出：`fetchTopics(kind: FeedKind, request?: typeof fetch): Promise<TopicSummary[]>`、`fetchTopicBundle(topicId: number, request?: typeof fetch): Promise<{ topic: TopicDetail; replies: TopicReply[] }>`。

- [ ] **步骤 1：编写失败的测试**

```ts
test('热门列表请求正确的公开地址', async () => {
  const request = async (url: string) => new Response(JSON.stringify([]), { status: 200 })
  await fetchTopics('hot', request as typeof fetch)
  assert.equal(calledUrl, 'https://www.v2ex.com/api/topics/hot.json')
})

test('非成功 HTTP 状态转换为中文错误', async () => {
  const request = async () => new Response('', { status: 503 })
  await assert.rejects(fetchTopics('latest', request as typeof fetch), /暂时不可用/)
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- src/v2ex/client.test.ts`

预期：FAIL，提示无法找到 `./client` 模块。

- [ ] **步骤 3：编写最小实现**

```ts
const API_BASE = 'https://www.v2ex.com/api'

export async function fetchTopics(kind: FeedKind, request = fetch) {
  const response = await request(`${API_BASE}/topics/${kind}.json`)
  if (!response.ok) throw new Error('V2EX 服务暂时不可用，请稍后重试。')
  return response.json() as Promise<TopicSummary[]>
}

export async function fetchTopicBundle(topicId: number, request = fetch) {
  const [topic, replies] = await Promise.all([
    requestJson<TopicDetail[]>(`${API_BASE}/topics/show.json?id=${topicId}`, request),
    requestJson<TopicReply[]>(`${API_BASE}/replies/show.json?topic_id=${topicId}`, request)
  ])
  return { topic: topic[0], replies }
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test -- src/v2ex/client.test.ts`

预期：PASS。

### 任务 3：构建 V2EX 列表与详情用户界面

**文件：**
- 创建：`src/V2exBrowser/index.vue`
- 修改：`src/main.css`

**接口：**
- 消费：`getInitialFeed`、`filterTopics`、`formatRelativeTime`、`fetchTopics`、`fetchTopicBundle`。
- 产出：`V2exBrowser` 组件，属性 `enterAction: Record<string, unknown>`。

- [ ] **步骤 1：编写失败的组件检查**

```ts
test('组件包含热门、最新、刷新和详情操作', () => {
  const source = readFileSync('src/V2exBrowser/index.vue', 'utf8')
  for (const label of ['热门', '最新', '刷新', '返回列表', '在浏览器打开']) {
    assert.match(source, new RegExp(label))
  }
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- src/V2exBrowser/v2ex-browser.test.ts`

预期：FAIL，提示组件文件不存在。

- [ ] **步骤 3：编写最小实现**

```vue
<template>
  <main class="v2ex-browser">
    <section v-if="view === 'list'">
      <header>
        <button @click="changeFeed('hot')">热门</button>
        <button @click="changeFeed('latest')">最新</button>
        <input v-model="keyword" placeholder="搜索标题、节点或作者" />
        <button @click="loadFeed">刷新</button>
      </header>
      <button v-for="topic in visibleTopics" :key="topic.id" @click="openTopic(topic.id)">
        {{ topic.title }}
      </button>
    </section>
    <section v-else>
      <button @click="view = 'list'">返回列表</button>
      <button @click="openInBrowser">在浏览器打开</button>
    </section>
  </main>
</template>
```

- [ ] **步骤 4：运行组件检查与类型检查**

运行：`npm test -- src/V2exBrowser/v2ex-browser.test.ts && npx vue-tsc --noEmit`

预期：PASS。

### 任务 4：接入 ZTools、更新文档并进行构建验证

**文件：**
- 修改：`src/App.vue`
- 修改：`src-ztools/plugin.json`
- 修改：`README.md`

**接口：**
- 消费：`V2exBrowser`。
- 产出：单一 `v2ex` ZTools 功能入口。

- [ ] **步骤 1：编写失败的配置检查**

```ts
test('ZTools 配置只注册 V2EX 功能和三条命令', () => {
  const plugin = JSON.parse(readFileSync('src-ztools/plugin.json', 'utf8'))
  assert.equal(plugin.features.length, 1)
  assert.equal(plugin.features[0].code, 'v2ex')
  assert.deepEqual(plugin.features[0].cmds, ['v2ex', 'V2EX 热门', 'V2EX 最新'])
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- src-ztools/plugin.test.ts`

预期：FAIL，当前配置仍含 `hello`、`read`、`write` 三个演示功能。

- [ ] **步骤 3：编写最小实现**

```ts
onMounted(() => {
  window.ztools.onPluginEnter((action) => {
    enterAction.value = action
  })
})
```

将 `plugin.json` 的 `features` 替换为唯一的 `v2ex` 功能，并将 README 更新为实际命令、功能和构建说明。

- [ ] **步骤 4：运行完整验证**

运行：`npm test && npm run build`

预期：所有测试通过，Vue 类型检查通过，并生成 `src-ztools/dist/index.html`。

- [ ] **步骤 5：启动并检查开发服务器**

运行：`npm run dev -- --host 127.0.0.1`

预期：Vite 启动后可在浏览器打开本地地址；验证热门、最新、过滤、详情和回复交互。
