import { defineConfig, loadEnv } from 'vite';

/* Em desenvolvimento, o front chama "/api/..." na própria origem e o Vite encaminha para o back.
   Assim não depende do CORS do back (que hoje só libera origens com "/" no final, o que o navegador nunca envia). */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  };
});
