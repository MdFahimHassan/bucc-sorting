/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Hashed assets (js, css, fonts, crests) are precached, so the ceremony still works offline.
    // index.html and data.json are NOT precached: they are fetched network-first (3s timeout, cached
    // copy only as an offline fallback), so a visitor never gets a stale page or stale participant data.
    // main.tsx registers the service worker and reloads once when a new version takes over.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'The Sorting Ceremony | BUCC Fall 26',
        short_name: 'BUCC Sorting',
        description: 'Find out which BUCC department the Sorting Hat has chosen for you.',
        theme_color: '#05060d',
        background_color: '#05060d',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,woff2,svg,webp}', 'icons/*.png'],
        globIgnores: ['**/og.png', '**/data.json', '**/index.html'],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'pages', networkTimeoutSeconds: 3 },
          },
          {
            // The small sound effects (a few KB each) are cached the first time sound is turned on, so
            // sound keeps working offline afterwards. Nothing is downloaded for people who never turn it
            // on. The ~1.3 MB music loop is left out on purpose: it streams through an <audio> element
            // (which needs range requests) and the browser's own cache keeps it (/assets/* is immutable);
            // offline on first use, the engine falls back to a synthesized drone.
            urlPattern: ({ url }) => /\/assets\/(?!music-)[^/]+\.mp3$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'sfx', expiration: { maxEntries: 20 } },
          },
          {
            urlPattern: ({ url }) => url.pathname === '/data.json',
            handler: 'NetworkFirst',
            options: { cacheName: 'data', networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});