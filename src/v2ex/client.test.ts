import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchTopics } from './client.ts'

test('热门列表请求正确的公开地址', async () => {
  let calledUrl = ''
  const request = async (url: string) => {
    calledUrl = url
    return new Response(JSON.stringify([]), { status: 200 })
  }

  await fetchTopics('hot', request as typeof fetch)

  assert.equal(calledUrl, 'https://www.v2ex.com/api/topics/hot.json')
})

test('非成功 HTTP 状态转换为中文错误', async () => {
  const request = async () => new Response('', { status: 503 })

  await assert.rejects(fetchTopics('latest', request as typeof fetch), /暂时不可用/)
})
