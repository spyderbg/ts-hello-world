import Fastify from 'fastify';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { APP_ID, type GreetingResponse, type SessionResponse } from '../shared/api';
import packageInfo from '../package.json';
import { embeddedFiles } from './embedded';
import { PageLifetime } from './page-lifetime';

export function createServer(options: { dev: boolean; onShutdown?: () => void }) {
  const app = Fastify({ logger: false, forceCloseConnections: true });
  const token = randomBytes(32).toString('hex');
  const lifetime = new PageLifetime(() => options.onShutdown?.());
  app.addHook('preClose', async () => lifetime.dispose());

  app.addHook('onRequest', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'same-origin');
    reply.header('Cross-Origin-Resource-Policy', 'same-origin');
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(request.hostname)) {
      return reply.code(403).send({ error: 'Only local requests are allowed.' });
    }
    if (request.url.startsWith('/api/') && request.headers['sec-fetch-site'] === 'cross-site') {
      return reply.code(403).send({ error: 'Cross-site requests are not allowed.' });
    }
  });

  app.get('/api/health', async () => ({ app: APP_ID, version: packageInfo.version, development: options.dev }));
  app.get('/api/hello', async (): Promise<GreetingResponse> => ({ message: 'Hello World!' }));
  app.get('/api/session', async (_request, reply): Promise<SessionResponse> => {
    reply.header('Set-Cookie', `hello-session=${token}; HttpOnly; SameSite=Strict; Path=/api/lifecycle`);
    return { autoShutdownOnClose: !!options.onShutdown };
  });
  app.get('/api/lifecycle', async (request, reply) => {
    if (!options.onShutdown) return reply.code(503).send({ error: 'Automatic shutdown is disabled during development.' });
    const authenticated = request.headers.cookie?.split(';').some(cookie => cookie.trim() === `hello-session=${token}`);
    if (!authenticated) return reply.code(403).send({ error: 'Reload the application to renew your session.' });
    reply.hijack();
    lifetime.connect(reply.raw);
  });

  const serveFrontend = (url: string) => {
    const pathname = url.split('?')[0];
    // The SPA entry is a fallback for navigation, never for missing assets or APIs.
    return embeddedFiles[pathname] || (!path.posix.extname(pathname) ? embeddedFiles['/index.html'] : undefined);
  };
  app.setNotFoundHandler((request, reply) => {
    if (request.url.split('?')[0] === '/api' || request.url.startsWith('/api/')) {
      return reply.code(404).send({ error: 'Endpoint not found.' });
    }
    if (options.dev) return reply.redirect('http://127.0.0.1:5174');
    const file = serveFrontend(request.url);
    if (!file) return reply.code(404).send({ error: 'File not found.' });
    reply.header('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'");
    return reply.type(file.mime).send(Buffer.from(file.base64, 'base64'));
  });

  return app;
}
