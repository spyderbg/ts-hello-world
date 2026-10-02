import { build as viteBuild } from 'vite';
import { build } from 'esbuild';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

await viteBuild();
const files: Record<string, { mime: string; base64: string }> = {};
const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

async function embed(folder: string): Promise<void> {
  for (const entry of await readdir(path.join('build/frontend', folder), { withFileTypes: true })) {
    const relative = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      await embed(relative);
    } else {
      files['/' + relative.split(path.sep).join('/')] = {
        mime: mime[path.extname(relative)] || 'application/octet-stream',
        base64: (await readFile(path.join('build/frontend', relative))).toString('base64'),
      };
    }
  }
}

await embed('');
await mkdir('build', { recursive: true });
await writeFile('build/embedded.ts', `export const embeddedFiles = ${JSON.stringify(files)};\n`);
await build({
  entryPoints: ['backend/main.ts'],
  outfile: 'build/server.cjs',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  plugins: [{
    name: 'embedded-frontend',
    setup(builder) {
      builder.onResolve({ filter: /^\.\/embedded$/ }, () => ({ path: path.resolve('build/embedded.ts') }));
    },
  }],
});
console.log('Built Vue frontend and TypeScript backend → build/server.cjs');
