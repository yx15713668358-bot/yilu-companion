# 数据结构

本文件说明 v7 公开静态数据、未来规范化数据和本地私有API结果之间的边界。当前构建以通过校验的 `src/data/comps.json`、`data/meta.json` 和相关素材清单为准。

## 目录

```text
data/
├── meta.json
├── source-registry.json
└── asset-rights.json
src/data/
├── comps.json
└── asset-manifest.json
.private-data/                 # 被Git忽略；公开构建禁止读取
└── riot-tft/
    ├── manual-snapshot.json
    └── manual-aggregate.json
```

- `data/meta.json`：静态快照适用的赛季、补丁、人工核对日期和发布边界。
- `data/source-registry.json`：来源用途、许可判断、手动调用方式和公开资格。
- `data/asset-rights.json`：公开素材的来源、哈希和发布状态。
- `src/data/comps.json`：当前公开构建使用的人工审核阵容数据。
- `src/data/asset-manifest.json`：页面素材引用到仓库文件的映射。
- `.private-data/riot-tft/manual-snapshot.json`：Personal或Development Key手动调用结果，仅本地私用，不属于公开Schema。
- `.private-data/riot-tft/manual-aggregate.json`：由私有快照生成的去标识化汇总，仍只供本地审核，不属于公开Schema。

未来可把棋子、装备、别名和单阵容拆为规范化文件，但迁移必须保持公开构建只读取已审核、已跟踪的数据。

## 通用约定

- ID 使用稳定的小写 ASCII `kebab-case`，不得因中文显示名变化而改变。
- 所有棋子和装备通过 ID 引用，中文名只在基础表维护一次。
- 日期时间使用带时区的 ISO 8601 字符串。
- 未知值使用 `null` 或省略可选字段，不使用 `0`、`-` 或空字符串冒充。
- 棋盘位置为 `[row, column]`，`row` 范围 `0..3`，`column` 范围 `0..7`。
- 同一棋盘中位置不得重复。
- 外部来源字符串视为不可信输入；渲染前必须按字段白名单解析和转义。
- `data/` 与 `src/data/` 禁止保存API密钥、PUUID、Summoner ID、Account ID、Riot ID或其他玩家标识。
- `.private-data/`、`.env` 和 `.env.*` 必须被Git忽略，CI与Pages不得读取。

## `meta.json`

```json
{
  "schemaVersion": 1,
  "product": {
    "mode": "static-guide",
    "region": "CN"
  },
  "set": "S18",
  "patch": "18.1",
  "contentVerifiedAt": "2026-09-04",
  "officialPatchSourceId": "riot-patch-notes",
  "automation": {
    "mode": "manual-on-demand",
    "publishPolicy": "reviewed-static-snapshot",
    "publicBuildSourceNetworkAccess": "forbidden",
    "officialApiUse": "private-local-only",
    "personalDevelopmentOutput": "never-public"
  }
}
```

`contentVerifiedAt` 是公开内容最后一次人工核对日期，不是页面加载时间、API请求时间或“仍为当前版本”的保证。`product.region: CN`描述公开指南的目标读者；Riot官方API样本必须另标其实际平台和区域，不能由此写成国服比赛数据。

## 规范化棋子目标结构

```json
{
  "ahri": {
    "name": "阿狸",
    "cost": 4,
    "assetId": "unit-ahri"
  }
}
```

可选字段包括英文名、羁绊 ID、占用人口和来源版本。特殊单位占用两个人口时显式写 `slotCost: 2`。

## 规范化装备目标结构

```json
{
  "spear-of-shojin": {
    "name": "朔极之矛",
    "components": ["bf-sword", "tear-of-the-goddess"],
    "assetId": "item-spear-of-shojin"
  }
}
```

转职、神器、光明装备或特殊装备应通过 `category` 区分，不得假设都能由普通散件合成。

## 来源记录

```json
{
  "sourceId": "example-source",
  "url": "https://example.com/original-page",
  "patch": "18.1d",
  "region": "global",
  "rankRange": "platinum+",
  "sampleSize": 12345,
  "publishedAt": null,
  "observedAt": "2026-09-04T09:17:00+08:00",
  "compFingerprint": "sha256:...",
  "metrics": {
    "tier": "A",
    "averagePlacement": 4.21,
    "topFourRate": 0.552,
    "winRate": 0.127,
    "playRate": 0.031
  },
  "methodNote": "来源公开页面标注的筛选口径"
}
```

`sampleSize` 缺失时应为 `null`。比率统一存为 `0..1`，显示层负责转换为百分比。公开来源记录不得包含玩家级明细或可还原玩家身份的字段。

