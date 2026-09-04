import fs from 'node:fs/promises';
import path from 'node:path';
import {
  daysBetween,
  isNonEmptyString,
  parseArgs,
  parseIsoDate,
  projectRoot,
  readJson,
  sha256,
  unique,
} from './common.mjs';

const args = parseArgs(process.argv.slice(2));
const [comps, registry, meta, schema, assetManifest, assetRights] = await Promise.all([
  readJson('src/data/comps.json'),
  readJson('data/source-registry.json'),
  readJson('data/meta.json'),
  readJson('schemas/comp.schema.json'),
  readJson('src/data/asset-manifest.json'),
  readJson('data/asset-rights.json'),
]);

const errors = [];
const warnings = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const warn = (condition, message) => { if (!condition) warnings.push(message); };
const requiredStages = ['开局', '2阶段', '3-2', '4-1/4-2', '5阶段'];
const requiredCompStrings = [
  'id', 'name', 'currentTier', 'consensus', 'trend', 'style', 'difficulty', 'damage',
  'traits', 'updateNote', 'suitable', 'avoid', 'pivot', 'roll', 'threeStar', 'boardNote',
];

check(schema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'comp schema must use JSON Schema 2020-12');
check(schema.type === 'array' && schema.$defs?.comp, 'comp schema root is incomplete');
check(meta.schemaVersion === 1, 'data/meta.json schemaVersion must be 1');
check(meta.set === 'S18', 'meta.set must be S18');
check(/^\d{1,2}\.\d{1,2}$/.test(meta.patch || ''), 'meta.patch must look like 18.1');
check(meta.automation?.publishPolicy === 'last-known-good', 'publish policy must be last-known-good');
check(meta.automation?.newCompositionPolicy === 'review-required', 'new compositions must require review');
check(meta.automation?.thirdPartyFetch === 'disabled-until-explicit-permission', 'third-party default must remain disabled');
check(assetRights.schemaVersion === 1, 'asset rights registry schemaVersion must be 1');

const verifiedDate = parseIsoDate(meta.contentVerifiedAt);
check(Boolean(verifiedDate), 'meta.contentVerifiedAt must be YYYY-MM-DD');
if (verifiedDate) {
  const ageDays = daysBetween(verifiedDate);
  check(ageDays >= 0, 'meta.contentVerifiedAt cannot be in the future');
  warn(ageDays <= meta.automation.freshnessWarningDays, `content review is ${ageDays} days old`);
  check(ageDays <= meta.automation.freshnessBlockDays, `content review is stale (${ageDays} days; block after ${meta.automation.freshnessBlockDays})`);
}

check(registry.schemaVersion === 1, 'source registry schemaVersion must be 1');
check(registry.policy?.automatedFetchRequiresExplicitPermission === true, 'source registry must require explicit automated-fetch permission');
check(Array.isArray(registry.sources) && registry.sources.length > 0, 'source registry must contain sources');
check(unique(registry.sources.map((source) => source.id)), 'source registry IDs must be unique');

