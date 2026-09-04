# 第三方数据授权询问存档草稿

状态：未发送，当前不计划发送。仅保留为历史草稿；项目现行模式是人工核对第三方公开页面，不运行第三方自动适配器。

自动适配器保持禁用。未来如重新考虑第三方自动接口，应先复核当时有效的条款和项目范围，再重新起草授权请求；不得直接发送本文件中的旧模板。

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

## 未来如重新取得许可

1. 将许可邮件或公开条款的日期、允许字段和频率记录到 `data/source-registry.json`。
2. 只启用站方指定的公开接口。
3. 为适配器增加最小响应夹具和结构漂移测试。
4. 更新 `DATA_METHODOLOGY.md` 与 `THIRD_PARTY_NOTICES.md`。
5. 自动调用仍不能直接影响公开站；结果必须经过人工复核并作为静态数据提交。
