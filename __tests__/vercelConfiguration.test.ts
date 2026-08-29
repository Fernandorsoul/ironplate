import { readFileSync, readdirSync } from 'fs';
import path from 'path';

interface VercelConfiguration {
  builds: Array<{ src: string; use: string }>;
  routes: Array<{ src?: string; dest?: string }>;
}

const repositoryRoot = path.join(__dirname, '..');
const configuration = JSON.parse(
  readFileSync(path.join(repositoryRoot, 'vercel.json'), 'utf8'),
) as VercelConfiguration;

describe('Vercel Hobby deployment configuration', () => {
  it('publishes only user API handlers and remains within the 12-function limit', () => {
    expect(configuration.builds[0]).toEqual({
      src: 'api/users/*.ts',
      use: '@vercel/node',
    });

    const handlers = readdirSync(path.join(repositoryRoot, 'api', 'users'))
      .filter(fileName => fileName.endsWith('.ts'));

    expect(handlers).toHaveLength(12);
    expect(handlers.length).toBeLessThanOrEqual(12);
  });

  it('keeps the public password-reset endpoints mapped to the consolidated function', () => {
    expect(configuration.routes).toEqual(expect.arrayContaining([
      {
        src: '/api/users/forgot-password/?',
        dest: '/api/users/password-reset.ts?operation=forgot',
      },
      {
        src: '/api/users/reset-password/?',
        dest: '/api/users/password-reset.ts?operation=reset',
      },
    ]));
  });

  it('maps extensionless public API paths to the emitted TypeScript functions', () => {
    expect(configuration.routes).toContainEqual({
      src: '/api/(.*)',
      dest: '/api/$1.ts',
    });
  });
});
