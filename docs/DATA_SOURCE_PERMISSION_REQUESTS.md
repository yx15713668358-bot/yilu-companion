# 第三方数据授权询问草稿

状态：仅草稿，尚未发送。

自动适配器在收到明确书面许可前保持禁用。发送任何邮件或表单前，应确认收件地址、发送身份和最终内容。

## 通用英文模板

Subject: Permission request for low-frequency TFT aggregate data access

> Hello,
>
> I maintain Yilu Companion, a free, noncommercial, open-source Chinese-language educational reference for Teamfight Tactics:
>
> Website: https://yx15713668358-bot.github.io/yilu-companion/
> Repository: https://github.com/yx15713668358-bot/yilu-companion
>
> We would like to ask whether you can authorize a low-frequency automated integration using an endpoint and terms you approve. The intended schedule is at most one request per day. We would retain only limited aggregate facts such as patch, composition identifier or fingerprint, editorial tier, average placement, top-four rate, first-place rate, sample size, rank range, region, observation date, and a direct attribution link.
>
> We would not copy guide prose, images, page design, account-only content, paywalled content, or personal player data. We would not bypass access controls, rate limits, robots directives, or anti-automation measures. If permitted, we will use a descriptive User-Agent, conditional requests, local caching, timeout and backoff, and will immediately disable the adapter if permission is withdrawn.
>
> Could you confirm:
>
> 1. Whether automated access is permitted for this project.
> 2. Which public API or endpoint we should use.
> 3. The allowed request frequency and caching period.
> 4. Which fields may be stored and republished.
> 5. Your required attribution format.
>
> If automated use is not permitted, we will keep your site as a manual reference link only.
>
> Thank you.

## 站点处理建议

- Mobalytics：现有条款明确限制自动工具；必须取得书面例外或正式接口后才能启用。
- EmblemComp：条款限制自动提取和再分发；必须取得书面许可。
- tactics.tools：条款未明确授权机器再利用；优先联系其条款页公布的邮箱。
- SeeMeta：未找到公开API或机器再利用许可证；通过站点联系渠道询问。
- TFT Lab：有限请求规则不等于允许重新包装数据；确认允许字段、接口和再发布范围。

## 收到回复后的仓库动作

1. 将许可邮件或公开条款的日期、允许字段和频率记录到 `data/source-registry.json`。
2. 只启用站方指定的公开接口。
3. 为适配器增加最小响应夹具和结构漂移测试。
4. 更新 `DATA_METHODOLOGY.md` 与 `THIRD_PARTY_NOTICES.md`。
5. 通过质量闸门后，才允许数据影响首页排序。
