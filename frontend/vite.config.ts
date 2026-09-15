import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Em desenvolvimento o Vite faz proxy de /api para o backend local;
// em producao o Nginx cumpre esse papel, entao a base da API e sempre "/api".
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Alvo do proxy em desenvolvimento (em producao quem encaminha e o Nginx).
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
