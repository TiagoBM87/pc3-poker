import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps asset paths relative so the build works on GitHub Pages
// regardless of the repository subpath (combined with HashRouter).
export default defineConfig({
  base: './',
  plugins: [react()],
});
