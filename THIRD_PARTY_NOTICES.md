# 第三方声明

本文件用于说明第三方内容与项目代码许可证的边界，并作为每次公开发布的检查清单。

## 许可证范围

[MIT License](LICENSE) 只适用于本仓库中由项目贡献者编写的原创程序代码。除非另有明确书面说明，MIT 不覆盖：

- 《云顶之弈》及相关棋子、装备、羁绊和游戏美术。
- Riot Games、腾讯游戏或其他权利人的名称、商标和标识。
- 第三方阵容网站提供的图片、评级、统计、文字或页面设计。
- 第三方字体、图标、音频和其他媒体文件。
- 原始数据本身可能附带的数据库权利或使用限制。

仓库可公开访问不等于其中每项第三方内容都可自由再分发、修改或商用。

## Riot Games 与《云顶之弈》

《云顶之弈》、Riot Games 以及相关名称、商标和游戏资产归 Riot Games, Inc. 或其关联权利人所有。

弈路助手是独立制作的非官方玩家项目，与 Riot Games 无隶属关系，也未获得其认可、赞助或合作背书。项目公开前应按当时有效的 Riot 开发者政策、粉丝内容政策和静态数据使用规则完成复核；政策可能变化，不能只依赖历史记录。

> Yilu Companion was created under Riot Games' "Legal Jibber Jabber" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.

> Yilu Companion isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

## 腾讯游戏与国服内容

腾讯游戏网站、国服客户端及专题页面中的名称、本地化文字、图片和其他内容归相应权利人所有。它们不受本项目 MIT 许可证覆盖。

文件名中的 `tencent-` 前缀是历史内部ID，不代表当前文件由腾讯网站提供。运行素材的当前来源与哈希以 `data/asset-rights.json` 为准。

## 第三方阵容与统计网站

项目可能参考公开阵容和统计网站，用于交叉核对阵容结构、评级、样本和运营节奏。来源示例可能包括 Mobalytics、EmblemComp、tactics.tools、SeeMeta、TFT Lab 等。

- 各站点名称、数据和内容归其各自权利人所有。
- 来源链接仅用于追溯，不表示该站点认可本项目。
- 项目应记录有限的事实字段和自行整理的摘要，不大段复制攻略文字。
- 使用自动化前必须核对各站点当时有效的条款、robots 指令和访问限制。
- 不绕过登录、验证码、付费墙、访问控制或反爬措施。
- 如果站点不允许自动化使用，应停止对应适配器，不以技术手段规避限制。

文件名中的 `moba-` 前缀同样只是历史内部ID。当前公开构建只使用 Riot Data Dragon 可映射素材与项目自有占位图；游戏美术权利仍归 Riot Games 或相应权利人，不纳入 MIT。处置状态见 [ASSET_SOURCES.md](ASSET_SOURCES.md)。

## 开源依赖

JavaScript 依赖拥有各自的许可证。安装后可在各包的 `package.json` 或许可证文件中查看。项目自身的 MIT License 不替代这些依赖的许可条件。

维护者应在正式 Release 前生成并检查依赖许可证清单，确保分发方式与依赖条款兼容。

## 用户提交内容

贡献者不得提交无权再分发的截图包、提取素材、付费内容、完整攻略转载或第三方字体。提交素材时必须同时更新 [ASSET_SOURCES.md](ASSET_SOURCES.md) 并提供使用依据。

如权利人认为仓库中的内容不应使用，请通过仓库维护渠道联系。维护者应先暂停对应内容的发布，再核对权利状态。