const sourceAliases = new Map();
for (const source of registry.sources) {
  for (const field of ['id', 'name', 'provider', 'providerKind', 'url', 'purpose', 'permissionStatus']) {
    check(isNonEmptyString(source[field]), `${source.id || 'unknown source'}: missing ${field}`);
  }
  check(/^https:\/\//.test(source.url || ''), `${source.id}: source URL must use HTTPS`);
  for (const alias of [source.id, source.name, ...(source.aliases || [])]) {
    check(!sourceAliases.has(alias), `${source.id}: duplicate source alias ${alias}`);
    sourceAliases.set(alias, source.id);
  }
  if (source.automatedFetch) {
    check(source.enabled === true, `${source.id}: automatedFetch requires enabled=true`);
    check(isNonEmptyString(source.adapter), `${source.id}: automatedFetch requires an adapter`);
    check(source.permissionStatus !== 'unverified', `${source.id}: automatedFetch requires recorded permission`);
  }
  if (source.providerKind === 'third-party') {
    check(source.automatedFetch === false, `${source.id}: third-party automated fetch is disabled until explicit permission is recorded`);
    check(source.enabled === false, `${source.id}: third-party adapter must remain disabled`);
  }
  if (!source.enabled) check(source.automatedFetch === false, `${source.id}: disabled source cannot fetch automatically`);
}

const officialSource = registry.sources.find((source) => source.id === meta.officialPatchSourceId);
check(Boolean(officialSource), `official patch source is missing: ${meta.officialPatchSourceId}`);
if (officialSource) {
  check(officialSource.providerKind === 'official', 'official patch source must have providerKind=official');
  check(officialSource.enabled && officialSource.automatedFetch, 'official patch source must be enabled');
  check(officialSource.adapter === 'riot-patch-page', 'official patch source must use riot-patch-page');
  check(officialSource.expectedPatch === meta.patch, 'official source expectedPatch must equal meta.patch');
}

check(Array.isArray(comps) && comps.length > 0, 'src/data/comps.json must contain at least one comp');
check(unique(comps.map((comp) => comp.id)), 'comp IDs must be unique');
const usedAssets = new Set();

function addAsset(value, context) {
  check(isNonEmptyString(value), `${context}: missing asset key`);
  if (isNonEmptyString(value)) usedAssets.add(value);
}

function checkPosition(position, context) {
  check(Array.isArray(position) && position.length === 2, `${context}: position must contain row and column`);
  if (!Array.isArray(position) || position.length !== 2) return;
  check(Number.isInteger(position[0]) && position[0] >= 0 && position[0] < 4, `${context}: row must be 0..3`);
  check(Number.isInteger(position[1]) && position[1] >= 0 && position[1] < 8, `${context}: column must be 0..7`);
}

for (const comp of comps) {
  for (const field of requiredCompStrings) check(isNonEmptyString(comp[field]), `${comp.id || 'unknown comp'}: missing ${field}`);
  check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(comp.id || ''), `${comp.id || 'unknown comp'}: invalid ID`);
  check(['climb', 'chicken', 'conditional'].includes(comp.goal), `${comp.id}: invalid goal`);
  check(/^[SABCD](?:[+-])?$/.test(comp.currentTier || ''), `${comp.id}: invalid currentTier`);
  check(Array.isArray(comp.sourceStats) && comp.sourceStats.length >= 2, `${comp.id}: at least two source records are required`);
  for (const stat of comp.sourceStats || []) {
    check(sourceAliases.has(stat.source), `${comp.id}: unregistered source ${stat.source}`);
    check(isNonEmptyString(stat.rating) && isNonEmptyString(stat.note), `${comp.id}/${stat.source}: source record is incomplete`);
    check(Boolean(parseIsoDate(stat.updated)), `${comp.id}/${stat.source}: updated must be YYYY-MM-DD`);
  }

  check(Array.isArray(comp.units) && comp.units.length > 0, `${comp.id}: final board is empty`);
  const finalNames = new Set();
  const finalCells = [];
  let finalPopulation = 0;
  for (const unit of comp.units || []) {
    check(isNonEmptyString(unit.name) && isNonEmptyString(unit.role), `${comp.id}: final unit is incomplete`);
    addAsset(unit.asset, `${comp.id}/${unit.name}`);
    checkPosition(unit.pos, `${comp.id}/${unit.name}`);
    finalCells.push(Array.isArray(unit.pos) ? unit.pos.join('-') : 'invalid');
    finalPopulation += unit.slotCost || 1;
    finalNames.add(unit.name);
  }
  check(unique(finalCells), `${comp.id}: final board contains duplicate cells`);
  check(finalPopulation <= 11, `${comp.id}: final board exceeds maximum supported population`);

  check(Array.isArray(comp.loadouts) && comp.loadouts.length > 0, `${comp.id}: loadouts are missing`);
  for (const loadout of comp.loadouts || []) {
    check(isNonEmptyString(loadout.label), `${comp.id}: loadout label is missing`);
    check(Array.isArray(loadout.items) && loadout.items.length > 0 && loadout.items.length <= 3, `${comp.id}/${loadout.label}: item count must be 1..3`);
    for (const item of loadout.items || []) addAsset(item.asset, `${comp.id}/${loadout.label}/${item.name}`);
  }

  check(Array.isArray(comp.transitionStages) && comp.transitionStages.length === requiredStages.length, `${comp.id}: exactly five transition stages are required`);
  check(requiredStages.every((stage) => comp.transitionStages?.some((entry) => entry.stage === stage)), `${comp.id}: transition stage names are incomplete`);
  for (const stage of comp.transitionStages || []) {
    const context = `${comp.id}/${stage.stage}`;
    check(Number.isInteger(stage.level) && stage.level > 0 && stage.level <= 11, `${context}: invalid level`);
    for (const field of ['goldGoal', 'rollAction', 'sellWhen', 'nextTarget', 'pivotWarning', 'transitionSource']) {
      check(isNonEmptyString(stage[field]), `${context}: missing ${field}`);
    }
    check(Array.isArray(stage.boardUnits) && stage.boardUnits.length > 0, `${context}: board is empty`);
    const boardNames = new Set();
    const cells = [];
    let population = 0;
    for (const unit of stage.boardUnits || []) {
      check(isNonEmptyString(unit.name), `${context}: unnamed board unit`);
      addAsset(unit.asset, `${context}/${unit.name}`);
      checkPosition(unit.pos, `${context}/${unit.name}`);
      cells.push(Array.isArray(unit.pos) ? unit.pos.join('-') : 'invalid');
      population += unit.slotCost || 1;
      boardNames.add(unit.name);
    }
    check(unique(cells), `${context}: duplicate board cells`);
    check(population <= stage.level, `${context}: board uses ${population} slots at level ${stage.level}`);
    check(Array.isArray(stage.itemHolders) && stage.itemHolders.length > 0, `${context}: at least one item holder is required`);
    for (const holder of stage.itemHolders || []) {
      check(boardNames.has(holder.holder), `${context}: item holder is not on board (${holder.holder})`);
      check(finalNames.has(holder.target), `${context}: item target is not on final board (${holder.target})`);
      check(isNonEmptyString(holder.transferAt), `${context}/${holder.holder}: transfer timing is missing`);
      addAsset(holder.holderAsset, `${context}/${holder.holder}`);
      addAsset(holder.targetAsset, `${context}/${holder.target}`);
      check(Array.isArray(holder.items) && holder.items.length > 0 && holder.items.length <= 3, `${context}/${holder.holder}: item count must be 1..3`);
      for (const item of holder.items || []) addAsset(item.asset, `${context}/${holder.holder}/${item.name}`);
    }
    for (const substitute of stage.substitutes || []) {
      for (const option of substitute.options || []) addAsset(option.asset, `${context}/substitute/${option.name}`);
    }
  }

  const postCap = comp.postCapPlan;
  check(Boolean(postCap), `${comp.id}: postCapPlan is missing`);
  if (postCap) {
    for (const field of ['stableAt', 'cannotNine', 'source']) check(isNonEmptyString(postCap[field]), `${comp.id}/postCapPlan: missing ${field}`);
    for (const field of ['stayAndRollWhen', 'goNineWhen', 'level9Adds', 'removeFirst', 'priority', 'extraItems']) {
      check(Array.isArray(postCap[field]) && postCap[field].length > 0, `${comp.id}/postCapPlan: ${field} must not be empty`);
    }
    for (const unit of [...(postCap.level9Adds || []), ...(postCap.removeFirst || [])]) addAsset(unit.asset, `${comp.id}/postCapPlan/${unit.name}`);
  }

  check(Boolean(comp.prototype), `${comp.id}: prototype guidance is missing`);
  if (comp.prototype) {
    for (const field of ['headline', 'brief', 'flexibleItems', 'avoidItem']) check(isNonEmptyString(comp.prototype[field]), `${comp.id}/prototype: missing ${field}`);
    check(Array.isArray(comp.prototype.itemPriority) && comp.prototype.itemPriority.length > 0, `${comp.id}/prototype: itemPriority is empty`);
    check(Array.isArray(comp.prototype.keyUnitNames) && comp.prototype.keyUnitNames.length > 0, `${comp.id}/prototype: keyUnitNames is empty`);
    for (const name of comp.prototype.keyUnitNames || []) check(finalNames.has(name), `${comp.id}/prototype: key unit is not on final board (${name})`);
  }
}

