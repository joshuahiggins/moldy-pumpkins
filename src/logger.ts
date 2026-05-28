/** Minimal structured logger: one JSON object per line on stdout. */

type Fields = Record<string, unknown>;

export function format(level: string, message: string, fields: Fields = {}): string {
  return JSON.stringify({ level, message, ...fields });
}

function emit(level: string, message: string, fields?: Fields): void {
  process.stdout.write(`${format(level, message, fields)}\n`);
}

export const info = (message: string, fields?: Fields): void => emit('info', message, fields);
export const warn = (message: string, fields?: Fields): void => emit('warn', message, fields);
export const error = (message: string, fields?: Fields): void => emit('error', message, fields);
