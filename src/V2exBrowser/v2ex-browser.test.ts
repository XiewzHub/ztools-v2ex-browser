import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('组件包含热门、最新、刷新和详情操作', () => {
  const source = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')
  for (const label of ['热门', '最新', '刷新', '返回列表', '在浏览器打开']) {
    assert.match(source, new RegExp(label))
  }
})
