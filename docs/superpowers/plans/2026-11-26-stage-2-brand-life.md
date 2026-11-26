# Stage 2 (Brand Life) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add live trends with research, marketing (posts, influencers, artist collabs), a team of named employees with mood, and random events with 2–3 choices — on top of the Stage 1 build.

**Architecture:** New engine modules `trends.ts`, `marketing.ts`, `team.ts`, `events.ts` (pure, seeded, tested); existing modules call small effect helpers from them. Save format v2 with a v1→v2 migration. New UI panels Trends, Marketing, Team and an event modal; the store pauses time while an event waits for a choice.

**Spec:** `docs/superpowers/specs/2026-11-26-streetwear-tycoon-design.md` §6.10 (plus §5, §7, §8)

## Global Constraints
- All names invented (artists, influencers, platforms, employees). Platforms: Loopz (short video), Glint (photos).
- Events pause time; every event shows 2–3 options with visible hints; outcome text shown after choosing.
- Save `version: 2`; v1 saves load (migration fills defaults; design vibe derived from pattern).
- Stage 1 balance tests keep passing (bots resolve events with option 0, smart bot uses posts + staff).
- Staff slots: Basement 2, Studio 5, Flagship 10.

## Review Focus
1. Loading a Stage 1 save → migrates, keeps cash/designs, gets vibes. (`migrates v1 save`)
2. Event arrives while another is pending → queued, never lost or doubled. (`queues events while one is pending`)
3. Employee quits while assigned effects are cached → effects drop immediately. (`quitting removes effects`)
4. Salaries push cash negative → overdrawn path as before. (`salaries are part of weekly bills`)
5. Influencer/collab hired twice / with no cash → refused. (`refuses double campaign`)

## Tasks
1. **Trends** — `trends.ts`: `initTrends`, `weeklyTrendUpdate`, `trendPop(state, cat, id)`, `forecast(state, weeks)`, `intelHorizon`, `buyTrendReport`. Vibe added to designs; `marketFit` blends static taste (35%) and live popularity (65%). Tests: popularity stays 0..1, a hot trend eventually fades, ignitions appear in forecast before they start, report charges cash and opens forecast, fit follows trends.
2. **Team** — `team.ts`: candidates (4, weekly refresh), `hire`, `fire`, `giveRaise`, `giveBonus`, `teamNight`, `weeklyTeam` (mood, warnings, quitting), effect helpers (`designerBonus`, `sourcerCostMult`, `sourcerDefectMult`, `marketerViralBonus`, `postsPerDay`, `managerBillMult`, `analystHorizon`). Tests: slots, salary in bills, underpaid mood drops then quits, raise lifts mood, effects apply and vanish on quit.
3. **Marketing** — `marketing.ts`: `postSocial`, `hireInfluencer`, `signCollab`, active boosts, `visitorMult`, collab drop bonus. Tests: post limit per day, viral more likely with marketers/hype, influencer adds followers and visitors for 7 days, refuses double campaign, collab boosts next drop then ends.
4. **Events** — `events.ts`: deck of 14 events with conditions/weights, `maybeTriggerEvent`, `queueEvent`, `resolveEvent`. Factory defects and scandals become decision events. Tests: deterministic trigger, min gap, queue, each event's options all resolve without error on a busy state, defect options behave.
5. **Integration + save v2 + balance** — tick wiring, bills, migration, bots updated; all old tests green.
6. **UI** — Trends, Marketing, Team panels; vibe + trend badges in Design Lab; event modal; staff in HQ scene; splash bleed fix; nav unlock.
7. **E2E + package** — browser test covers post, hire, trend report, event choice; Electron test; rebuild .exe and send.
