import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * En développement, sert les fonctions `api/*.js` (format Vercel) directement
 * depuis Vite : `npm run dev` suffit, sans `vercel dev`.
 */
function apiLocale(): Plugin {
  return {
    name: 'api-locale',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const m = req.url?.match(/^\/api\/([a-z-]+)(?:\?.*)?$/);
        if (!m) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${m[1]}.js`);
          let corps = '';
          for await (const morceau of req) corps += morceau;
          const r = req as typeof req & { body?: unknown; query?: Record<string, string> };
          r.body = corps ? JSON.parse(corps) : {};
          r.query = Object.fromEntries(new URL(req.url!, 'http://local').searchParams);
          const s = res as typeof res & { status: (c: number) => typeof s; json: (o: unknown) => void };
          s.status = (c) => { res.statusCode = c; return s; };
          s.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
          await mod.default(r, s);
        } catch (e) {
          console.error('[api-locale]', e);
          res.statusCode = 500;
          res.end(JSON.stringify({ erreur: 'erreur_interne' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Expose aussi les variables serveur (sans préfixe VITE_) aux fonctions locales.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return { plugins: [react(), tailwindcss(), apiLocale()] };
});
