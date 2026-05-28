/**
 * Local entry point: loads a `.env` for convenience, then runs the handler once
 * and prints the summary. The deployed Lambda uses `index.handler` directly and
 * never touches dotenv.
 */
import { config as loadEnv } from 'dotenv';
import { handler } from './index.js';

loadEnv();

try {
  const summary = await handler();
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
