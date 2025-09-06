import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/chatbot-loader/',
  build: {
    outDir: 'build',
    lib: {
      entry: 'src/main.jsx',
      name: 'SupaChatbotWidget',
      formats: ['umd'],
      fileName: () => 'widget.js',
    },
    rollupOptions: {
      output: {
        globals: {
          react: 'React',
        },
      },
    },
  },
  define: {
    'process.env': {}, // ✅ Prevents "process is not defined" error
  },
  plugins: [react()],
});
