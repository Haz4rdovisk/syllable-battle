import fs from 'node:fs/promises';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import packageJson from './package.json';
import { createBattleLayoutPresetSource } from './src/components/screens/BattleLayoutConfig';
import { createRawDeckDefinitionSource } from './src/data/content/editor';
import { buildContentPipeline } from './src/data/content';
import { getRawDeckCatalogEntry, rawDeckCatalogEntries } from './src/data/content/decks';
import type { RawDeckDefinition } from './src/data/content/types';

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

          server.middlewares.use('/__content-editor/deck', async (req, res, next) => {
            if (req.method !== 'POST') {
              next();
              return;
            }

            try {
              let body = '';
              for await (const chunk of req) {
                body += chunk;
              }

              const payload = JSON.parse(body || '{}') as {
                deckId?: string;
                deck?: RawDeckDefinition;
              };
              const deckId = payload.deckId?.trim();
              if (!deckId || !payload.deck) {
                throw new Error('Missing deckId or deck payload.');
              }

              if (payload.deck.id !== deckId) {
                throw new Error('The payload deck id must match the requested deckId.');
              }

              const entry = getRawDeckCatalogEntry(deckId);
              if (!entry) {
                throw new Error(`Unknown deck "${deckId}".`);
              }

              const rawDecks = rawDeckCatalogEntries.map((currentEntry) =>
                currentEntry.id === deckId ? payload.deck! : currentEntry.deck,
              );
              buildContentPipeline(rawDecks);

              const source = createRawDeckDefinitionSource(entry.exportName, payload.deck);
              const absolutePath = path.resolve(__dirname, entry.filePath);
              await fs.writeFile(absolutePath, source, 'utf8');
              entry.deck = payload.deck;

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ok: true,
                  path: absolutePath,
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
                      : 'Failed to write content deck source.',
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
