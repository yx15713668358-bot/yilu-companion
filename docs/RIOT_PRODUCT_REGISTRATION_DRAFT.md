# Riot Developer Portal 产品登记草稿

更新日期：2026年9月4日

状态：已填写并尝试提交，但 Riot Developer Portal 三次返回 `Failed to create application! Selected app type is not available`，其中最后一次为退出并重新登录后的全新流程。未创建Production应用；账号内仅有系统自动生成的Development API Key。现已暂停Production申请，不再重试；支持请求草稿已取消且未提交。当前只保留官方API的本地手动验证路径，公开站继续使用人工审核的静态数据。

## 当前 Personal 私有原型申请草稿

状态：已于2026年9月4日提交，Riot已创建Personal应用；App ID为`877489`，当前状态为`Pending Review`。尚未批准或发放可用Personal Key，因此未执行真实API请求。

- Product name: `Yilu Companion Private API Prototype`
- Game: `Teamfight Tactics`
- Product URL: 留空（Personal表单可选）
- Scope: 只申请 Standard API，用于维护者本地手动验证 `tft-league-v1` 与 `tft-match-v1`
- Output: 仅写入被Git忽略的 `.private-data/riot-tft/`
- Public use: 不使用Personal Key驱动GitHub Pages，不公开Personal/Development原始响应或聚合结果

拟提交说明：

> Yilu Companion Private API Prototype is a private, local-only proof of concept used by the developer to test the official Teamfight Tactics Standard APIs and a future Production application data pipeline. It manually calls tft-league-v1 and tft-match-v1 only when the maintainer explicitly runs a local command. The key is read from a process environment variable and is never placed in source code, command arguments, logs, GitHub Actions, the frontend, or the public repository. Raw responses and anonymized aggregates remain in a Git-ignored local private directory and do not power or update the public GitHub Pages site. The prototype does not use RSO, Tournament APIs, spectator or live-client data, China/Tencent routes, player lookup, or real-time recommendations. Its purpose is limited to validating documented endpoints, routing, rate-limit handling, schemas, identifier removal, and aggregate calculations before any future Production application.

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

> Maintainers manually review official patch pages, approved static assets, and permitted public references, then commit reviewed guide data. GitHub Pages performs a deterministic static build from that commit and does not call Riot APIs or source websites. Visitors download only static HTML, CSS, JavaScript, and assets. No player data is sent to the project.

## Real-time behavior statement

> The stage selector only reveals pre-authored static content. It does not detect game state and does not change from player actions, lobby composition, opponents, shop rolls, or client telemetry.

## 如果未来恢复Production API Key申请

### Proposed API use

> A maintainer-triggered job would sample completed TFT matches from supported Riot regions and prepare private patch-, rank-, and region-specific aggregate observations for review. No API output would publish automatically. Only fields allowed by the approved Production application could be anonymized, manually reviewed, and rewritten into a later static data commit. The public product would not expose PUUIDs or Riot IDs, offer player lookup, use RSO, or provide live-game recommendations.

### Requested APIs

- `tft-league-v1`: obtain stratified seed players from supported ranked regions.
- `tft-match-v1`: retrieve completed match IDs and completed match payloads.
- Data Dragon: static unit, item and trait metadata; no API key required.
- Not requested: RSO, account lookup, spectator or live-client data.

### Privacy and minimization

> During local manual processing, PUUIDs may be handled temporarily only to discover and de-duplicate completed matches. The API key is read from a local environment variable, and all Development or Personal key output stays in the Git-ignored `.private-data/` directory. Keys, player identifiers, raw responses, and Development or Personal aggregates are never included in the repository, pull requests, GitHub Actions, frontend, logs, artifacts, GitHub Pages, or downloadable build. If Production access is approved later, any public aggregate would still require scope validation, minimum sample thresholds, anonymization, and human review before being rewritten into static public data.

### Region limitation

Riot当前公开TFT路由不包含中国大陆腾讯服务器。任何官方API统计都必须标注具体支持平台、区域、段位、补丁和日期，不能写成国服统计。中文界面和 `zh_CN` 静态资源不等于国服比赛数据。

## 截图清单

- 桌面首页：补丁、更新时间、三类阵容和开局条件索引。
- 桌面阵容详情：一页抄作业。
- 桌面对局跟玩：棋盘、人口、经济、D牌、必留与装备代持。
- 成型后提升：上谁、下谁和优先级。
- 数据来源页：分来源数据口径。
- 手机390px：首页和阶段战术板。
- Footer、Privacy与Terms。

## 若未来恢复申请

1. 重新核对当时有效的Riot政策、产品类型和Production申请入口。
2. 确认公开产品仍为静态快照，并确定Production数据允许保存和展示的字段。
3. 更新本草稿中的产品描述、目标地区、数据流和联系人。
4. 由维护者明确决定是否再次代表项目提交。
5. 如成功创建申请，再按Portal当时给出的验证步骤操作并记录真实状态。

## 官方依据

- https://developer.riotgames.com/docs/tft
- https://developer.riotgames.com/policies/general
- https://support-developer.riotgames.com/hc/en-us/articles/22698431229203-Developer-Portal-Overview
- https://support-developer.riotgames.com/hc/en-us/articles/22801383038867-Production-Key-Applications
- https://support-developer.riotgames.com/hc/en-us/articles/22801461443091-Verification-for-Production-Applications
