# 弈路助手 v7 · v0 redesign brief

## Mode

Redesign · Overhaul. Keep the verified S18 data and the core gameplay-reference contract, while replacing the visual language and component anatomy.

## Preserve

- 稳定吃分 / 冲击吃鸡 / 条件阵容的内容分层
- 五阶段过渡、装备代持、换装时点与成型后提升
- 详情覆盖整个视口，并且只能通过右上角关闭按钮退出
- 不把不同来源统计合成为虚假的统一胜率
- 当前 v6 继续保留，作为内容和行为回滚基线

## Improve

- 首页先回答“选哪套”，详情先回答“现在做什么”
- 头像、职责、棋子名和装备使用独立布局层
- 棋盘格只绘制背景，不再裁切棋子名和装备
- 手机端仍显示棋子短名、装备与阶段动作
- 组件使用真实按钮、页签和步骤语义

## Remove

- 圆形头像和负坐标角标
- 大面积装饰性渐变与无作用的英文微标签
- 首页的完整阵容头像堆叠、来源徽标堆叠和假精确分数
- 低于 12px 的普通信息文本

## Protected contracts

- 真实阵容内容、装备与来源记录
- 详情仅右上角关闭
- 关闭后恢复首页滚动位置
- 桌面与手机均可用

## Design read

- Artifact: 对局旁读战术助手
- Audience: 国服新手至白金玩家，桌面副屏与手机
- Visual language: 黑曜石战术板 × 棋子编成卡
- Visual variance: 6/10
- Motion intensity: 3/10
- Information density: 8/10
- Asset dependence: 8/10
- Brand fidelity: 6/10

## Highest-risk change

首页与详情的信息架构会重排。v0只迁移小法、神谕阿狸、猎人希维尔三套真实数据，用户确认视觉与扫读节奏后再迁移全部阵容。

## Rollback

不覆盖 v6；v0 使用独立目录与独立构建产物。
