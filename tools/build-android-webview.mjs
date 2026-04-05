import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const sourceAndroidDir = path.join(projectRoot, 'android-app');
const artifactsDir = path.join(projectRoot, 'artifacts', 'android-webview');

const defaultBuildDir =
  process.platform === 'win32'
    ? 'C:\\Android\\spellcast-webview-build'
    : sourceAndroidDir;
const buildAndroidDir = process.env.ANDROID_APP_BUILD_DIR || defaultBuildDir;
const gradleUserHome =
  process.env.GRADLE_USER_HOME ||
  (process.platform === 'win32'
    ? 'C:\\Android\\gradle-home-spellcast-webview'
    : path.join(sourceAndroidDir, '.gradle-home'));
const androidUserHome =
  process.env.ANDROID_USER_HOME ||
  (process.platform === 'win32'
    ? 'C:\\Android\\android-user-home-spellcast-webview\\.android'
    : path.join(sourceAndroidDir, '.android-home'));
const gradleTasks = (process.env.ANDROID_GRADLE_TASKS || 'assembleDebug')
  .split(/\s+/)
  .filter(Boolean);
const gradleCommand = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const sdkPath = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '';

const escapeLocalPropertiesPath = (input) => input.replace(/\\/g, '\\\\').replace(/:/g, '\\:');

const run = (command, args, cwd, env) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
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

const prepareBuildDirectory = async () => {
  if (path.resolve(buildAndroidDir) === path.resolve(sourceAndroidDir)) {
    return sourceAndroidDir;
  }

  await fs.rm(buildAndroidDir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(buildAndroidDir), { recursive: true });
  await fs.cp(sourceAndroidDir, buildAndroidDir, { recursive: true });
  return buildAndroidDir;
};

const copyArtifactIfExists = async (sourcePath, targetName) => {
  try {
    await fs.access(sourcePath);
  } catch {
    return;
  }

  await fs.mkdir(artifactsDir, { recursive: true });
  await fs.copyFile(sourcePath, path.join(artifactsDir, targetName));
};

if (!sdkPath) {
  throw new Error('ANDROID_HOME or ANDROID_SDK_ROOT is not configured.');
}

const workingAndroidDir = await prepareBuildDirectory();
await fs.mkdir(gradleUserHome, { recursive: true });
await fs.mkdir(androidUserHome, { recursive: true });
await fs.writeFile(
  path.join(workingAndroidDir, 'local.properties'),
  `sdk.dir=${escapeLocalPropertiesPath(sdkPath)}\n`,
  'utf8',
);

const env = {
  ...process.env,
  GRADLE_USER_HOME: gradleUserHome,
  ANDROID_USER_HOME: androidUserHome,
  ANDROID_SDK_HOME: path.dirname(androidUserHome),
  HOME: path.dirname(androidUserHome),
  USERPROFILE: path.dirname(androidUserHome),
};

await run(gradleCommand, gradleTasks, workingAndroidDir, env);

await copyArtifactIfExists(
  path.join(workingAndroidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
  'app-debug.apk',
);
await copyArtifactIfExists(
  path.join(workingAndroidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk'),
  'app-release-unsigned.apk',
);
await copyArtifactIfExists(
  path.join(workingAndroidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab'),
  'app-release.aab',
);

console.log(`Android WebView build finished in ${workingAndroidDir}`);
