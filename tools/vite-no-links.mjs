import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const viteBin = path.resolve(rootDir, "node_modules", "vite", "bin", "vite.js");

const stripAnsi = (line) =>
  line.replace(
    // eslint-disable-next-line no-control-regex
    /\u001B\[[0-9;]*m/g,
    "",
  );

const shouldHideLine = (line) => {
  const normalized = stripAnsi(line).trimStart();
  return (
    normalized.includes("Local:") ||
    normalized.includes("Network:") ||
    normalized.includes("press h + enter to show help")
  );
};

const printCommands = () => {
  process.stdout.write("\n");
  process.stdout.write("Use os scripts canonicos do Edge:\n");
  process.stdout.write("  npm run edge:app\n");
  process.stdout.write("  npm run edge:editor\n");
  process.stdout.write("  npm run edge:debug\n");
  process.stdout.write("\n");
};

const forwardStream = (stream, target) => {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!shouldHideLine(line)) {
        target.write(`${line}\n`);
      }
    }
  });
  stream.on("end", () => {
    if (buffer && !shouldHideLine(buffer)) {
      target.write(buffer);
    }
  });
};

printCommands();

const child = spawn(process.execPath, [viteBin], {
  cwd: rootDir,
  env: process.env,
  stdio: ["inherit", "pipe", "pipe"],
});

forwardStream(child.stdout, process.stdout);
forwardStream(child.stderr, process.stderr);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
