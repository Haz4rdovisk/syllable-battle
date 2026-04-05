import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const apkPath =
  process.env.ANDROID_APP_APK_PATH ||
  path.join(projectRoot, 'artifacts', 'android-webview', 'app-debug.apk');
const sdkPath = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '';
const adbPath =
  process.platform === 'win32'
    ? path.join(sdkPath, 'platform-tools', 'adb.exe')
    : path.join(sdkPath, 'platform-tools', 'adb');

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
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

if (!sdkPath) {
  throw new Error('ANDROID_HOME or ANDROID_SDK_ROOT is not configured.');
}

await fs.access(apkPath);
await run(adbPath, ['install', '-r', apkPath]);

console.log(`Installed ${apkPath}`);
