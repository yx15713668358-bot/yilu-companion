# 数据结构

本文件说明 v7 正式版的目标数据结构。v7 尚未公开，开发期间如仍存在聚合的原型数据文件，应以通过校验的最新 Schema 和类型定义为准。

## 目录

```text
data/
├── meta.json
├── units.json
├── items.json
├── aliases.json
├── live/
│   └── source-stats.json
├── changelog.json
└── comps/
    └── <comp-id>.json
```

- `meta.json`：当前补丁、检查时间、成功更新时间和数据状态。
- `units.json`：棋子规范 ID、名称、费用和素材引用。
- `items.json`：装备规范 ID、名称、组件和素材引用。
- `aliases.json`：不同来源名称到规范 ID 的映射。
- `live/source-stats.json`：机器更新的来源记录，不包含人工运营结论。
- `changelog.json`：阵容新增、升降级和来源状态变化。
- `comps/*.json`：每套阵容的人工审核内容。

## 通用约定

- ID 使用稳定的小写 ASCII `kebab-case`，不得因中文显示名变化而改变。
- 所有棋子和装备通过 ID 引用，中文名只在基础表维护一次。
- 日期时间使用带时区的 ISO 8601 字符串。
- 未知值使用 `null` 或省略可选字段，不使用 `0`、`-` 或空字符串冒充。
- 棋盘位置为 `[row, column]`，`row` 范围 `0..3`，`column` 范围 `0..7`。
- 同一棋盘中位置不得重复。
- 外部来源字符串视为不可信输入；渲染前必须按字段白名单解析和转义。

## `meta.json`

```json
{
  "schemaVersion": 1,
  "set": "S18",
  "patch": "18.1d",
  "region": "global",
  "checkedAt": "2026-09-04T09:17:00+08:00",
  "lastSuccessfulUpdateAt": "2026-09-04T09:20:00+08:00",
  "status": "healthy"
}
```

`status` 可为：

- `healthy`：当前补丁与来源检查通过。
- `degraded`：部分来源失效，仍使用可靠快照。
- `stale`：可用数据未覆盖当前补丁。
- `review-required`：发现异常或新阵容，需要人工处理。

示例数值仅用于说明格式，不代表仓库当前数据状态。

## `units.json`

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

## `items.json`

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

`sampleSize` 缺失时应为 `null`。比率统一存为 `0..1`，显示层负责转换为百分比。

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
  "automation": {}
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

装备路线是人工审核数据，自动任务不得直接覆盖。

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

### `automation`

用于控制自动更新：

- `allowStatsUpdate`：是否允许更新来源统计。
- `allowRankingUpdate`：是否允许按规则调整排序。
- `editorialReviewRequired`：编辑内容变更是否强制人工审核，正式阵容应为 `true`。
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

