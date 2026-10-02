<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { GreetingResponse } from '../../shared/api';
import { useBackendLifetime } from './useBackendLifetime';

const message = ref('');
const loading = ref(true);
const error = ref('');

useBackendLifetime();

async function loadGreeting(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const response = await fetch('/api/hello', { cache: 'no-store', signal: AbortSignal.timeout(5_000) });
    if (!response.ok) throw new Error('The greeting could not be loaded.');
    const greeting: GreetingResponse = await response.json();
    message.value = greeting.message;
  } catch {
    error.value = 'Could not connect. Please try again.';
  } finally {
    loading.value = false;
  }
}

onMounted(loadGreeting);
</script>

<template>
  <div class="shell">
    <header class="header">
      <a class="brand" href="/" aria-label="Hello World home">
        <span class="brand-mark" aria-hidden="true">h.</span>
        <span>Hello World</span>
      </a>
      <span class="local-label">A little local app</span>
    </header>

    <main>
      <section class="greeting-card" aria-labelledby="greeting" :aria-busy="loading">
        <div class="hello-icon" aria-hidden="true">✦</div>
        <p class="eyebrow">EVERYTHING STARTS WITH A HELLO</p>
        <h1 id="greeting" aria-live="polite">{{ message || (loading ? 'One moment…' : 'Let’s try again.') }}</h1>
        <p class="description">A small beginning. A world of possibilities.</p>
        <p class="connection-status" :class="{ 'has-error': error }" role="status">
          <span class="status-dot" aria-hidden="true"></span>
          {{ loading ? 'Connecting…' : error || 'Connected and ready' }}
        </p>
        <button type="button" :disabled="loading" @click="loadGreeting">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M20 7v5h-5M4 17v-5h5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M6.1 7a7 7 0 0 1 11.6-1L20 9M4 15l2.3 3A7 7 0 0 0 17.9 17" stroke-linecap="round" />
          </svg>
          {{ loading ? 'Loading…' : error ? 'Try again' : 'Say hello again' }}
        </button>
      </section>
    </main>

    <footer>Made to keep things simple.</footer>
  </div>
</template>
