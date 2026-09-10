import {
  MemoryRateLimitStore,
  UpstashRateLimitStore,
  resetRateLimitStore,
  setRateLimitStore,
  getRateLimitStore,
} from '../api/middleware/rateLimitStore';

describe('rate limit store', () => {
  afterEach(() => {
    resetRateLimitStore();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('stores and clears memory records', async () => {
    const store = new MemoryRateLimitStore();
    const record = {
      count: 2,
      resetTime: Date.now() + 1000,
      blockedUntil: 0,
      violations: 0,
      lastSeen: Date.now(),
    };
    await store.setRecord('k', record, 1000);
    expect(await store.getRecord('k')).toEqual(record);
    await store.deleteRecord('k');
    expect(await store.getRecord('k')).toBeNull();
  });

  it('talks to Upstash REST with prefixed keys', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'OK' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: JSON.stringify({ count: 1, resetTime: 1, blockedUntil: 0, violations: 0, lastSeen: 1 }) }),
      });
    (global as any).fetch = fetchMock;

    const store = new UpstashRateLimitStore('https://example.upstash.io', 'token');
    await store.setRecord('route:ip:1.1.1.1', {
      count: 1,
      resetTime: 1,
      blockedUntil: 0,
      violations: 0,
      lastSeen: 1,
    }, 60_000);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.upstash.io',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      }),
    );
    const setBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(setBody[0]).toBe('SET');
    expect(setBody[1]).toBe('rl:route:ip:1.1.1.1');
    expect(setBody[3]).toBe('EX');

    const loaded = await store.getRecord('route:ip:1.1.1.1');
    expect(loaded?.count).toBe(1);
    expect(fetchMock.mock.calls[1][1].body).toBe(JSON.stringify(['GET', 'rl:route:ip:1.1.1.1']));
  });

  it('exposes the active store for handlers', () => {
    const custom = new MemoryRateLimitStore();
    setRateLimitStore(custom);
    expect(getRateLimitStore()).toBe(custom);
  });
});
