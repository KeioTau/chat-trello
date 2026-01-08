
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // On définit les deux fichiers HTML comme points d'entrée
        main: './index.html',
        connector: './connector.html'
      }
    }
  }
});
