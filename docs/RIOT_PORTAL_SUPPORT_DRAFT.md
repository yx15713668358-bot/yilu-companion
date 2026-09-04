# Riot Developer Portal support request draft (cancelled)

Updated: 2026-09-04 (China Standard Time)

Status: Cancelled. Not submitted. Retained only as a record of the three failed Production application attempts; do not send this draft unless the maintainer explicitly reopens the Production application plan and updates every claim.

## Archived subject

Production TFT application fails with "Selected app type is not available"

## Archived request text (not sent)

Hello Developer Relations team,

I am trying to register a Production application for a public Teamfight Tactics website. The Developer Portal lets me select **Production API Key**, accept the General and Tournament Policies, complete the New Product Application form, select **Teamfight Tactics**, and select **No** for tournaments. After I press Submit, the portal returns:

> Failed to create application! Selected app type is not available

I repeated the flow once in English from a freshly loaded Product Type page, then signed out and signed back in and completed one final fresh attempt. All three attempts returned the same error. No Production application was created; the Applications page shows only the automatically generated Development API Key application.

Product details:

- Name: Yilu Companion (弈路助手)
- Working site: https://yx15713668358-bot.github.io/yilu-companion/
- Privacy Policy: https://yx15713668358-bot.github.io/yilu-companion/privacy.html
- Terms of Use: https://yx15713668358-bot.github.io/yilu-companion/terms.html
- Game: Teamfight Tactics
- Tournaments: No
- Requested access: Production key for Standard APIs only (`tft-league-v1` and `tft-match-v1`)
- No RSO, Tournament API, spectator data, live-client data, or player-specific public statistics

Could you please confirm whether Production application registration is currently available for this account and Teamfight Tactics, and advise how I should proceed?

Thank you.

## Reproduction steps

1. Sign in to https://developer.riotgames.com/.
2. Select Register Product.
3. Select Production API Key.
4. Accept the General and Tournament Policies.
5. Complete all required fields.
6. Select Teamfight Tactics and No tournaments.
7. Submit the form.
8. Observe the error above.

## Evidence retained locally

- The portal displayed the same error after three complete submission attempts, including one after a fresh login.
- The working site, Privacy Policy, and Terms of Use each returned HTTP 200 immediately before submission.
- The project repository and GitHub Pages deployment were healthy at the time of submission.
