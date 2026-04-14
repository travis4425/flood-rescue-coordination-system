// Cache utility đơn giản dùng in-memory Map
// Dùng xuyên suốt project để cache kết quả query thường xuyên
class SimpleCache {
  constructor() {
    this.store = new Map();
    // Cleanup expired entries mỗi 5 phút
    setInterval(() => this._cleanup(), 5 * 60 * 1000);
  }

  set(key, value, ttlSeconds = 300) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) { this.store.delete(key); return null; }
    return item.value;
  }

  invalidate(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  _cleanup() {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) this.store.delete(key);
    }
  }
}

module.exports = new SimpleCache();
