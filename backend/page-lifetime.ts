import type { ServerResponse } from 'node:http';

/** A page keeps its backend alive through an event stream, including in the background. */
export class PageLifetime {
  private readonly connections = new Set<ServerResponse>();
  private shutdownTimer?: ReturnType<typeof setTimeout>;
  private disposed = false;

  constructor(private readonly onLastPageClose: () => void) {}

  connect(response: ServerResponse): void {
    if (this.disposed) {
      response.end();
      return;
    }
    clearTimeout(this.shutdownTimer);
    this.connections.add(response);
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      'Connection': 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
    });
    response.write('event: connected\ndata: {}\n\n');
    const keepalive = setInterval(() => response.write(': keepalive\n\n'), 15_000);
    keepalive.unref();

    response.once('close', () => {
      clearInterval(keepalive);
      this.connections.delete(response);
      if (!this.disposed && this.connections.size === 0) {
        this.shutdownTimer = setTimeout(() => {
          if (!this.disposed && this.connections.size === 0) this.onLastPageClose();
        }, 2_000);
      }
    });
  }

  dispose(): void {
    this.disposed = true;
    clearTimeout(this.shutdownTimer);
    for (const response of this.connections) response.end();
    this.connections.clear();
  }
}
