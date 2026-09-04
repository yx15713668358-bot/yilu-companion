# Riot Developer Portal 产品登记草稿

更新日期：2026年9月4日

状态：已准备，尚未提交。提交属于代表维护者向Riot发送产品信息，必须由维护者确认后执行。

## 基础信息

- Product name: `Yilu Companion（弈路助手）`
- Game: `Teamfight Tactics`
- Product type: `Public web product`
- Main URL: https://yx15713668358-bot.github.io/yilu-companion/
- Repository: https://github.com/yx15713668358-bot/yilu-companion
- Privacy: https://yx15713668358-bot.github.io/yilu-companion/privacy.html
- Terms: https://yx15713668358-bot.github.io/yilu-companion/terms.html
- Login / RSO: `None`
- Monetization: `None; free access, no ads, no subscriptions, no donations at present.`

## Short description (English)

> A free, open-source Chinese-language educational reference for Teamfight Tactics. It presents static, patch-specific composition guides with example boards, leveling and economy checkpoints, item priorities, temporary item holders, pivot options, and late-game upgrades.

## Full description (English)

> Yilu Companion is a free, open-source Chinese-language educational reference for Teamfight Tactics. It organizes patch information and aggregate composition observations into static pre-game and stage-by-stage learning guides. Users manually choose among multiple compositions and stages to view example boards, leveling and economy checkpoints, item priorities, temporary item holders and transfer timing, pivot options, and late-game upgrades. The product does not connect to or read the game client; it does not ingest live match, lobby, opponent, shop, or player-action data; it does not monitor a user’s current game; and its recommendations never adapt in real time. It has no Riot account login and does not collect player identity or match history. Source observations are labeled by patch, region, rank range, date, and sample when available, while transition guidance is manually reviewed. The site is free and noncommercial.

## 中文用途说明

> 弈路助手是免费的中文云顶之弈学习与阵容参考网站。它把补丁信息、阵容搭配、示例棋盘、升级与经济节点、装备顺序、临时代持、换装时点、转阵选择和后期提升整理为静态指南。用户自行选择阵容和阶段，页面不会读取客户端、本局棋盘、商店、对手、账号或实时操作，也不会根据当前对局动态改变建议。项目免费、非商业、开源。

## Player value

> Help newer players understand economy management, transitions, item flexibility, and pivot trade-offs. The product presents multiple static options and does not replace player judgment.

## Current data flow

> Riot official patch pages and approved static assets -> scheduled server-side check -> schema and consistency validation -> human-reviewed guide data -> GitHub Pages static build. A visitor downloads only static HTML, CSS, JavaScript, and assets. No player data is sent to the project.

## Real-time behavior statement

> The stage selector only reveals pre-authored static content. It does not detect game state and does not change from player actions, lobby composition, opponents, shop rolls, or client telemetry.

## 如果申请 Production API Key

### Proposed API use

> A scheduled backend job will sample completed TFT matches from supported Riot regions, compute patch-, rank-, and region-specific aggregate composition observations, enforce minimum sample thresholds, and publish only anonymous aggregates. It will not expose PUUIDs or Riot IDs, perform player lookup, use RSO, or provide live-game recommendations.

### Requested APIs

- `tft-league-v1`: obtain stratified seed players from supported ranked regions.
- `tft-match-v1`: retrieve completed match IDs and completed match payloads.
- Data Dragon: static unit, item and trait metadata; no API key required.
- Not requested: RSO, account lookup, spectator or live-client data.

### Privacy and minimization

> PUUIDs are processed temporarily inside the scheduled backend only to discover and de-duplicate completed matches. Player identifiers are not published. Only patch-, region-, rank-, and composition-fingerprint aggregates that pass minimum sample thresholds are saved. The API key is stored only as a GitHub Actions secret and is never included in the repository, frontend, logs, artifacts, or downloadable build.

### Region limitation

Riot当前公开TFT路由不包含中国大陆腾讯服务器。Production API自动统计必须标注为全球服或具体支持区服，不能写成国服统计。中文界面和 `zh_CN` 静态资源不等于国服比赛数据。

## 截图清单

- 桌面首页：补丁、更新时间、三类阵容和开局条件索引。
- 桌面阵容详情：一页抄作业。
- 桌面对局跟玩：棋盘、人口、经济、D牌、必留与装备代持。
- 成型后提升：上谁、下谁和优先级。
- 数据来源页：分来源数据口径。
- 手机390px：首页和阶段战术板。
- Footer、Privacy与Terms。

## 提交流程

1. 使用维护者Riot账号登录 Developer Portal。
2. 选择 Register Product / Project。
3. 决定登记当前无API版本，或申请Production API用于匿名聚合统计。
4. 将本文件内容映射到实际表单字段。
5. 提交前再次确认产品描述、目标地区、数据流和联系人。
6. 提交后，Riot会提供站点验证字符串。
7. 将验证字符串原样保存到站点要求的路径并重新部署。
8. 在Portal完成验证并等待审核。

## 官方依据

- https://developer.riotgames.com/docs/tft
- https://developer.riotgames.com/policies/general
- https://support-developer.riotgames.com/hc/en-us/articles/22698431229203-Developer-Portal-Overview
- https://support-developer.riotgames.com/hc/en-us/articles/22801383038867-Production-Key-Applications
- https://support-developer.riotgames.com/hc/en-us/articles/22801461443091-Verification-for-Production-Applications
