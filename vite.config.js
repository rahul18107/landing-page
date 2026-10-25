import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    drop: ['debugger'],
    // Unused console.log/debug calls are pruned from the production bundle,
    // including their arguments (dev builds don't minify, so logs survive in
    // dev). console.error stays for crash reports.
    pure: ['console.log', 'debug'],
  },
  server: {
    port: 3000,
    open: false
  }
});
