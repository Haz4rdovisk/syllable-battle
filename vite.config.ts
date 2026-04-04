import fs from 'node:fs/promises';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import packageJson from './package.json';
import { createBattleLayoutPresetSource } from './src/components/screens/BattleLayoutConfig';
import {
  createRawDeckCatalogIndexSource,
  createRawDeckDefinitionSource,
  createRawTargetCatalogSource,
  removeRawDeckFromCatalog,
  RAW_TARGET_CATALOG_FILE_PATH,
  upsertRawDeckInCatalog,
  validateContentDeckSaveEntry,
} from './src/data/content/editor';
import { buildContentPipeline } from './src/data/content';
import { getRawDeckCatalogEntry, rawDeckCatalogEntries } from './src/data/content/decks';
import { rawTargetCatalog } from './src/data/content/targets';
import type { RawDeckDefinition, RawTargetDefinition } from './src/data/content/types';
import type { RawDeckCatalogEntry } from './src/data/content/decks';

const APP_THEME_COLOR = '#1a1a1a';
const APP_NAME = 'SpellCast';
const APP_SHORT_NAME = 'SpellCast';

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
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        manifestFilename: 'manifest.webmanifest',
        includeAssets: [
          'icons/icon-192.png',
          'icons/icon-512.png',
          'icons/icon-maskable-192.png',
          'icons/icon-maskable-512.png',
          'icons/apple-touch-icon.png',
          'icons/icon.svg',
          'icons/icon-maskable.svg',
        ],
        manifest: {
          id: '/',
          name: APP_NAME,
          short_name: APP_SHORT_NAME,
          description:
            'Card game fantasy em landscape com duelos, decks tematicos e multiplayer remoto.',
          start_url: '/',
          scope: '/',
          display: 'fullscreen',
          display_override: ['fullscreen', 'standalone'],
          orientation: 'landscape',
          background_color: APP_THEME_COLOR,
          theme_color: APP_THEME_COLOR,
          lang: 'pt-BR',
          categories: ['games', 'entertainment'],
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-maskable-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallback: 'index.html',
          skipWaiting: true,
        },
      }),
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
                action?: 'save' | 'delete';
                previousDeckId?: string;
                deckId?: string;
                entry?: RawDeckCatalogEntry;
                deck?: RawDeckDefinition;
                targetCatalog?: RawTargetDefinition[];
              };
              const action = payload.action ?? 'save';

              if (action === 'delete') {
                const deckId = payload.deckId?.trim();
                if (!deckId) {
                  throw new Error('Missing deck id for dev-only delete.');
                }

                if (rawDeckCatalogEntries.length <= 1) {
                  throw new Error('Cannot delete the last remaining deck.');
                }

                const existingEntry = getRawDeckCatalogEntry(deckId);
                if (!existingEntry) {
                  throw new Error(`Deck "${deckId}" does not exist in the persisted raw catalog.`);
                }

                const nextEntries = removeRawDeckFromCatalog(rawDeckCatalogEntries, deckId);
                buildContentPipeline(nextEntries.map((entry) => entry.deck), rawTargetCatalog);

                const decksDirectoryPath = path.resolve(__dirname, 'src/data/content/decks');
                const absolutePath = path.resolve(__dirname, existingEntry.filePath);
                if (!isPathInsideDirectory(decksDirectoryPath, absolutePath)) {
                  throw new Error(`Deck "${deckId}" resolved outside the allowed decks directory.`);
                }
                const indexSource = createRawDeckCatalogIndexSource(nextEntries);
                const indexPath = path.resolve(decksDirectoryPath, 'index.ts');
                if (!isPathInsideDirectory(decksDirectoryPath, indexPath)) {
                  throw new Error('The raw deck index resolved outside the allowed decks directory.');
                }

                const previousDeckSource = await fs.readFile(absolutePath, 'utf8');
                const previousIndexSource = await fs.readFile(indexPath, 'utf8');
                const nextIndexWrite = await writeTextFileSafely(indexPath, indexSource);
                let deckDeleted = false;
                let indexCommitted = false;

                try {
                  await fs.rm(absolutePath, { force: true });
                  deckDeleted = true;
                  await nextIndexWrite.commit();
                  indexCommitted = true;
                } catch (error) {
                  if (deckDeleted) {
                    await fs.writeFile(absolutePath, previousDeckSource, 'utf8');
                  }
                  if (indexCommitted) {
                    await fs.writeFile(indexPath, previousIndexSource, 'utf8');
                  }
                  throw error;
                } finally {
                  await nextIndexWrite.cleanup();
                }

                rawDeckCatalogEntries.splice(0, rawDeckCatalogEntries.length, ...nextEntries);

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    ok: true,
                    indexPath,
                  }),
                );
                return;
              }

              const deckId = payload.entry?.id?.trim();
              if (!deckId || !payload.deck || !payload.entry || !Array.isArray(payload.targetCatalog)) {
                throw new Error('Missing deck entry metadata or deck payload.');
              }
              const previousDeckId = payload.previousDeckId?.trim();

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

              if (previousDeckId && previousDeckId !== deckId && getRawDeckCatalogEntry(deckId)) {
                throw new Error(`Deck "${deckId}" already exists in the persisted raw catalog.`);
              }

              const baseEntries =
                previousDeckId && previousDeckId !== deckId
                  ? removeRawDeckFromCatalog(rawDeckCatalogEntries, previousDeckId)
                  : rawDeckCatalogEntries;
              const previousEntry =
                previousDeckId && previousDeckId !== deckId ? getRawDeckCatalogEntry(previousDeckId) : null;
              const nextEntries = upsertRawDeckInCatalog(baseEntries, nextEntry);
              const nextTargetCatalog = payload.targetCatalog.map((target) => ({
                ...target,
                syllables: [...target.syllables],
              }));
              buildContentPipeline(nextEntries.map((entry) => entry.deck), nextTargetCatalog);

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
              const targetCatalogPath = path.resolve(__dirname, RAW_TARGET_CATALOG_FILE_PATH);
              const targetCatalogSource = createRawTargetCatalogSource(nextTargetCatalog);
              const previousPath =
                previousEntry && previousEntry.filePath !== nextEntry.filePath
                  ? path.resolve(__dirname, previousEntry.filePath)
                  : null;
              if (previousPath && !isPathInsideDirectory(decksDirectoryPath, previousPath)) {
                throw new Error(`Deck "${previousDeckId}" resolved outside the allowed decks directory.`);
              }

              const previousDeckSource = await fs.readFile(absolutePath, 'utf8').catch(() => null);
              const previousDeckSourceAtOldPath =
                previousPath && previousPath !== absolutePath
                  ? await fs.readFile(previousPath, 'utf8').catch(() => null)
                  : null;
              const previousIndexSource = await fs.readFile(indexPath, 'utf8');
              const previousTargetCatalogSource = await fs.readFile(targetCatalogPath, 'utf8');
              const nextDeckWrite = await writeTextFileSafely(absolutePath, source);
              const nextIndexWrite = await writeTextFileSafely(indexPath, indexSource);
              const nextTargetCatalogWrite = await writeTextFileSafely(targetCatalogPath, targetCatalogSource);
              let deckCommitted = false;
              let indexCommitted = false;
              let targetCatalogCommitted = false;
              let previousDeckRemoved = false;

              try {
                await nextDeckWrite.commit();
                deckCommitted = true;
                if (previousPath && previousPath !== absolutePath && previousDeckSourceAtOldPath !== null) {
                  await fs.rm(previousPath, { force: true });
                  previousDeckRemoved = true;
                }
                await nextTargetCatalogWrite.commit();
                targetCatalogCommitted = true;
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
                if (previousDeckRemoved && previousPath && previousDeckSourceAtOldPath !== null) {
                  await fs.writeFile(previousPath, previousDeckSourceAtOldPath, 'utf8');
                }
                if (targetCatalogCommitted) {
                  await fs.writeFile(targetCatalogPath, previousTargetCatalogSource, 'utf8');
                }
                if (indexCommitted) {
                  await fs.writeFile(indexPath, previousIndexSource, 'utf8');
                }
                throw error;
              } finally {
                await nextDeckWrite.cleanup();
                await nextIndexWrite.cleanup();
                await nextTargetCatalogWrite.cleanup();
              }

              rawDeckCatalogEntries.splice(0, rawDeckCatalogEntries.length, ...nextEntries);
              rawTargetCatalog.splice(0, rawTargetCatalog.length, ...nextTargetCatalog);

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
