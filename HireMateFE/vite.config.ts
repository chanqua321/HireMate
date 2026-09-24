import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  if (mode === 'production') {
    // Vercel/CI must provide this explicitly. A developer's .env must not
    // silently supply a localhost URL to a production build.
    const value = (process.env.VITE_API_BASE_URL || '').trim();
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error('Production build requires a valid VITE_API_BASE_URL.');
    }
    if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      throw new Error('Production VITE_API_BASE_URL must use HTTPS and cannot point to localhost.');
    }
  }
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      host: 'localhost',
      open: true,
    },
    preview: {
      port: 3000,
      strictPort: true,
      host: 'localhost',
    },
  };
});
