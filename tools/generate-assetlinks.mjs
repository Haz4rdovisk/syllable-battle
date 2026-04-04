import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { DigitalAssetLinks, TwaManifest } from '@bubblewrap/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const twaManifestPath = path.join(projectRoot, 'android-twa', 'twa-manifest.json');
const publicWellKnownDir = path.join(projectRoot, 'public', '.well-known');
const docsDir = path.join(projectRoot, 'android-twa');

const toFingerprint = (output) => {
  const match =
    output.match(/SHA256:\s*([0-9A-F:]+)/i) ||
    output.match(/SHA-256:\s*([0-9A-F:]+)/i);
  return match?.[1] ?? null;
};

const twaManifest = await TwaManifest.fromFile(twaManifestPath);
const configuredFingerprints = (twaManifest.fingerprints || [])
  .map((entry) => entry.value?.trim())
  .filter(Boolean);

let fingerprint = process.env.TWA_CERT_SHA256?.trim() || configuredFingerprints[0] || null;

if (!fingerprint && process.env.TWA_KEYSTORE_PASSWORD) {
  const keytoolOutput = execFileSync(
    'keytool',
    [
      '-list',
      '-v',
      '-keystore',
      path.resolve(path.dirname(twaManifestPath), twaManifest.signingKey.path),
      '-alias',
      twaManifest.signingKey.alias,
      '-storepass',
      process.env.TWA_KEYSTORE_PASSWORD,
    ],
    { encoding: 'utf8' },
  );
  fingerprint = toFingerprint(keytoolOutput);
}

await fs.mkdir(docsDir, { recursive: true });

if (!fingerprint) {
  const template = {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: twaManifest.packageId,
      sha256_cert_fingerprints: ['PASTE_SHA256_CERT_FINGERPRINT_HERE'],
    },
  };
  await fs.writeFile(
    path.join(docsDir, 'assetlinks.template.json'),
    JSON.stringify([template], null, 2),
  );
  console.log('No signing fingerprint available yet. Wrote android-twa/assetlinks.template.json');
  process.exit(0);
}

await fs.mkdir(publicWellKnownDir, { recursive: true });
const assetLinks = DigitalAssetLinks.generateAssetLinks(
  twaManifest.packageId,
  fingerprint,
);
await fs.writeFile(path.join(publicWellKnownDir, 'assetlinks.json'), assetLinks);
console.log('Generated public/.well-known/assetlinks.json');
