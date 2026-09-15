/** Tiny in-memory TTL cache that also collapses concurrent requests for the same key. */
export class TtlCache<T> {
  private readonly entries = new Map<string, { value: Promise<T>; expires: number }>()

  private readonly ttlMs: number

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs
  }

  get(key: string, produce: () => Promise<T>): Promise<T> {
    const now = Date.now()
    const hit = this.entries.get(key)
    if (hit && hit.expires > now) return hit.value
    const value = produce().catch((err) => {
      this.entries.delete(key)
      throw err
    })
    this.entries.set(key, { value, expires: now + this.ttlMs })
    return value
  }

  clear(): void {
    this.entries.clear()
  }
}
