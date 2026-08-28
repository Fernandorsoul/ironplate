import { applyCors, isOriginAllowed } from '../api/middleware/cors';

function createResponse() {
  const headers = new Map<string, string>();
  const response = {
    statusCode: 200,
    ended: false,
    setHeader: jest.fn((name: string, value: string) => headers.set(name, value)),
    status: jest.fn((statusCode: number) => {
      response.statusCode = statusCode;
      return response;
    }),
    end: jest.fn(() => {
      response.ended = true;
      return response;
    }),
  };
  return { response, headers };
}

describe('CORS middleware', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnvironment,
      NODE_ENV: 'production',
      ALLOWED_ORIGINS: 'https://ironplate.example,https://app.ironplate.example',
    };
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('allows only configured production origins', () => {
    expect(isOriginAllowed('https://ironplate.example')).toBe(true);
    expect(isOriginAllowed('https://evil.example')).toBe(false);
    expect(isOriginAllowed(undefined)).toBe(false);
  });

  it('uses the production app origin when ALLOWED_ORIGINS is not configured', () => {
    delete process.env.ALLOWED_ORIGINS;
    expect(isOriginAllowed('https://ironplate.vercel.app')).toBe(true);
    expect(isOriginAllowed('not a URL')).toBe(false);
  });

  it('echoes an allowed origin without using a wildcard', () => {
    const { response, headers } = createResponse();
    const handled = applyCors({
      method: 'GET',
      headers: { origin: 'https://ironplate.example' },
    } as any, response as any, ['GET']);

    expect(handled).toBe(false);
    expect(headers.get('Access-Control-Allow-Origin')).toBe('https://ironplate.example');
    expect(headers.get('Access-Control-Allow-Origin')).not.toBe('*');
    expect(headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    expect(headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
  });

  it('handles preflight requests with status 204', () => {
    const { response } = createResponse();
    const handled = applyCors({
      method: 'OPTIONS',
      headers: { origin: 'https://ironplate.example' },
    } as any, response as any, ['POST']);

    expect(handled).toBe(true);
    expect(response.status).toHaveBeenCalledWith(204);
    expect(response.end).toHaveBeenCalled();
  });

  it('permits localhost only outside production', () => {
    process.env.NODE_ENV = 'development';
    expect(isOriginAllowed('http://localhost:8081')).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1:19006')).toBe(true);
    expect(isOriginAllowed('https://localhost:8081')).toBe(false);
    expect(isOriginAllowed('http://192.168.0.2:8081')).toBe(false);
  });

  it('does not emit an allow-origin header for requests without an origin', () => {
    const { response, headers } = createResponse();
    expect(applyCors({ method: 'GET', headers: {} } as any, response as any, ['GET'])).toBe(false);
    expect(headers.has('Access-Control-Allow-Origin')).toBe(false);
  });
});
