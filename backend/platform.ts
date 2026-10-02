import { spawn } from 'node:child_process';

export async function openBrowser(url: string): Promise<void> {
  const windows = process.platform === 'win32';
  const command = windows ? 'powershell.exe' : 'xdg-open';
  // Pass the URL as data so PowerShell never interprets it as source code.
  const args = windows
    ? ['-NoProfile', '-NonInteractive', '-Command', 'Start-Process -FilePath $env:HELLO_WORLD_OPEN_URL -ErrorAction Stop']
    : [url];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'ignore',
      windowsHide: true,
      env: { ...process.env, HELLO_WORLD_OPEN_URL: url },
    });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error('Could not open the default browser.')));
  });
}
