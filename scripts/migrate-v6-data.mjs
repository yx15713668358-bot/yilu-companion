import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourceRoot = path.resolve(root, '../tft-s18-v6');
const [allComps, manifest] = await Promise.all([
  fs.readFile(path.join(sourceRoot, 'comps.json'), 'utf8').then(JSON.parse),
  fs.readFile(path.join(sourceRoot, 'assets-manifest.json'), 'utf8').then(JSON.parse),
]);

// These compact execution lines only shorten facts that already exist in v6's
// roll/threeStar fields. They deliberately do not introduce new team guidance.
const headlines = {
  veigar: '5级慢D｜维迦、可酷伯、雷克塞追3',
  yi: '7级慢D｜易、石甲虫、蔚优先追3',
  'hunter-sivir': '4-2速8｜墨菲特2＋艾希/希维尔至少一张2星',
  cassio: '7级慢D｜蛇女2星后卡50追3',
  cait: '6级慢D｜女警＋伊莉丝双追3',
  'rift-reroll': '6级慢D｜Pebbles优先追3',
  ahri: '4-2速8｜阿狸2＋至少一名前排2星',
  ap84: '4-2速8｜墨菲特＋一张法系主C两星',
  apheliguards: '4-2速8｜月男＋远古哨兵两星',
  'rift-fast9': '5-2速9｜留30金币找高费两星',
  'final-forest': '5-2速9｜留20–30金币启动',
  aphelios: '4-2升8｜月男＋莉莉娅两星后转9',
  dragon: '速9｜8级稳血后再找巨龙/德莱文两星',
  alune: '4-2速8｜拉露恩＋主坦两星后停D',
  wispful: '4-2速8｜阿狸＋瑟提至少一张两星',
  'solar-kayle': '6级慢D｜霞、奥恩、凯尔优先追3',
};

const prototypeOverrides = {
  veigar: {
    headline: headlines.veigar,
    brief: '最容易照着执行的法系慢D，核心数量够再锁定。',
    itemPriority: ['蓝霸符', '珠光护手', '主坦肉装'],
    flexibleItems: '眼泪先做启动装；腰带、护甲优先补可酷伯坦度。',
    avoidItem: '没有维迦成长条件时，不要为了专属纹章强行等装备。',
    keyUnitNames: ['维迦', '可酷伯', '雷克塞', '费德提克'],
  },
  ahri: {
    headline: headlines.ahri,
    brief: '法装通用、转阵空间大；先稳住8级再考虑升9。',
    itemPriority: ['朔极之矛', '珠光护手/强袭者的链枷', '主坦三件'],
    flexibleItems: '前期任意两星法系后排代持；肉装先给能站最久的前排。',
    avoidItem: '阿狸没来前不要把通用法装锁死在无法出售的体系牌上。',
    keyUnitNames: ['阿狸', '瑟提', '莫甘娜', '艾翁'],
  },
  'hunter-sivir': {
    headline: headlines['hunter-sivir'],
    brief: '物理装备的稳健速8方向，野怪前排能自然过渡。',
    itemPriority: ['红霸符/最后的轻语', '巨人杀手', '墨菲特主坦装'],
    flexibleItems: '绯红树怪先代持攻速装；苍蓝哨戒先拿石像鬼和狂徒。',
    avoidItem: '没有前排装时不要只做三件输出装空冲8级。',
    keyUnitNames: ['希维尔', '艾希', '墨菲特', '奈德丽'],
  },
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function findLoadout(comp, role) {
  return comp.loadouts.find((loadout) => loadout.label.includes(role));
}

function deriveItemPriority(comp) {
  const carry = findLoadout(comp, '主C') ?? comp.loadouts[0];
  const tank = findLoadout(comp, '主坦') ?? comp.loadouts[1] ?? comp.loadouts[0];
  return unique([
    carry?.items?.[0]?.name,
    carry?.items?.[1]?.name,
    tank?.items?.[0]?.name,
  ]);
}

function deriveFlexibleItems(comp) {
  const transfers = [];
  for (const stage of comp.transitionStages) {
    for (const holder of stage.itemHolders) {
      if (holder.holder === holder.target) continue;
      const line = `${holder.holder}代持 → ${holder.target}：${holder.transferAt}`;
      if (!transfers.includes(line)) transfers.push(line);
    }
  }
  if (transfers.length) return transfers.slice(0, 2).join('；');

  const directHolders = unique(
    comp.transitionStages.flatMap((stage) =>
      stage.itemHolders
        .filter((holder) => holder.holder === holder.target)
        .map((holder) => holder.holder),
    ),
  );
  return `${directHolders.slice(0, 2).join('、')}从过渡阶段直接持有成装，按阶段棋盘中的代持标记分配。`;
}

function deriveKeyUnitNames(comp) {
  const roleOrder = ['主C', '主坦', '副C', '副坦', '控制', '前排', '辅助', '9级首选'];
  const names = [];
  for (const role of roleOrder) {
    for (const unit of comp.units) {
      if (unit.role !== role || names.includes(unit.name)) continue;
      names.push(unit.name);
      if (names.length === 4) return names;
    }
  }
  for (const unit of comp.units) {
    if (!names.includes(unit.name)) names.push(unit.name);
    if (names.length === 4) break;
  }
  return names;
}

function derivePrototype(comp) {
  return {
    headline: headlines[comp.id] ?? `${comp.style}｜${comp.roll}`,
    brief: comp.updateNote,
    itemPriority: deriveItemPriority(comp),
    flexibleItems: deriveFlexibleItems(comp),
    avoidItem: comp.avoid,
    keyUnitNames: deriveKeyUnitNames(comp),
  };
}

const selected = allComps.map((comp) => ({
  ...comp,
  prototype: prototypeOverrides[comp.id] ?? derivePrototype(comp),
}));

const assetKeys = new Set();
function collect(value) {
  if (Array.isArray(value)) return value.forEach(collect);
  if (!value || typeof value !== 'object') return;
  if (typeof value.asset === 'string') assetKeys.add(value.asset);
  Object.values(value).forEach(collect);
}
selected.forEach(collect);

const targetAssets = path.join(root, 'src/assets/game');
await fs.mkdir(targetAssets, { recursive: true });
const localManifest = {};
for (const key of [...assetKeys].sort()) {
  const entry = manifest[key];
  if (!entry) throw new Error(`Missing asset ${key}`);
  const sourceFile = path.resolve(sourceRoot, entry.localFile);
  const fileName = `${key.replaceAll(':', '-')}.png`;
  await fs.copyFile(sourceFile, path.join(targetAssets, fileName));
  localManifest[key] = fileName;
}

await fs.writeFile(path.join(root, 'src/data/comps.json'), `${JSON.stringify(selected, null, 2)}\n`);
await fs.writeFile(path.join(root, 'src/data/asset-manifest.json'), `${JSON.stringify(localManifest, null, 2)}\n`);
console.log(JSON.stringify({
  comps: selected.length,
  stages: selected.reduce((sum, comp) => sum + comp.transitionStages.length, 0),
  assets: assetKeys.size,
}));
