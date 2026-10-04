# How It Works

The project creates a **single executable containing Node.js, the backend, and the frontend assets**. TypeScript is converted to JavaScript, which the embedded Node.js runtime executes.

## Build commands

Building requires Node.js 22.12 or newer and npm. Use the official Node.js distribution for standalone packaging.

```bash
npm ci
npm run package:linux     # Creates dist/hello-world; run on Linux
npm run package:windows   # Creates dist/hello-world.exe; run on Linux or Windows
```

On Linux, `npm run package` builds both executables. On Windows, it builds only the Windows executable.

`npm run build` produces `build/server.cjs`, which still needs an installed Node.js. Run that bundle with `npm start`. The `package` commands run the build first, then add the runtime to create a standalone executable.

## Build stages

### 1. Check types and build the frontend

The build command runs `vue-tsc --noEmit` to check TypeScript and Vue components. Then [scripts/build.ts](scripts/build.ts) invokes Vite, using [vite.config.ts](vite.config.ts), to compile the Vue components, frontend TypeScript, and CSS into `build/frontend/`.

The output contains the application HTML, bundled JavaScript including the Vue runtime, CSS, and public assets such as the favicon.

### 2. Embed the frontend assets

The build script reads every file in `build/frontend/` and writes `build/embedded.ts`. Each file is stored under its URL path with a MIME type and Base64-encoded content.

During backend bundling, an esbuild plugin replaces the import of the empty placeholder [backend/embedded.ts](backend/embedded.ts) with this generated module. This embeds the frontend directly in the backend bundle.

### 3. Bundle the backend

esbuild starts at [backend/main.ts](backend/main.ts) and combines the backend, its imported JavaScript dependencies, and the embedded frontend into `build/server.cjs`.

The result is a CommonJS JavaScript bundle targeting Node.js 22. TypeScript types are removed during compilation.

### 4. Create the executable

[scripts/package.ts](scripts/package.ts) uses Node's Single Executable Application (SEA) mechanism:

1. Write `build/sea-config.json`, pointing to `build/server.cjs`.
2. Run Node with `--experimental-sea-config` to create `build/hello-world.blob`. Snapshots and code caching are disabled.
3. Copy a Node executable for the target operating system.
4. Use `postject` to inject the blob into that executable as `NODE_SEA_BLOB`.
5. Save the finished executable in `dist/`.

For Linux, packaging copies the Node executable running the packaging script, retaining its architecture and OS compatibility requirements.

For Windows, [scripts/packaging.ts](scripts/packaging.ts) uses the installed runtime when running on Windows with x64 Node. Otherwise, it downloads the Windows x64 runtime for the exact same Node version, verifies its official SHA-256 checksum, and caches it under `build/runtimes/`. The existing Windows signature is removed before injection; the finished Windows executable is unsigned.

## What the executable includes

| Component | Contents |
| --- | --- |
| Node.js runtime | JavaScript engine and built-in Node modules |
| Backend | Fastify, API routes, local request checks, browser launcher, and page lifetime handling |
| Backend dependencies | Bundled JavaScript dependencies used by the backend |
| Frontend | Compiled Vue application and Vue runtime, HTML, CSS, favicon, and other generated frontend assets |

Users can copy just the executable for their operating system. They do not need Node.js, npm, `node_modules`, or adjacent frontend files. The build tools—TypeScript, Vite, esbuild, and postject—are not shipped as tools.

The browser is external: the application uses the computer's installed browser and normal OS facilities. Linux uses `xdg-open` to launch the browser; Windows uses PowerShell `Start-Process`.

## What happens when it runs

The embedded Node.js runtime executes the backend entry point. The backend starts a Fastify server bound to `127.0.0.1`, using port `3457` by default, and opens the default browser at `http://127.0.0.1:3457`.

[backend/server.ts](backend/server.ts) serves the embedded frontend assets by decoding their Base64 content in memory. The Vue application requests `/api/hello` and displays the backend's greeting. All frontend assets are local, so the finished application works offline.

Each application tab keeps a connection to the backend. Closing the last tab shuts down the backend after a two-second grace period, allowing a refresh to reconnect. Before the first tab connects, the backend waits indefinitely. Ctrl+C also stops it.

Set `PORT` to change the backend port. Use `--no-open` or `HELLO_WORLD_NO_OPEN=1` to suppress automatic browser launch.
