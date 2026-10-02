import { APP_ID } from '../shared/api';
import { openBrowser } from './platform';
import { createServer } from './server';

async function main(): Promise<void> {
  const port = Number(process.env.PORT || 3457);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  const dev = process.env.HELLO_WORLD_DEV === '1';
  const shouldOpen = !process.argv.includes('--no-open') && process.env.HELLO_WORLD_NO_OPEN !== '1';
  const url = dev ? 'http://127.0.0.1:5174' : `http://127.0.0.1:${port}`;
  let closing = false;
  const app = createServer({ dev, onShutdown: dev ? undefined : () => void close() });

  async function close(): Promise<void> {
    if (closing) return;
    closing = true;
    try {
      await app.close();
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    }
  }

  try {
    await app.listen({ port, host: '127.0.0.1' });
  } catch (error) {
    await app.close();
    if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error;
    const existing = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(2_000) })
      .then(response => response.json() as Promise<{ app?: string; development?: boolean }>)
      .catch(() => null);
    if (existing?.app !== APP_ID || existing.development !== dev) {
      throw new Error(`Port ${port} is in use. Set PORT to choose another port.`);
    }
    console.log(`Hello World is already running at ${url}`);
    if (shouldOpen) await openBrowser(url).catch(() => console.log(`Open ${url} in your browser.`));
    return;
  }

  process.on('SIGINT', () => void close());
  process.on('SIGTERM', () => void close());
  console.log(`Hello World is ready at ${url}`);
  if (shouldOpen) void openBrowser(url).catch(() => console.log(`Open ${url} in your browser.`));
}

void main().catch(error => {
  console.error(`Hello World: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
