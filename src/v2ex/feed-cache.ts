import type { FeedKind, TopicSummary } from './types'

const CACHE_TTL_MS = 10 * 60 * 1_000

interface CacheEntry {
  topics: TopicSummary[]
  loadedAt: number
}

export class FeedCache {
  private entries = new Map<FeedKind, CacheEntry>()
  private readonly requestTopics: (kind: FeedKind) => Promise<TopicSummary[]>
  private readonly now: () => number

  constructor(requestTopics: (kind: FeedKind) => Promise<TopicSummary[]>, now: () => number = Date.now) {
    this.requestTopics = requestTopics
    this.now = now
  }

  async load(kind: FeedKind, forceRefresh = false): Promise<TopicSummary[]> {
    const entry = this.entries.get(kind)
    if (!forceRefresh && entry && this.now() - entry.loadedAt < CACHE_TTL_MS) {
      return entry.topics
    }

    const topics = await this.requestTopics(kind)
    this.entries.set(kind, { topics, loadedAt: this.now() })
    return topics
  }
}