for (const assetKey of usedAssets) {
  const fileName = assetManifest[assetKey];
  check(isNonEmptyString(fileName), `asset manifest is missing ${assetKey}`);
  if (!isNonEmptyString(fileName)) continue;
  const filePath = path.join(projectRoot, 'src/assets/game', fileName);
  let fileHash = null;
  try {
    const stats = await fs.stat(filePath);
    check(stats.isFile() && stats.size > 100, `asset is missing or too small: ${assetKey}`);
    fileHash = sha256(await fs.readFile(filePath));
  } catch {
    errors.push(`asset file is missing: ${assetKey}`);
  }
  const rights = assetRights.assets?.[assetKey];
  check(Boolean(rights), `asset rights registry is missing ${assetKey}`);
  if (rights) {
    check(rights.file === fileName, `${assetKey}: asset rights file does not match manifest`);
    check(rights.publishStatus !== 'needs-review', `${assetKey}: asset is not cleared for the fan-project build`);
    check(typeof rights.sha256 === 'string' && /^[a-f0-9]{64}$/.test(rights.sha256), `${assetKey}: asset checksum is invalid`);
    check(fileHash === rights.sha256, `${assetKey}: asset checksum does not match rights registry`);
  }
}

let probe = null;
if (args.probe) {
  try {
    const probePath = path.resolve(projectRoot, args.probe);
    probe = JSON.parse(await fs.readFile(probePath, 'utf8'));
    check(probe.schemaVersion === 1, 'Riot probe schemaVersion must be 1');
    check(probe.sourceId === meta.officialPatchSourceId, 'Riot probe source does not match meta');
    check(probe.ok === true && probe.health === 'healthy', 'Riot official patch probe is not healthy');
    check(probe.expectedPatch === meta.patch, 'Riot probe expected patch does not match meta');
    check(probe.detectedPatch === meta.patch, `Riot page reports ${probe.detectedPatch || 'no patch'}, expected ${meta.patch}`);
    check(typeof probe.pageSha256 === 'string' && /^[a-f0-9]{64}$/.test(probe.pageSha256), 'Riot probe page hash is invalid');
  } catch (error) {
    errors.push(`cannot read Riot probe: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (process.env.GITHUB_ACTIONS === 'true') {
  for (const message of warnings) console.log(`::warning::${message}`);
  for (const message of errors) console.log(`::error::${message}`);
}

const summary = {
  ok: errors.length === 0,
  comps: comps.length,
  stages: comps.reduce((sum, comp) => sum + (comp.transitionStages?.length || 0), 0),
  registeredSources: registry.sources.length,
  enabledAutomatedSources: registry.sources.filter((source) => source.enabled && source.automatedFetch).map((source) => source.id),
  disabledThirdPartySources: registry.sources.filter((source) => source.providerKind === 'third-party' && !source.enabled).map((source) => source.id),
  assetsChecked: usedAssets.size,
  probeMode: probe?.mode || null,
  warnings,
  errors,
};

console.log(JSON.stringify(summary));
if (errors.length) process.exitCode = 1;
