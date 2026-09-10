export interface RateLimitRecord {
  count: number;
  resetTime: number;
  blockedUntil: number;
  violations: number;
  lastSeen: number;
}

export interface LoginFailureRecord {
  count: number;
  blockedUntil: number;
  lastFailure: number;
}

export interface RateLimitStore {
  getRecord(key: string): Promise<RateLimitRecord | null>;
  setRecord(key: string, record: RateLimitRecord, ttlMs: number): Promise<void>;
  deleteRecord(key: string): Promise<void>;
  getLoginFailure(key: string): Promise<LoginFailureRecord | null>;
  setLoginFailure(key: string, record: LoginFailureRecord, ttlMs: number): Promise<void>;
  deleteLoginFailure(key: string): Promise<void>;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private records = new Map<string, RateLimitRecord>();
  private loginFailures = new Map<string, LoginFailureRecord>();

  async getRecord(key: string): Promise<RateLimitRecord | null> {
    return this.records.get(key) ?? null;
  }

  async setRecord(key: string, record: RateLimitRecord): Promise<void> {
    this.records.set(key, record);
  }

  async deleteRecord(key: string): Promise<void> {
    this.records.delete(key);
  }

  async getLoginFailure(key: string): Promise<LoginFailureRecord | null> {
    return this.loginFailures.get(key) ?? null;
  }

  async setLoginFailure(key: string, record: LoginFailureRecord): Promise<void> {
    this.loginFailures.set(key, record);
  }

  async deleteLoginFailure(key: string): Promise<void> {
    this.loginFailures.delete(key);
  }

  cleanup(now = Date.now(), expiryMs = 24 * 60 * 60 * 1000): void {
    for (const [key, record] of this.records.entries()) {
      if (record.lastSeen < now - expiryMs && record.blockedUntil < now) {
        this.records.delete(key);
      }
    }
    for (const [key, record] of this.loginFailures.entries()) {
      if (record.lastFailure < now - expiryMs && record.blockedUntil < now) {
        this.loginFailures.delete(key);
      }
    }
  }
}

/**
 * Upstash Redis REST store. Selected automatically when both env vars are set,
 * so rate limits persist across serverless isolates on Vercel.
 */
export class UpstashRateLimitStore implements RateLimitStore {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  private async command(args: string[]): Promise<unknown> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    if (!response.ok) {
      throw new Error(`Upstash command failed (${response.status})`);
    }
    const payload = await response.json() as { result?: unknown };
    return payload.result ?? null;
  }

  private async readJson<T>(key: string): Promise<T | null> {
    const raw = await this.command(['GET', key]);
    if (typeof raw !== 'string' || raw.length === 0) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private async writeJson(key: string, value: unknown, ttlMs: number): Promise<void> {
    const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
    await this.command(['SET', key, JSON.stringify(value), 'EX', String(ttlSeconds)]);
  }

  async getRecord(key: string): Promise<RateLimitRecord | null> {
    return this.readJson<RateLimitRecord>(`rl:${key}`);
  }

  async setRecord(key: string, record: RateLimitRecord, ttlMs: number): Promise<void> {
    await this.writeJson(`rl:${key}`, record, ttlMs);
  }

  async deleteRecord(key: string): Promise<void> {
    await this.command(['DEL', `rl:${key}`]);
  }

  async getLoginFailure(key: string): Promise<LoginFailureRecord | null> {
    return this.readJson<LoginFailureRecord>(`lf:${key}`);
  }

  async setLoginFailure(key: string, record: LoginFailureRecord, ttlMs: number): Promise<void> {
    await this.writeJson(`lf:${key}`, record, ttlMs);
  }

  async deleteLoginFailure(key: string): Promise<void> {
    await this.command(['DEL', `lf:${key}`]);
  }
}

function createDefaultStore(): RateLimitStore {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return new UpstashRateLimitStore(url.replace(/\/$/, ''), token);
  }
  return new MemoryRateLimitStore();
}

let activeStore: RateLimitStore = createDefaultStore();

export function getRateLimitStore(): RateLimitStore {
  return activeStore;
}

/** Test hook: swap the store without touching process.env mid-suite. */
export function setRateLimitStore(store: RateLimitStore): void {
  activeStore = store;
}

export function resetRateLimitStore(): void {
  activeStore = createDefaultStore();
}
