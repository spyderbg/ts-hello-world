import { spawn } from 'node:child_process';
import { createServer } from 'vite';

const vite = await createServer();
await vite.listen();
const backend = spawn(process.execPath, ['--import', 'tsx', 'backend/main.ts'], {
  stdio: 'inherit',
  env: { ...process.env, HELLO_WORLD_DEV: '1' },
});
vite.printUrls();

let closing = false;
async function close(): Promise<void> {
  if (closing) return;
  closing = true;
  backend.kill('SIGTERM');
  await vite.close();
}
process.on('SIGINT', () => void close());
process.on('SIGTERM', () => void close());
backend.once('error', error => {
  console.error(error);
  process.exitCode = 1;
  void close();
});
backend.once('exit', code => {
  if (!closing) process.exitCode = code ?? 1;
  void close();
});
