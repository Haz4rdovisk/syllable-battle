import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BufferedLog, ConsoleLog, TwaGenerator, TwaManifest } from '@bubblewrap/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'android-twa');

const normalizeBaseUrl = (input) => {
  const url = new URL(input);
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  url.search = '';
  url.hash = '';
  return url;
};

const baseUrl = normalizeBaseUrl(
  process.env.TWA_WEB_BASE_URL || 'https://syllable-battle.vercel.app',
);
const manifestUrl = new URL('manifest.webmanifest', baseUrl);

const response = await fetch(manifestUrl);
if (!response.ok) {
  throw new Error(
    `Remote manifest not reachable at ${manifestUrl}. Deploy the updated web app first.`,
  );
}

const twaManifest = await TwaManifest.fromWebManifest(manifestUrl.toString());
twaManifest.packageId =
  process.env.TWA_ANDROID_PACKAGE_ID || 'com.syllablebattle.deckmaster';
twaManifest.host = baseUrl.host;
twaManifest.name = 'SpellCast';
twaManifest.launcherName = 'SpellCast';
twaManifest.display = 'fullscreen-sticky';
twaManifest.orientation = 'landscape';
twaManifest.startUrl = '/';
twaManifest.webManifestUrl = manifestUrl;
twaManifest.appVersionCode = Number.parseInt(
  process.env.TWA_ANDROID_VERSION_CODE || '1',
  10,
);
twaManifest.appVersionName = process.env.TWA_ANDROID_VERSION_NAME || '1.0.0';
twaManifest.enableNotifications = false;
twaManifest.navigationColor = twaManifest.themeColor;
twaManifest.navigationColorDark = twaManifest.themeColorDark;
twaManifest.navigationDividerColor = twaManifest.themeColor;
twaManifest.navigationDividerColorDark = twaManifest.themeColorDark;
twaManifest.generatorApp = '@bubblewrap/core';
twaManifest.signingKey = {
  path: process.env.TWA_SIGNING_KEY_PATH || './syllable-battle-upload-key.jks',
  alias: process.env.TWA_SIGNING_KEY_ALIAS || 'syllablebattle',
};
twaManifest.additionalTrustedOrigins = (process.env.TWA_ADDITIONAL_TRUSTED_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const validationError = twaManifest.validate();
if (validationError) {
  throw new Error(`Invalid TWA manifest: ${validationError}`);
}

await fs.mkdir(outputDir, { recursive: true });
await twaManifest.saveToFile(path.join(outputDir, 'twa-manifest.json'));

const log = new BufferedLog(new ConsoleLog('Bubblewrap'));
const generator = new TwaGenerator();
await generator.createTwaProject(outputDir, twaManifest, log);
log.flush();

console.log(`Generated TWA project in ${outputDir}`);
