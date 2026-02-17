#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch (error) {
    console.error(`Failed to load ${envPath}:`, error);
    process.exit(1);
  }
}

const turboArgs = process.argv.slice(2);
if (turboArgs.length === 0) {
  console.error('Usage: node scripts/turbo-with-root-env.mjs <turbo args>');
  process.exit(1);
}

const turboBin = resolve(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'turbo.cmd' : 'turbo'
);
const command = existsSync(turboBin) ? turboBin : 'turbo';

const child = spawn(command, turboArgs, {
  stdio: 'inherit',
  env: process.env
});

child.on('error', (error) => {
  console.error('Failed to start turbo:', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
