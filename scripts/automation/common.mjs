import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const projectRoot = path.resolve(import.meta.dirname, '../..');

export function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) args[key] = true;
    else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

export async function readJson(relativePath) {
  const filePath = path.resolve(projectRoot, relativePath);
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

export async function writeJsonAtomic(filePath, value) {
  const absolutePath = path.resolve(projectRoot, filePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  const temporaryPath = `${absolutePath}.${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(temporaryPath, absolutePath);
  return absolutePath;
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function byteLength(value) {
  return Buffer.byteLength(value, 'utf8');
}

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function parseIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysBetween(earlier, later = new Date()) {
  return Math.floor((later.getTime() - earlier.getTime()) / 86_400_000);
}

export function unique(values) {
  return new Set(values).size === values.length;
}
