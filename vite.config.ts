// vite.config.ts
import {defineConfig, Plugin} from 'vite';
import {createVtseditorApp} from './register.js';

/**
 * Express middleware. The whole backend now lives in
 * `register.ts` (`createVtseditorApp`) so it can be reused in-process by a
 * host such as pkgstudio; here we just build the app from the standalone
 * env (`VTSEDITOR_PROJECT_ROOT` / `VTSEDITOR_CONFIG_FILE`), pass the Vite
 * dev server so the IDE-plugin WebSocket is wired, and mount it as Vite
 * middleware at `/`.
 */
function expressMiddleware(): Plugin {
    return {
        name: 'vite-express-middleware',
        configureServer(server) {
            const app = createVtseditorApp({
                projectRoot: process.env.VTSEDITOR_PROJECT_ROOT ?? process.cwd(),
                configFile: process.env.VTSEDITOR_CONFIG_FILE,
                server
            });

            server.middlewares.use(app);
        }
    };
}

export default defineConfig({
    plugins: [
        expressMiddleware()
    ]
});
