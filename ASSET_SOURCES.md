# 素材来源与发布状态

本清单记录开发原型中的图片、图标和品牌素材。**v7 尚未公开发布；“文件存在”不等于“已获准公开再分发”。** 未通过发布审查的素材不得进入 GitHub Pages 或公开 Release。

## 当前运行素材盘点

| 文件组 | 数量 | 当前来源 | 当前用途 | 公开发布状态 |
|---|---:|---|---|---|
| `src/assets/game/*.png` | 136 | CommunityDragon 16.17 对 Riot 客户端素材的转换输出 | 棋子卡、棋盘与装备 | 可按 Riot 粉丝项目政策使用；不纳入 MIT，仍以权利人政策为准 |
| `src/assets/brand/yilu-mark.svg` | 1 | 项目原创 | 弈路助手品牌标记 | 项目原创，可随代码使用 |

`public/assets/` 中如存在同名副本，沿用相同来源和状态，不重复计作新的授权。构建产物中的内嵌或复制版本也不改变原始素材的权利状态。

历史 `moba-`、`tencent-` 文件名前缀仅保留为稳定内部ID；当前二进制内容已由 `scripts/migrate-game-assets.mjs` 刷新，不代表对应网站认可或赞助本项目。逐文件URL、哈希与上游ID记录在 `data/asset-rights.json`。

## 公开发布前的处理顺序

1. 优先使用 Riot 官方允许的静态数据与素材渠道，并在下载时记录具体政策版本和原始 URL。
2. 核对素材是否允许公开缓存、再分发、转换尺寸和嵌入离线单 HTML。
3. 无法映射到记录明确的游戏素材时，从公开构建中移除，不以“免费项目”作为使用依据。
4. 使用项目原创占位图时，不仿制官方标识，也不暗示官方身份。
5. 发布前运行素材清单校验，确保代码引用的每个素材都有记录且状态为可发布。

## 新增素材记录格式

每次新增素材，应在此文件或后续机器可读清单中记录：

```text
assetId:
path:
category:
rightsHolder:
sourceUrl:
obtainedAt:
patchOrVersion:
rightsBasis:
redistributionAllowed:
modificationAllowed:
attributionRequired:
checksum:
reviewedBy:
reviewedAt:
notes:
```

如果 `redistributionAllowed` 不能明确为 `true`，该素材只能留在本地开发环境，不得进入公开构建。

## 字体

当前开发版优先使用设备系统字体，不从远程加载字体。以后如打包字体文件，必须记录字体名称、版本、许可证原文和是否允许 Web 嵌入及再分发。

## 禁止事项

- 不抓取需要登录、验证码或付费访问的素材。
- 不通过热链把第三方图片作为页面运行依赖。
- 不删除水印、署名或权利信息。
- 不把第三方素材纳入本项目 MIT License。
- 不使用 Riot、腾讯或《云顶之弈》官方 Logo 作为项目 Logo。

## 待完成发布闸门

- [x] 为136项运行时素材记录原始 URL、上游ID和哈希。
- [x] 使用 CommunityDragon 的 Riot 客户端素材转换替换历史攻略站二进制文件。
- [x] 生成 `data/asset-rights.json` 机器可读清单。
- [ ] 上线前再次核对当时有效的 Riot 素材与粉丝项目政策。
- [ ] 完成 Riot Developer Portal 产品登记与最终政策确认。
- [ ] 在首个公开 Release 中附最终第三方清单。
