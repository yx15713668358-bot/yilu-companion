# 弈路助手

面向《云顶之弈》玩家的中文阵容学习与对局旁读工具。目标不是再做一份“只给最终答案”的阵容榜，而是把一局游戏拆成能直接执行的步骤：什么时候升级、留多少钱、是否搜牌、哪些牌必须留、装备先给谁、何时换装，以及条件不对时转去哪里。

- 在线版：https://yx15713668358-bot.github.io/yilu-companion/
- 离线单HTML：https://yx15713668358-bot.github.io/yilu-companion/downloads/yilu-s18-offline.html

> 项目状态：**v7.0.0-rc2 公开测试版。** 已迁移16套阵容与80个过渡阶段。GitHub Pages只展示人工审核并提交的静态快照，不执行每日数据更新。

## 核心能力

- 按稳定吃分、冲击吃鸡和条件阵容区分目标。
- 从开局到成型展示阶段棋盘、人口、经济和搜牌停止条件。
- 展示必留牌、临时牌、装备合成顺序、代持人与换装时点。
- 提供成型后的升人口路线、替换顺序和决赛圈站位建议。
- 对不同来源的评级、样本和统计口径分别展示，不制造“统一胜率”。
- 保留Riot官方补丁页检查和TFT API本地工具，但都只能由维护者显式手动运行。
- GitHub Pages从已审核的仓库数据确定性构建，不联网读取补丁页、Riot API或第三方阵容站。
- 保留可直接双击使用的离线单 HTML 构建。

## 不做什么

- 不接入、读取或修改游戏客户端。
- 不读取实时对局、对手阵容、商店、战绩或用户账号数据。
- 不自动替玩家操作游戏，也不提供实时对手追踪。
- 不承诺某套阵容必定上分或获得第一名。
- 不把来源不足的新阵容自动发布为正式攻略。

## 当前版本

当前 v7 使用 React、TypeScript 和 Vite。页面已经采用矩形棋子牌、全屏详情和五阶段战术板，包含16套阵容与80个阶段。

```bash
npm install
npm run dev
```

提交改动前运行：

```bash
npm run verify
```

GitHub Pages构建位于 `dist/`；可双击使用的单HTML位于 `dist-single/index.html`。

手动检查官方补丁页：

```bash
npm run check:patch:live
```

手动Riot TFT API工具见 [docs/RIOT_TFT_MANUAL_API.md](docs/RIOT_TFT_MANUAL_API.md)。它只从本地环境变量读取密钥，并把结果写入被Git忽略的 `.private-data/`。`npm run verify`、CI和Pages部署都不会调用官方API。

## 数据维护与公开边界

1. 官方补丁说明只用于确认版本和数值改动。
2. 阵容评级至少交叉核对两个相互独立的公开来源。
3. 每条统计保留补丁、地区、段位、样本、观察时间和原始链接。
4. 来源冲突时分别展示，不合并成一个看似精确的数字。
5. 统计、趋势、排序、过渡、装备、转阵和升人口路线都必须经过人工复核后提交。
6. 新阵容先作为人工候选补齐完整流程，审核通过后才能进入公开快照。
7. Personal或Development API Key只用于本地验证。其原始响应、玩家标识和聚合结果不得提交、部署或打包。
8. 只有取得适用的Production授权后，API聚合结果才可进入人工复核流程；通过复核并转写为匿名公开字段后，仍以普通静态提交发布。
9. 版本变化不会自动改写页面。公开站持续展示最近一次人工审核快照，并明确核对日期。

完整方法见 [DATA_METHODOLOGY.md](DATA_METHODOLOGY.md)，数据字段见 [DATA_SCHEMA.md](DATA_SCHEMA.md)。

网站隐私与使用边界见 [PRIVACY.md](PRIVACY.md) 和 [TERMS.md](TERMS.md)。
Riot产品登记历史草稿见 [docs/RIOT_PRODUCT_REGISTRATION_DRAFT.md](docs/RIOT_PRODUCT_REGISTRATION_DRAFT.md)。Production申请当前暂停，支持请求草稿已取消且未发送。
第三方数据授权询问的存档草稿见 [docs/DATA_SOURCE_PERMISSION_REQUESTS.md](docs/DATA_SOURCE_PERMISSION_REQUESTS.md)；当前不运行第三方自动适配器。

## 参与贡献

欢迎报告页面问题、数据纠错或提交新阵容。开始前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。涉及数据的提交必须提供可公开访问的来源；涉及图片、图标或字体的提交必须同时说明来源和可使用依据。

## 开源与第三方内容

- 本仓库中由项目贡献者编写的**程序代码**采用 [MIT License](LICENSE)。
- MIT 不覆盖棋子图片、装备图片、游戏名称、第三方统计、第三方文字、字体、商标或其他外部内容。
- 当前136个素材引用中，120个已映射到Riot Data Dragon官方静态素材；16个暂缺官方映射的野怪引用使用项目自有占位图。逐项URL和哈希均已记录。游戏素材不纳入MIT，也不代表可以脱离Riot政策商用。
- 素材处理清单见 [ASSET_SOURCES.md](ASSET_SOURCES.md)，完整声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 非官方声明

弈路助手是独立制作的非官方玩家项目，与 Riot Games、腾讯游戏及任何阵容数据网站均无隶属、认可、赞助或合作关系。《云顶之弈》、Riot Games 以及相关名称、商标和游戏资产归其各自权利人所有。

项目内容仅作阵容学习和赛前/旁读参考。版本环境、样本口径和实际对局会影响结果，请以游戏内当前版本为准。

## 安全

请不要在 Issue 中提交账号、Cookie、访问令牌、客户端日志中的个人信息或未公开漏洞。安全问题请按 [SECURITY.md](SECURITY.md) 的方式报告。
