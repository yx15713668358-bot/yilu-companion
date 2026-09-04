# Riot TFT API 本地手动使用说明

本工具是弈路助手的本地私用 API 原型。它只在人工执行命令时运行，不存在定时任务，不修改公开阵容数据，也不会把 Riot API 结果打包进公开网站。

## 安全边界

- 默认模式是 `dry-run`：只显示请求计划，网络请求数和写入数都是 0。
- 只有显式添加 `--live` 才会访问 Riot API。
- 密钥只从当前进程的 `RIOT_API_KEY` 环境变量读取。不接受密钥命令行参数，不打印、不写入文件。
- 实际结果默认只在内存中处理，终端只打印不含玩家标识的数量摘要。
- 只有再添加 `--write` 才会保存原始快照和匿名聚合。两份文件都在 `.private-data/riot-tft/` 内。该目录已由 `.gitignore` 规则隔离，目录权限为 `0700`，文件权限为 `0600`。
- 请勿将 Personal Key 或其玩家级输出复制到 `src/data/`、`data/`、`public/`、`dist/`、GitHub Actions 日志或公开仓库。
- 匿名聚合不包含玩家和对局标识，但它仍是 Personal Key 产生的私有输出，不得因已匿名就复制到公开站点或仓库。

Riot 官方说明中，Personal Key 面向开发者或小型私人社群，不能用于公开产品。见 [Developer Portal - API Keys](https://developer.riotgames.com/docs/portal#web-apis_api-keys)。

## 官方 API 和路由

核对日期：2026年9月4日。

工具只使用 [Riot Developer Portal API Reference](https://developer.riotgames.com/apis) 公开列出的两个 Teamfight Tactics API 家族：

- `tft-league-v1`：`GET /tft/league/v1/entries/{tier}/{division}`。
- `tft-match-v1`：`GET /tft/match/v1/matches/by-puuid/{puuid}/ids` 和 `GET /tft/match/v1/matches/{matchId}`。

本原型支持下列保守配对：

| 区域路由 | 平台路由 |
| --- | --- |
| `americas` | `na1`、`br1`、`la1`、`la2` |
| `asia` | `kr`、`jp1` |
| `europe` | `euw1`、`eun1`、`tr1`、`ru` |

官方 TFT 路由文档未列出中国大陆 CN 公开路由，所以本工具不接受 CN 或其他未明确支持的路由。它不能用来声称获取了国服数据。见 [Teamfight Tactics - Routing Values](https://developer.riotgames.com/docs/tft#routing-values)。

## 使用步骤

### 1. 先跑默认 dry-run

```bash
node scripts/riot-tft-manual/cli.mjs
```

输出应显示 `"mode": "dry-run"`、`"networkRequests": 0` 和 `"writes": 0`。

### 2. 用合成夹具做离线验证

```bash
node scripts/riot-tft-manual/cli.mjs --offline
```

夹具不含真实玩家数据。相同参数每次都会得到相同结果。
离线结果的终端摘要也会显示聚合样本数、平均名次、前四率、第一名率和阵容指纹数量。

### 3. 手动注入密钥

下列 zsh 命令会隐藏输入，不把密钥直接写进命令历史：

```bash
read -s "RIOT_API_KEY?请粘贴 Riot API Key："
export RIOT_API_KEY
```

不要将密钥写入 `.env`、文档、源码、截图或聊天消息。

### 4. 只请求，不保存

```bash
npm run riot:tft:live -- \
  --platform na1 --region americas \
  --tier GOLD --division I \
  --players 1 --matches 1
```

这会依次请求榜单、对局 ID 和对局详情，但终端只显示数量摘要。

### 5. 保存私有快照

```bash
npm run riot:tft:live:write -- \
  --platform na1 --region americas \
  --tier GOLD --division I \
  --players 1 --matches 1
```

输出位置固定为：

```text
.private-data/riot-tft/manual-snapshot.json    # 原始私有快照，含 PUUID 和对局 ID
.private-data/riot-tft/manual-aggregate.json   # 匿名私有聚合，不含玩家/对局标识
```

使用完成后清除当前 shell 中的密钥：

```bash
unset RIOT_API_KEY
```

## 匿名聚合内容

`manual-aggregate.json` 只从本次已采集对局中的样本玩家数据生成，不保留任何 PUUID、Riot ID、Summoner ID/名称、match ID 或原始参与者列表。生成后还会用原始快照中的这些标识做一次失败即停止的泄漏检查。

聚合字段包括：

- `sampleCount`：样本玩家对局观测数。
- `metrics.averagePlacement`：平均名次，保留最多 4 位小数。
- `metrics.topFourRate`：前四占比，范围 0-1。
- `metrics.firstPlaceRate`：第一名占比，范围 0-1。
- `contexts`：API 响应中存在时，按游戏版本、TFT set 编号和 queue ID 列出样本数。
- `compositions`：仅用排序后的英雄 `character_id` 生成指纹；每个指纹附带样本数、名次指标，以及英雄的星级和 `itemNames` 出现次数摘要。

阵容指纹不使用玩家姓名、Riot ID、PUUID、match ID、排名时间或其他可识别个人的值。

## 限流和重试

- 所有请求串行执行，默认最少间隔 1250ms。
- 工具读取 Riot 响应中的 `X-App-Rate-Limit`、`X-App-Rate-Limit-Count`、`X-Method-Rate-Limit` 和 `X-Method-Rate-Limit-Count`。当计数用尽时，在下一次请求前等待对应时间窗。
- HTTP 429 优先遵守 `Retry-After`。HTTP 5xx 和短暂网络错误使用有上限的指数退避。
- 每次请求都发送项目 User-Agent。如 Riot 为已登记应用要求其他识别字符串，可通过 `--user-agent` 覆盖，不得在其中放密钥。

## 参数

| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `--platform` | `na1` | `tft-league-v1` 的平台路由 |
| `--region` | `americas` | `tft-match-v1` 的区域路由 |
| `--tier` | `GOLD` | `IRON` 至 `DIAMOND` |
| `--division` | `I` | `I`、`II`、`III` 或 `IV` |
| `--page` | `1` | 榜单页码，范围 1-100 |
| `--players` | `1` | 按 PUUID 稳定排序后选取 1-5 名玩家 |
| `--matches` | `1` | 每人请求 1-20 场最近对局 |
| `--min-delay-ms` | `1250` | 请求最小间隔，不可降低 |
| `--max-retries` | `3` | 最多重试 0-5 次 |
| `--user-agent` | 项目识别字符串 | 覆盖 HTTP User-Agent |

## 测试

```bash
node --test scripts/riot-tft-manual/test.mjs
```

测试会验证：默认零网络与零写入、CN 路由拒绝、官方端点路径、夹具与匿名聚合的确定性、聚合标识泄漏检查、密钥不进入输出、`Retry-After`/限流等待和私有文件权限。测试本身不访问 Riot API。

## 手动维护规则

1. 需要更新时，再由维护者手动运行。不要放入 cron、GitHub Actions 定时任务或网站请求链路。
2. 先在 `.private-data/` 审查输出，核对版本、队列、区域、样本数和异常值。
3. Personal Key 阶段不将 API 原始结果或匿名聚合结果发布到公网。
4. 将来取得 Production Key 后，仍应单独设计“私有采集→人工审核→公开静态快照”流程；本原型不会自动发布。
