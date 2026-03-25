import fs from 'node:fs/promises';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import packageJson from './package.json';
import { createBattleLayoutPresetSource } from './src/components/screens/BattleLayoutConfig';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const buildCommit =
    env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.RENDER_GIT_COMMIT ||
    env.RENDER_GIT_COMMIT ||
    packageJson.version;
  const battleLayoutPresetPath = path.resolve(
    __dirname,
    'src/components/screens/BattleLayoutPreset.ts',
  );

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'battle-layout-preset-writer',
        configureServer(server) {
          server.middlewares.use('/__battle-layout/preset', async (req, res, next) => {
            if (req.method !== 'POST') {
              next();
              return;
            }

            try {
              let body = '';
              for await (const chunk of req) {
                body += chunk;
              }

              const payload = JSON.parse(body || '{}') as { overrides?: unknown };
              const source = createBattleLayoutPresetSource(
                (payload.overrides ?? {}) as Parameters<
                  typeof createBattleLayoutPresetSource
                >[0],
              );

              await fs.writeFile(battleLayoutPresetPath, source, 'utf8');

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ok: true,
                  path: battleLayoutPresetPath,
                }),
              );
            } catch (error) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ok: false,
                  error:
                    error instanceof Error
                      ? error.message
                      : 'Failed to write battle layout preset.',
                }),
              );
            }
          });
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      __APP_BUILD__: JSON.stringify(buildCommit),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 3000,
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify: file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
