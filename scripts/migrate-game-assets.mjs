import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const patch = '16.17.1';
const cdragonVersion = '16.17';
const compsPath = path.join(root, 'src/data/comps.json');
const manifestPath = path.join(root, 'src/data/asset-manifest.json');
const assetRoot = path.join(root, 'src/assets/game');
const [comps, manifest] = await Promise.all([
  fs.readFile(compsPath, 'utf8').then(JSON.parse),
  fs.readFile(manifestPath, 'utf8').then(JSON.parse),
]);

const json = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
};
const [championData, itemData, cdragon] = await Promise.all([
  json(`https://ddragon.leagueoflegends.com/cdn/${patch}/data/zh_CN/tft-champion.json`),
  json(`https://ddragon.leagueoflegends.com/cdn/${patch}/data/zh_CN/tft-item.json`),
  json(`https://raw.communitydragon.org/${cdragonVersion}/cdragon/tft/en_us.json`),
]);

function walk(value, visit) {
  if (Array.isArray(value)) return value.forEach((entry) => walk(entry, visit));
  if (!value || typeof value !== 'object') return;
  visit(value);
  Object.values(value).forEach((entry) => walk(entry, visit));
}

// Repair two inherited aliases before choosing official item art.
for (const comp of comps) {
  walk(comp, (value) => {
    if (value.asset === 'moba-item:guardbreaker') value.name = '强袭者的链枷';
    if (value.asset !== 'moba-item:fimbulwinter') return;
    if (comp.id === 'apheliguards') {
      value.name = '圣盾使的誓约';
    } else if (comp.id === 'alune') {
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

const cdragonObjects = [];
walk(cdragon, (value) => {
  if (typeof value.apiName === 'string') cdragonObjects.push(value);
});
const cdragonUnits = new Map();
for (const entry of cdragonObjects) {
  if (typeof entry.squareIcon === 'string' && entry.squareIcon !== 'None') cdragonUnits.set(entry.apiName, entry);
}
const cdragonItems = new Map((cdragon.items || []).filter((entry) => typeof entry.apiName === 'string' && typeof entry.icon === 'string').map((entry) => [entry.apiName, entry]));

const specialUnitApi = {
  'moba-champion:brambleback': 'DA_Brambleback18',
  'moba-champion:cinderling': 'DA_Cinderling18',
  'moba-champion:crimson-raptor': 'DA_CrimsonRaptor18',
  'moba-champion:gromp': 'DA_Gromp18_AP',
  'moba-champion:krug': 'DA_Krug18',
  'moba-champion:murk-wolf': 'DA_Murkwolf18',
  'moba-champion:scuttlecrab': 'DA_Scuttlecrab18',
  'moba-champion:sentinel': 'DA_Sentinel18',
  'tencent-champion:100306': 'DA_18_Sentry',
  'tencent-champion:100323': 'DA_Gromp18_AP',
  'tencent-champion:100324': 'DA_Murkwolf18',
  'tencent-champion:100325': 'DA_Scuttlecrab18',
  'tencent-champion:100338': 'DA_Krug18',
  'tencent-champion:100351': 'DA_Brambleback18',
  'tencent-champion:100353': 'TFT16_PVE_BlueGolem',
  'tencent-champion:100356': 'DA_18_ElderDragon',
  'tencent-champion:100361': 'DA_18_Lux_Elderwood',
};

const championEntries = Object.values(championData.data);
function unitApiFor(assetKey, names) {
  if (specialUnitApi[assetKey]) return specialUnitApi[assetKey];
  const normalizedName = [...names][0].replace(/（.*?）/g, '').replace(/^永森/, '');
  const candidates = championEntries.filter((entry) => entry.name === normalizedName && /18/.test(entry.id));
  const chosen = candidates.find((entry) => entry.id.startsWith('DA_')) || candidates.at(-1);
  return chosen?.id || null;
}

const itemEntries = Object.values(itemData.data);
function itemApiFor(names) {
  const name = [...names][0];
  const candidates = itemEntries.filter((entry) => entry.name === name);
  const chosen = candidates.find((entry) => entry.id.startsWith('DA_')) || candidates.at(-1);
  return chosen?.id || null;
}

function pngUrlFromTex(texPath) {
  return `https://raw.communitydragon.org/${cdragonVersion}/game/${texPath.replace(/\.tex$/i, '.png').toLowerCase()}`;
}

async function download(url, target) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 100 || bytes.subarray(1, 4).toString() !== 'PNG') throw new Error('response is not a PNG');
  await fs.writeFile(target, bytes);
  return { bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}

const rights = { schemaVersion: 1, generatedAt: new Date().toISOString(), dataDragonPatch: patch, communityDragonVersion: cdragonVersion, assets: {} };
const results = { migrated: 0, fallback: 0, errors: [] };

for (const [assetKey, names] of used) {
  const fileName = manifest[assetKey];
  if (!fileName) {
    results.errors.push(`${assetKey}: missing local manifest entry`);
    continue;
  }
  let apiName = null;
  let iconPath = null;
  if (assetKey.includes('champion:')) {
    apiName = unitApiFor(assetKey, names);
    iconPath = apiName ? cdragonUnits.get(apiName)?.squareIcon : null;
  } else if (assetKey.includes('item:')) {
    apiName = itemApiFor(names);
    iconPath = apiName ? cdragonItems.get(apiName)?.icon : null;
  }

  const target = path.join(assetRoot, fileName);
  if (!apiName || !iconPath || iconPath === 'None') {
    const bytes = await fs.readFile(target);
    rights.assets[assetKey] = {
      file: fileName,
      displayNames: [...names],
      provider: 'historical-local-copy',
      publishStatus: 'needs-review',
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      note: `No CommunityDragon mapping for ${apiName || 'unknown API name'}`,
    };
    results.fallback += 1;
    continue;
  }

  const sourceUrl = pngUrlFromTex(iconPath);
  try {
    const receipt = await download(sourceUrl, target);
    rights.assets[assetKey] = {
      file: fileName,
      displayNames: [...names],
      provider: 'CommunityDragon (Riot client asset conversion)',
      sourceUrl,
      upstreamApiName: apiName,
      publishStatus: 'fan-project-policy-review',
      rightsHolder: 'Riot Games or applicable rights holder',
      ...receipt,
    };
    results.migrated += 1;
  } catch (error) {
    results.errors.push(`${assetKey}: ${error.message}`);
  }
}

await fs.writeFile(compsPath, `${JSON.stringify(comps, null, 2)}\n`);
await fs.writeFile(path.join(root, 'data/asset-rights.json'), `${JSON.stringify(rights, null, 2)}\n`);
console.log(JSON.stringify({ ...results, total: used.size }));
if (results.errors.length) process.exitCode = 1;
