import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// A câmera só funciona em contexto seguro (HTTPS ou localhost).
// Para testar no celular pela rede local: `npm run dev:https` e abra https://<ip-do-pc>:5173
const https = process.env.HTTPS === '1';

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(https ? [basicSsl()] : [])],
  server: {
    proxy: {
      '/api': process.env.API_URL ?? 'http://localhost:3333',
    },
  },
});
