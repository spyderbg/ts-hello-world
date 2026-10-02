import { onMounted, onUnmounted } from 'vue';
import type { SessionResponse } from '../../shared/api';

/** Release the backend on page close and reconnect after a refresh or a browser restore. */
export function useBackendLifetime(): void {
  let mounted = false;
  let pageActive = true;
  let connection: EventSource | undefined;
  let pending: AbortController | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;

  const scheduleRetry = () => {
    if (mounted && pageActive && !retry) {
      retry = setTimeout(() => {
        retry = undefined;
        void connect();
      }, 500);
    }
  };

  async function connect(): Promise<void> {
    if (!mounted || !pageActive || connection || pending) return;
    const controller = new AbortController();
    pending = controller;
    try {
      const response = await fetch('/api/session', { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Backend session unavailable.');
      const session: SessionResponse = await response.json();
      if (!mounted || !pageActive || controller.signal.aborted || !session.autoShutdownOnClose) return;
      const stream = new EventSource('/api/lifecycle');
      connection = stream;
      stream.onerror = () => {
        stream.close();
        if (connection === stream) connection = undefined;
        scheduleRetry();
      };
    } catch {
      if (!controller.signal.aborted) scheduleRetry();
    } finally {
      if (pending === controller) pending = undefined;
    }
  }

  const disconnect = () => {
    clearTimeout(retry);
    retry = undefined;
    pending?.abort();
    pending = undefined;
    connection?.close();
    connection = undefined;
  };
  const onHide = () => { pageActive = false; disconnect(); };
  const onShow = () => { pageActive = true; void connect(); };

  onMounted(() => {
    mounted = true;
    window.addEventListener('pagehide', onHide);
    window.addEventListener('pageshow', onShow);
    void connect();
  });
  onUnmounted(() => {
    mounted = false;
    window.removeEventListener('pagehide', onHide);
    window.removeEventListener('pageshow', onShow);
    disconnect();
  });
}
