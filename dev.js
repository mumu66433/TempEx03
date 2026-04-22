const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn, spawnSync } = require('child_process');

const rootDir = __dirname;
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const minimumNodeMajor = 18;

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function runSync(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function fileExists(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

function ensureNodeVersion() {
  const major = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (Number.isNaN(major) || major < minimumNodeMajor) {
    fail(`Node.js ${minimumNodeMajor}+ is required. Current version: ${process.versions.node}`);
  }
}

function ensureNpmAvailable() {
  const result = spawnSync(npmCommand, ['--version'], {
    cwd: rootDir,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });

  if (result.error || result.status !== 0) {
    fail('npm is required but was not found on PATH.');
  }
}

function ensureServerEnvFile() {
  const envPath = path.join(rootDir, 'server', '.env');
  const examplePath = path.join(rootDir, 'server', '.env.example');

  if (!fileExists(envPath) && fileExists(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    log('[setup] created server/.env from server/.env.example');
  }
}

function needsInstall() {
  return !fileExists(path.join(rootDir, 'node_modules')) || !fileExists(path.join(rootDir, 'package-lock.json'));
}

function installDependencies() {
  log('[setup] installing dependencies...');
  const result = runSync(npmCommand, ['install']);
  if (result.status !== 0) {
    fail('[setup] npm install failed.');
  }
}

function generatePrismaClient() {
  log('[setup] generating Prisma client...');
  const result = runSync(npmCommand, ['run', 'db:generate', '--workspace', 'server']);
  if (result.status !== 0) {
    fail('[setup] prisma generate failed.');
  }
}

function createPrefixedStream(stream, prefix) {
  const rl = readline.createInterface({ input: stream });
  rl.on('line', (line) => {
    process.stdout.write(`${prefix} ${line}\n`);
  });
}

function startWorkspace(name, args, cwd) {
  const child = spawn(npmCommand, args, {
    cwd,
    env: process.env,
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  createPrefixedStream(child.stdout, `[${name}]`);
  createPrefixedStream(child.stderr, `[${name}]`);

  return child;
}

function stopChildren(children) {
  for (const child of children) {
    if (!child || child.killed) {
      continue;
    }

    child.kill('SIGTERM');
  }
}

async function main() {
  ensureNodeVersion();
  ensureNpmAvailable();
  ensureServerEnvFile();

  if (needsInstall()) {
    installDependencies();
  }

  generatePrismaClient();

  let shuttingDown = false;
  const children = [
    startWorkspace('server', ['run', 'dev', '--workspace', 'server'], rootDir),
    startWorkspace('client', ['run', 'dev', '--workspace', 'client'], rootDir),
  ];

  for (const child of children) {
    child.on('exit', (code, signal) => {
      if (shuttingDown) {
        return;
      }

      if (signal) {
        log(`[setup] ${signal} received from child process`);
      } else {
        log(`[setup] child process exited with code ${code}`);
      }
      stopChildren(children.filter((candidate) => candidate !== child));
      process.exit(code ?? 1);
    });
  }

  const shutdown = (signal) => {
    shuttingDown = true;
    log(`\n[setup] received ${signal}, shutting down...`);
    stopChildren(children);
    setTimeout(() => process.exit(0), 500).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  fail(`[setup] ${error.message || error}`);
});