## 本地私有API结果

手动Riot TFT API工具只能把结果写入 `.private-data/riot-tft/`。该目录可临时包含完成请求所需的玩家标识和比赛明细，因此：

- 不定义为公开数据来源，不由Vite、CI、Pages或离线HTML读取。
- 不复制进 `data/`、`src/data/`、Issue、PR、Action工件或日志。
- Personal或Development Key生成的聚合结果也保持私有，不能因删除标识就直接公开。
- 未来Production结果只有在授权范围允许、完成匿名化和人工审核后，才能转写为新的公开来源记录；不得直接复制原始快照。

## 阵容文件

每套阵容由以下顶层对象组成：

```json
{
  "identity": {},
  "evidence": [],
  "entryConditions": {},
  "itemPlan": {},
  "milestones": [],
  "pivots": [],
  "capPlan": {},
  "positioning": [],
  "review": {}
}
```

### `identity`

必填字段：

- `id`：稳定阵容 ID。
- `name`：中文显示名。
- `goal`：`climb`、`chicken` 或 `conditional`。
- `style`：如 `slow-roll-6`、`slow-roll-7`、`fast-8`、`fast-9`。
- `difficulty`：`easy`、`medium` 或 `hard`。
- `damageProfile`：`ap`、`ad`、`mixed` 或 `tank`。
- `coreUnits`：主 C、主坦及关键单位的规范 ID。
- `finalBoard`：最终棋盘单位、星级下限、职责和位置。

### `evidence`

存放对 `source-stats.json` 记录的引用、来源评级和编辑说明。正式主推荐至少引用两个独立来源。不得在此复制整段第三方攻略。

### `entryConditions`

至少说明：

- 适合的散件和自然来牌。
- 血量与经济门槛。
- 同行上限。
- 必要强化、转职或特殊条件。
- 不应该硬玩的情况。

### `itemPlan`

分别为主 C、主坦和副位定义：

- `firstCraft`、`secondCraft`、`thirdCraft`。
- `acceptable`：可接受替代装备。
- `avoid`：不要随意合成的装备。
- `components`：散件优先级。

装备路线是人工审核数据，脚本不得直接覆盖。

### `milestones`

正式阵容至少覆盖：`opening`、`stage-2`、`3-2`、`4-1-or-4-2`、`stage-5`。

每个阶段至少包含：

- `level` 和 `goldFloor`。
- `levelAction` 和 `rollAction`。
- `rollStopCondition`。
- `board`：当前上场单位和位置。
- `mustBuy`、`benchHold`、`sellPriority`。
- `itemHolders`：代持人、装备顺序、接装目标和换装时点。
- `substitutes`：关键位置的替代单位。
- `failureChecks`：当前阶段失败条件。
- `nextTarget`：下一阶段人口和找牌目标。

人口校验按每个单位的 `slotCost` 求和，不得超过 `level`。

### `pivots`

每条转阵路径包含：

- `trigger`：触发条件。
- `targetCompId`：目标阵容。
- `keepUnits` 和 `sellUnits`。
- `itemTransfers`。
- `deadline`：最迟转阵阶段。

目标阵容 ID 必须存在，装备继承必须兼容。

### `capPlan`

包含：

- 当前体系稳定标准。
- 继续搜牌和升人口的互斥条件。
- 上 9 或上 10 后的加入、移除和升级顺序。
- 额外装备分配。
- 无法升人口时的保分方案。

### `positioning`

至少提供默认站位；可附对单侧主 C、对范围伤害等静态变体。所有站位只作赛前或手动旁读建议，不读取实时对手数据。

### `review`

用于记录公开资格：

- `status`：`candidate`、`review-required` 或 `approved-for-public`。
- `reviewedAt`：最后人工复核日期。
- `sourceReviewRequired`：来源或统计变化时是否需要重新复核，正式阵容应为 `true`。
- `fingerprintVersion`：阵容指纹算法版本。

## 校验规则

构建前至少检查：

- 文件符合 JSON Schema，ID 唯一且引用有效。
- 每套阵容阶段齐全。
- 棋盘位置合法、无重复且不超人口。
- 代持人在阶段棋盘中，最终接装人在最终阵容中。
- 换装时点、D 牌停止条件和下一目标不能为空。
- 转阵目标存在且不会形成无提示死循环。
- 正式主推荐满足来源数量和补丁一致性要求。
- 页面引用的素材存在且已通过发布许可检查。
- 公开数据不含密钥格式、玩家标识字段或私有目录引用。
- 默认构建不联网，也不读取 `.private-data/` 或 `RIOT_API_KEY`。
