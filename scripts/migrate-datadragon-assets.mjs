import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..');
const dataDragonVersion = '16.17.1';
const compsPath = path.join(root, 'src/data/comps.json');
const manifestPath = path.join(root, 'src/data/asset-manifest.json');
const assetRoot = path.join(root, 'src/assets/game');
const [comps] = await Promise.all([fs.readFile(compsPath, 'utf8').then(JSON.parse)]);

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

const [championData, itemData] = await Promise.all([
  fetchJson(`https://ddragon.leagueoflegends.com/cdn/${dataDragonVersion}/data/zh_CN/tft-champion.json`),
  fetchJson(`https://ddragon.leagueoflegends.com/cdn/${dataDragonVersion}/data/zh_CN/tft-item.json`),
]);

function walk(value, visit) {
  if (Array.isArray(value)) return value.forEach((entry) => walk(entry, visit));
  if (!value || typeof value !== 'object') return;
  visit(value);
  Object.values(value).forEach((entry) => walk(entry, visit));
}

for (const comp of comps) {
  walk(comp, (value) => {
    if (value.asset === 'moba-item:guardbreaker') value.name = '强袭者的链枷';
    if (value.asset !== 'moba-item:fimbulwinter') return;
    if (comp.id === 'apheliguards') value.name = '圣盾使的誓约';
    if (comp.id === 'alune') {
      value.asset = 'moba-item:evenshroud';
      value.name = '薄暮法袍';
    }
  });
}

const used = new Map();
walk(comps, (value) => {
  if (!value.asset || !value.name) return;
  if (!used.has(value.asset)) used.set(value.asset, new Set());
  used.get(value.asset).add(value.name);
});

const champions = Object.values(championData.data);
const items = Object.values(itemData.data);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const safeFile = (value) => value.replace(/[^a-zA-Z0-9._-]/g, '-');

function chooseChampion(names) {
  const name = [...names][0].replace(/（.*?）/g, '').replace(/^永森/, '');
  const candidates = champions.filter((entry) => entry.name === name && /18/.test(entry.id));
  return candidates.find((entry) => entry.id.startsWith('DA_')) || candidates.at(-1) || null;
}

function chooseItem(names) {
  const name = [...names][0];
  const candidates = items.filter((entry) => entry.name === name);
  return candidates.find((entry) => entry.id.startsWith('DA_')) || candidates.at(-1) || null;
}

async function fetchPng(url, target) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 100 || bytes.subarray(1, 4).toString() !== 'PNG') throw new Error(`${url}: not a PNG`);
  await fs.writeFile(target, bytes);
  if (process.platform === 'darwin' && bytes.length > 120_000) {
    await execFileAsync('/usr/bin/sips', ['-Z', '256', target]);
  }
  return fs.readFile(target);
}

const nextManifest = {};
const rights = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  dataDragonVersion,
  assets: {},
};
const cache = new Map();
let official = 0;
let placeholder = 0;

for (const [assetKey, names] of used) {
  const type = assetKey.includes('champion:') ? 'tft-champion' : 'tft-item';
  const entry = type === 'tft-champion' ? chooseChampion(names) : chooseItem(names);
  if (!entry?.image?.full) {
    const fileName = 'asset-pending.svg';
    const bytes = await fs.readFile(path.join(assetRoot, fileName));
    nextManifest[assetKey] = fileName;
    rights.assets[assetKey] = {
      file: fileName,
      displayNames: [...names],
      provider: 'project-placeholder',
      publishStatus: 'placeholder-safe',
      note: 'No matching active-set asset was listed in Riot Data Dragon 16.17.1.',
      sha256: sha256(bytes),
    };
    placeholder += 1;
    continue;
  }

  const fileName = `ddragon-${safeFile(entry.id)}.png`;
  const url = `https://ddragon.leagueoflegends.com/cdn/${dataDragonVersion}/img/${type}/${encodeURIComponent(entry.image.full)}`;
  let bytes = cache.get(fileName);
  if (!bytes) {
    bytes = await fetchPng(url, path.join(assetRoot, fileName));
    cache.set(fileName, bytes);
  }
  nextManifest[assetKey] = fileName;
  rights.assets[assetKey] = {
    file: fileName,
    displayNames: [...names],
    provider: 'Riot Data Dragon',
    sourceUrl: url,
    upstreamApiName: entry.id,
    publishStatus: 'official-developer-asset',
    rightsHolder: 'Riot Games or applicable rights holder',
    bytes: bytes.length,
    sha256: sha256(bytes),
  };
  official += 1;
}

const referencedFiles = new Set(Object.values(nextManifest));
for (const fileName of await fs.readdir(assetRoot)) {
  if (referencedFiles.has(fileName)) continue;
  await fs.unlink(path.join(assetRoot, fileName));
}

await fs.writeFile(compsPath, `${JSON.stringify(comps, null, 2)}\n`);
await fs.writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`);
await fs.writeFile(path.join(root, 'data/asset-rights.json'), `${JSON.stringify(rights, null, 2)}\n`);
console.log(JSON.stringify({ totalKeys: used.size, official, placeholder, uniqueFiles: referencedFiles.size }));
