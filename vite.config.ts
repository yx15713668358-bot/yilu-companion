import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => {
  const singleFile = mode === 'single';
  return {
    base: './',
    define: { __SINGLE_FILE__: JSON.stringify(singleFile) },
    plugins: [react(), ...(singleFile ? [viteSingleFile()] : [])],
    build: {
      assetsInlineLimit: singleFile ? 100_000_000 : 4_096,
      cssCodeSplit: !singleFile,
      sourcemap: false,
      target: 'es2022',
      chunkSizeWarningLimit: 600,
    },
  };
});
