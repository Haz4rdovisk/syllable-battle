import fs from 'node:fs/promises';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import packageJson from './package.json';
import { createBattleLayoutPresetSource } from './src/components/screens/BattleLayoutConfig';
import {
  createRawDeckCatalogIndexSource,
  createRawDeckDefinitionSource,
  upsertRawDeckInCatalog,
  validateContentDeckSaveEntry,
} from './src/data/content/editor';
import { buildContentPipeline } from './src/data/content';
import { getRawDeckCatalogEntry, rawDeckCatalogEntries } from './src/data/content/decks';
import type { RawDeckDefinition } from './src/data/content/types';
import type { RawDeckCatalogEntry } from './src/data/content/decks';

const isPathInsideDirectory = (directoryPath: string, candidatePath: string) => {
  const relativePath = path.relative(directoryPath, candidatePath);
  return relativePath.length > 0 && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
};

const writeTextFileSafely = async (targetPath: string, contents: string) => {
  const tempPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tempPath, contents, 'utf8');
  return {
    tempPath,
    commit: async () => {
      await fs.rename(tempPath, targetPath);
    },
    cleanup: async () => {
      await fs.rm(tempPath, { force: true });
    },
  };
};

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
                entry?: RawDeckCatalogEntry;
                deck?: RawDeckDefinition;
              };
              const deckId = payload.entry?.id?.trim();
              if (!deckId || !payload.deck || !payload.entry) {
                throw new Error('Missing deck entry metadata or deck payload.');
              }

              const nextEntry = validateContentDeckSaveEntry({
                id: deckId,
                exportName: payload.entry.exportName,
                filePath: payload.entry.filePath,
                deck: payload.deck,
              });

              const existingEntry = getRawDeckCatalogEntry(deckId);
              if (
                existingEntry &&
                (existingEntry.exportName !== nextEntry.exportName ||
                  existingEntry.filePath !== nextEntry.filePath)
              ) {
                throw new Error(`Deck "${deckId}" already exists with different source metadata.`);
              }

              const nextEntries = upsertRawDeckInCatalog(rawDeckCatalogEntries, nextEntry);
              buildContentPipeline(nextEntries.map((entry) => entry.deck));

              const source = createRawDeckDefinitionSource(nextEntry.exportName, payload.deck);
              const decksDirectoryPath = path.resolve(__dirname, 'src/data/content/decks');
              const absolutePath = path.resolve(__dirname, nextEntry.filePath);
              if (!isPathInsideDirectory(decksDirectoryPath, absolutePath)) {
                throw new Error(`Deck "${deckId}" resolved outside the allowed decks directory.`);
              }
              const indexSource = createRawDeckCatalogIndexSource(nextEntries);
              const indexPath = path.resolve(decksDirectoryPath, 'index.ts');
              if (!isPathInsideDirectory(decksDirectoryPath, indexPath)) {
                throw new Error('The raw deck index resolved outside the allowed decks directory.');
              }

              const previousDeckSource = await fs.readFile(absolutePath, 'utf8').catch(() => null);
              const previousIndexSource = await fs.readFile(indexPath, 'utf8');
              const nextDeckWrite = await writeTextFileSafely(absolutePath, source);
              const nextIndexWrite = await writeTextFileSafely(indexPath, indexSource);
              let deckCommitted = false;
              let indexCommitted = false;

              try {
                await nextDeckWrite.commit();
                deckCommitted = true;
                await nextIndexWrite.commit();
                indexCommitted = true;
              } catch (error) {
                if (deckCommitted) {
                  if (previousDeckSource === null) {
                    await fs.rm(absolutePath, { force: true });
                  } else {
                    await fs.writeFile(absolutePath, previousDeckSource, 'utf8');
                  }
                }
                if (indexCommitted) {
                  await fs.writeFile(indexPath, previousIndexSource, 'utf8');
                }
                throw error;
              } finally {
                await nextDeckWrite.cleanup();
                await nextIndexWrite.cleanup();
              }

              const currentIndex = rawDeckCatalogEntries.findIndex((entry) => entry.id === deckId);
              if (currentIndex >= 0) {
                rawDeckCatalogEntries[currentIndex] = nextEntry;
              } else {
                rawDeckCatalogEntries.push(nextEntry);
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ok: true,
                  path: absolutePath,
                  indexPath,
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
