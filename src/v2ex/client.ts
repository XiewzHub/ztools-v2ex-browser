import type { FeedKind, TopicBundle, TopicDetail, TopicReply, TopicSummary } from './types'

const API_BASE = 'https://www.v2ex.com/api'
const REQUEST_TIMEOUT_MS = 12_000

async function requestJson<T>(url: string, request: typeof fetch): Promise<T> {
  let response: Response
  try {
    response = await request(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new Error('V2EX 请求超时，请稍后重试。')
    }
    throw new Error('无法连接到 V2EX，请检查网络后重试。')
  }

  if (!response.ok) {
    throw new Error('V2EX 服务暂时不可用，请稍后重试。')
  }

  return response.json() as Promise<T>
}

export function fetchTopics(kind: FeedKind, request: typeof fetch = fetch): Promise<TopicSummary[]> {
  return requestJson<TopicSummary[]>(`${API_BASE}/topics/${kind}.json`, request)
}

export async function fetchTopic(topicId: number, request: typeof fetch = fetch): Promise<TopicDetail> {
  const topics = await requestJson<TopicDetail[]>(`${API_BASE}/topics/show.json?id=${topicId}`, request)
  const topic = topics[0]
  if (!topic) {
    throw new Error('没有找到这篇帖子，它可能已经被删除。')
  }
  return topic
}

export function fetchReplies(topicId: number, request: typeof fetch = fetch): Promise<TopicReply[]> {
  return requestJson<TopicReply[]>(`${API_BASE}/replies/show.json?topic_id=${topicId}`, request)
}

export async function fetchTopicBundle(topicId: number, request: typeof fetch = fetch): Promise<TopicBundle> {
  const [topic, replies] = await Promise.all([fetchTopic(topicId, request), fetchReplies(topicId, request)])
  return { topic, replies }
}
