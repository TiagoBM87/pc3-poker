import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

// base: './' keeps asset paths relative so the build works on GitHub Pages
// regardless of the repository subpath (combined with HashRouter).
export default defineConfig({
  base: './',
  plugins: [react()],
  // Single source of truth for the visible version: package.json.
  // The commit hash comes from the CI env var (VITE_APP_COMMIT).
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
