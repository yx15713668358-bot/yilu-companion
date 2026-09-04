import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const singleFile = process.argv.includes('--single');
const outputDirectory = singleFile ? 'dist-single' : 'dist';
const [comps, manifest, html, unitCard, detail, css, appSource, gitignore, meta, workflowNames] = await Promise.all([
  fs.readFile(path.join(root, 'src/data/comps.json'), 'utf8').then(JSON.parse),
  fs.readFile(path.join(root, 'src/data/asset-manifest.json'), 'utf8').then(JSON.parse),
  fs.readFile(path.join(root, outputDirectory, 'index.html'), 'utf8'),
  fs.readFile(path.join(root, 'src/components/UnitCard.tsx'), 'utf8'),
  fs.readFile(path.join(root, 'src/components/DetailView.tsx'), 'utf8'),
  fs.readFile(path.join(root, 'src/styles.css'), 'utf8'),
  fs.readFile(path.join(root, 'src/App.tsx'), 'utf8'),
  fs.readFile(path.join(root, '.gitignore'), 'utf8'),
  fs.readFile(path.join(root, 'data/meta.json'), 'utf8').then(JSON.parse),
  fs.readdir(path.join(root, '.github/workflows')),
]);
const workflowSources = await Promise.all(workflowNames
  .filter((name) => /\.ya?ml$/i.test(name))
  .map(async (name) => ({
    name,
    source: await fs.readFile(path.join(root, '.github/workflows', name), 'utf8'),
  })));

const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };

const expectedStagesPerComp = 5;
check(comps.length >= 16, `expected at least 16 comps, got ${comps.length}`);
check(new Set(comps.map((comp) => comp.id)).size === comps.length, 'comp ids are not unique');
check(
  comps.reduce((sum, comp) => sum + comp.transitionStages.length, 0) === comps.length * expectedStagesPerComp,
  `expected ${comps.length * expectedStagesPerComp} transition stages`,
);
for (const comp of comps) {
  check(comp.transitionStages.length === expectedStagesPerComp, `${comp.id}: expected ${expectedStagesPerComp} stages`);
  check(
    ['headline', 'brief', 'flexibleItems', 'avoidItem'].every((field) => typeof comp.prototype?.[field] === 'string' && comp.prototype[field].trim()),
    `${comp.id}: prototype copy incomplete`,
  );
  check(Array.isArray(comp.prototype?.itemPriority) && comp.prototype.itemPriority.length >= 3, `${comp.id}: item priority incomplete`);
  check(Array.isArray(comp.prototype?.keyUnitNames) && comp.prototype.keyUnitNames.length === 4, `${comp.id}: key units incomplete`);
  const finalNames = new Set(comp.units.map((unit) => unit.name));
  check(comp.prototype.keyUnitNames.every((name) => finalNames.has(name)), `${comp.id}: key unit missing from final board`);
  for (const stage of comp.transitionStages) {
    const cells = stage.boardUnits.map((unit) => unit.pos.join('-'));
    check(cells.length === new Set(cells).size, `${comp.id}/${stage.stage}: duplicate board cell`);
    const population = stage.boardUnits.reduce((sum, unit) => sum + (unit.slotCost || 1), 0);
    check(population <= stage.level, `${comp.id}/${stage.stage}: board exceeds level`);
    for (const holder of stage.itemHolders) {
      check(stage.boardUnits.some((unit) => unit.name === holder.holder), `${comp.id}/${stage.stage}: holder absent ${holder.holder}`);
      check(finalNames.has(holder.target), `${comp.id}/${stage.stage}: target absent ${holder.target}`);
    }
  }
}

for (const [key, file] of Object.entries(manifest)) {
  try { check((await fs.stat(path.join(root, 'src/assets/game', file))).size > 100, `asset too small ${key}`); }
  catch { errors.push(`missing asset ${key}`); }
}

check(html.includes('<title>弈路助手 · S18 阵容战术板</title>'), 'title is stale');
if (singleFile) check(!/<script[^>]+src=|<link[^>]+stylesheet/i.test(html), 'build is not a single HTML file');
check(!/(src|href)=["']https?:/i.test(html), 'build has a remote runtime dependency');
check(meta.automation?.mode === 'manual-on-demand', 'maintenance mode is not manual-on-demand');
check(meta.automation?.officialApiUse === 'private-local-only', 'official API boundary is not private-local-only');
check(!appSource.includes('每日版本检查') && !html.includes('每日版本检查'), 'daily update copy remains in the public app');
check(!appSource.includes('官方版本检查已配置') && !html.includes('官方版本检查已配置'), 'scheduled-check copy remains in the public app');
check(!/RGAPI-[A-Za-z0-9_-]{8,}/.test(html), 'public build contains a Riot API key-like value');
check(!html.includes('RIOT_API_KEY') && !html.includes('.private-data'), 'public build references private API inputs');
check(/^\.private-data\/$/m.test(gitignore), '.private-data is not ignored');
check(/^\.env$/m.test(gitignore) && /^\.env\.\*$/m.test(gitignore), 'environment files are not ignored');
for (const workflow of workflowSources) {
  check(!/^\s*schedule\s*:/m.test(workflow.source), `${workflow.name}: scheduled trigger remains enabled`);
  check(!/\bcron\s*:/m.test(workflow.source), `${workflow.name}: cron trigger remains enabled`);
}
check(!workflowNames.includes('daily-update.yml'), 'legacy daily-update workflow file still exists');
check(workflowNames.includes('manual-source-check.yml'), 'manual source-check workflow is missing');
const pagesWorkflow = workflowSources.find((workflow) => workflow.name === 'pages.yml')?.source || '';
check(!pagesWorkflow.includes('check-riot.mjs') && !pagesWorkflow.includes('riot:tft:live'), 'Pages build performs a network data check');
check(!unitCard.includes('role-pill') && unitCard.indexOf('</div>\n      <figcaption>') > 0, 'role label is still inside the crop layer');
check(!css.includes('.portrait') && !/\.role-label\s*\{[^}]*position:\s*absolute/s.test(css), 'old circular/absolute role label remains');
check(css.includes('.board-cell::before') && !/\.board-cell\s*\{[^}]*clip-path/s.test(css), 'board content is still clipped by the hex');
check((detail.match(/onClick=\{onClose\}/g) || []).length === 1, 'detail has more than one close trigger');
check(detail.includes("event.key === 'Escape'") && detail.includes('event.preventDefault()'), 'Escape protection missing');
check(detail.includes('returnFocus?.focus()'), 'focus restoration missing');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  mode: singleFile ? 'single' : 'hosted',
  comps: comps.length,
  stages: comps.reduce((sum, comp) => sum + comp.transitionStages.length, 0),
  assets: Object.keys(manifest).length,
  bytes: Buffer.byteLength(html),
}));
