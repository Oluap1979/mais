import { spawn } from 'node:child_process';

// Next.js dev server wrapper to handle flags like --host gracefully in cloud/dev harnesses
const rawArgs = process.argv.slice(2);
const filteredArgs = [];
let host = '0.0.0.0';
let port = '3000';

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === '--host' || arg === '-H') {
    if (rawArgs[i + 1] && !rawArgs[i + 1].startsWith('-')) {
      host = rawArgs[i + 1];
      i++;
    }
  } else if (arg.startsWith('--host=')) {
    host = arg.split('=')[1] || '0.0.0.0';
  } else if (arg === '--port' || arg === '-p') {
    if (rawArgs[i + 1] && !rawArgs[i + 1].startsWith('-')) {
      port = rawArgs[i + 1];
      i++;
    }
  } else if (arg.startsWith('--port=')) {
    port = arg.split('=')[1] || '3000';
  } else {
    filteredArgs.push(arg);
  }
}

const nextArgs = ['dev', '-p', port, '-H', host, ...filteredArgs];

const proc = spawn('next', nextArgs, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

proc.on('exit', (code) => {
  process.exit(code ?? 0);
});
