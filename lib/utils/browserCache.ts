const DEFAULT_TTL = 1000 * 60 * 5; // 5 minutes

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const isBrowser = typeof window !== 'undefined';

export function readCache<T>(key: string): T | null {
  if (!isBrowser) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (!entry || typeof entry.expiresAt !== 'number') {
      window.localStorage.removeItem(key);
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      window.localStorage.removeItem(key);
      return null;
    }

    return entry.value;
  } catch (error) {
    console.warn(`Failed to read cache key "${key}":`, error);
    if (isBrowser) {
      window.localStorage.removeItem(key);
    }
    return null;
  }
}

export function writeCache<T>(key: string, value: T, ttl: number = DEFAULT_TTL): void {
  if (!isBrowser) {
    return;
  }

  try {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl,
    };
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn(`Failed to write cache key "${key}":`, error);
  }
}

export function clearCache(key: string): void {
  if (!isBrowser) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to clear cache key "${key}":`, error);
  }
}

export function withCacheKey(base: string, userId?: string | null, version = 'v1'): string | null {
  if (!userId) {
    return null;
  }
  return `${base}:${version}:${userId}`;
}

