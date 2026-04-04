import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const androidProjectDir = path.join(projectRoot, 'android-twa');
const sdkPath = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '';
const gradleCommand = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const gradleUserHome = path.join(androidProjectDir, '.gradle-home');

const run = (command, args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code}`));
    });
    child.on('error', reject);
  });

try {
  await fs.access(path.join(androidProjectDir, gradleCommand));
} catch {
  throw new Error('TWA project not found. Run "npm run twa:generate" first.');
}

if (!sdkPath) {
  throw new Error(
    'ANDROID_HOME or ANDROID_SDK_ROOT is not configured. Install the Android SDK and rerun this build.',
  );
}

const localPropertiesPath = path.join(androidProjectDir, 'local.properties');
await fs.writeFile(localPropertiesPath, `sdk.dir=${sdkPath.replace(/\\/g, '\\\\')}\n`, 'utf8');
await fs.mkdir(gradleUserHome, { recursive: true });
process.env.GRADLE_USER_HOME = gradleUserHome;

await run(gradleCommand, ['assembleRelease', 'bundleRelease'], androidProjectDir);
