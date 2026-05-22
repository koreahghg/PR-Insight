const CACHE_TTL_MS = 5 * 60 * 1000
const MAX_CACHE_SIZE = 20

interface CacheEntry<T> {
  data: T
  timestamp: number
}

export class RequestCache<T> {
  private cache = new Map<string, CacheEntry<T>>()

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key)
      return null
    }
    // LRU: 접근 시 순서 갱신
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.data
  }

  set(key: string, data: T): void {
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldest = this.cache.keys().next().value
      if (oldest !== undefined) this.cache.delete(oldest)
    }
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  static hashRequest(obj: Record<string, unknown>): string {
    const sorted = Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b)),
    )
    return JSON.stringify(sorted)
  }
}
