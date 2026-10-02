# Hello World

A minimal application following the architecture of `../ts-demo-app`: a local Fastify backend, a browser frontend, and standalone executables. The frontend uses **Vue 3** single-file components. Backend, frontend logic, and build scripts use **TypeScript**.

The Vue frontend requests `GET /api/hello` from the backend and displays **Hello World!**. The finished application opens your default browser at **http://127.0.0.1:3457**. All frontend assets are bundled, so the application works offline.

## Run the finished application

| OS | Standalone executable | Launch |
| --- | --- | --- |
| Ubuntu/Linux x64 | `dist/hello-world` | `./dist/hello-world` |
| Windows x64 | `dist/hello-world.exe` | Double-click, or `.\dist\hello-world.exe` in PowerShell |

End users do not need Node.js, npm, or any adjacent project files. Copy only the executable for the target OS. Ubuntu uses `xdg-open` to open the browser; Windows uses PowerShell `Start-Process`. The Windows executable is unsigned and has a console window.

Closing the last application tab shuts down the backend after two seconds. Refreshing reconnects within that grace period. Other open app tabs keep the backend running, including background tabs. Before the first tab connects, the backend waits indefinitely, allowing manual launch with `--no-open`. Ctrl+C also stops the application. Launching a second instance opens the existing app if it is already listening on the same port.

## Development and builds

Requires Node.js **22.12+** and npm; Node.js **24 LTS** is recommended. Use the official Node.js distribution for standalone packaging.

```bash
npm ci
npm run dev              # Vue/Vite on 5174, backend on 3457; opens the browser
npm run typecheck        # TypeScript and Vue component checking
npm run build            # Compile and embed the frontend in build/server.cjs
npm start                # Run the production bundle with Node.js
npm run package          # Linux: build both binaries; Windows: build the .exe
npm run package:linux    # Build dist/hello-world on Linux
npm run package:windows  # Build dist/hello-world.exe on Linux or Windows
```

These npm commands work in Ubuntu shells and Windows PowerShell. Linux packaging must run on Linux and uses the current Node executable, retaining its architecture and OS compatibility requirements. The default Ubuntu artifact here is x64. Windows packaging always produces an x64 executable; when building on Linux, it downloads the matching Windows Node runtime from `nodejs.org`, verifies the official SHA-256 checksum, and caches it under `build/runtimes/`. On Windows with x64 Node, it uses the installed runtime. No Windows SDK or Wine is required to build it.

Packaging uses [Node.js single-executable applications](https://nodejs.org/download/release/v24.14.0/docs/api/single-executable-applications.html), with snapshots and code caching disabled for cross-platform compatibility. The runtime and SEA blob use the same exact Node version.

Automatic shutdown is disabled in development so closing a tab does not stop Vite. No tests or test framework are included.

## Launch options

```bash
./dist/hello-world --no-open
PORT=4567 ./dist/hello-world
HELLO_WORLD_NO_OPEN=1 npm run dev
```

On Windows:

```powershell
$env:PORT = '4567'
.\dist\hello-world.exe --no-open
```

`PORT` also changes the backend port and proxy target in development; the Vue development server stays on 5174. Use `HELLO_WORLD_NO_OPEN=1` or `--no-open` to suppress browser launch (`npm start -- --no-open` for the production bundle). The backend binds only to loopback and rejects foreign hosts and cross-site API requests.

## Structure

```text
backend/         Fastify API, browser launcher, app lifetime, embedded assets
frontend/        Vue 3 application, styles, and favicon
shared/          API types shared between backend and frontend
scripts/         Development, build, and Ubuntu/Windows packaging
build/           Generated frontend, bundled server, SEA blob, runtime cache
dist/            Generated standalone executables
```
