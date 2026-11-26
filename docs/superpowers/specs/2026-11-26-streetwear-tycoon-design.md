# Streetwear Tycoon — Design

Status: draft for approval · Date: 2026-11-26

## 1. Intent

A Windows desktop tycoon game. The player is the founder/CEO of an underground
streetwear brand that starts in a Budapest basement and grows into a global
fashion house. It should play like a classic tycoon: a steady loop of small
decisions (design → produce → sell → reinvest) with visible growth, risk, and
milestone moments.

The person commissioning it is a music producer (rage/hyperpop), not a
programmer. They will judge the game by what they see, hear and do. They
launch it by double-clicking a file on Windows.

**Success looks like:** a game that is fun in the first 10–15 minutes (fast,
rewarding progress), stays interesting as systems unlock, looks like Y2K chrome
and neon underground streetwear (not an office app), and has punchy,
self-made sound effects.

## 2. Goals, non-goals, anti-goals

**Goals**
- Double-click Windows program; no install steps beyond the download.
- All in-game text in English (streetwear slang reads naturally in English).
- Continuous time with pause and 1x / 2x / 4x speed.
- Easy / Normal / Hard chosen at new game; bankruptcy ends the game.
- Endless play with milestones (rewards + notification + sound).
- Medium-depth clothing designer with live preview.
- Webshop (permanent stock) and limited drops (announce → hype → sell out or flop);
  later wholesale.
- Factories with cost / quality / lead time / risk trade-offs.
- Marketing, team, trends, rivals, random decision events, world expansion
  (the full list in §6, delivered over four stages).
- Automatic saving plus manual saving.
- Game logic separated from presentation, covered by automated tests.

**Non-goals**
- No background music (sound effects only).
- No multiplayer, no online features, no accounts, no telemetry.
- No 3D. No walkable/animated office simulation (the user chose a living HQ
  picture instead, see §5).
- No localisation beyond English in-game text.

**Anti-goals (would make it a failure even if it "works")**
- Looking like a generic office / admin dashboard.
- Long dead waits in the first 15 minutes.
- Normal difficulty that cannot be lost: a series of bad decisions on Normal
  must be able to bankrupt the player.
- Any real brand name, logo, artist, rapper, influencer or store. All names
  are invented. No copied sound samples — every sound is synthesised by the
  game itself.
- Losing progress (crash or close without a save).

## 3. Constraints

- Target: Windows 10/11, 64-bit. Built and tested from a Linux cloud
  container; no real Windows machine is available to the builder. The build
  must be produced reliably (see §9) and the user checks the final look and
  sound on their PC.
- The user cannot run commands. Delivery must be: open a web page, click
  download, double-click.
- The unsigned program will trigger the Windows SmartScreen warning on first
  launch; the handover must explain the two clicks to get past it.
- Works fully offline once downloaded (fonts and all assets bundled).

## 4. Approaches considered (builder's call; the user delegated technology)

1. **Web technology (TypeScript + React) packaged with Electron** — chosen.
   Menus, panels and the live clothing preview are fastest to build and
   restyle in HTML/CSS/SVG; the same UI runs in a normal browser, so it can
   be play-tested automatically with the pre-installed Playwright/Chromium;
   Electron produces a Windows program from Linux. Trade-off: a large
   download (~80–100 MB) and a slightly slower first start.
2. **Game engine (Godot/Unity)** — better for animated worlds, but the game is
   mostly menus and numbers; heavier UI work, much harder to test from this
   container, and slower to restyle. Rejected.
3. **Lightweight native wrapper (Tauri)** — smaller download, but needs a
   Rust toolchain and Windows-specific build steps the container cannot
   verify as well. Rejected for risk; could be revisited later.

The user suggested approach 1.

## 5. What the player sees (decided with the user)

**Main screen = "command center + living HQ" (user's choice, option B).**

- **Top bar (always visible):** brand name and logo, cash, date, speed controls
  (pause / 1x / 2x / 4x), followers, hype meter, reputation, menu button
  (save / load / settings / quit to menu).
- **Left rail:** navigation to the screens. Locked screens are visible but
  greyed out with an unlock hint (stage they belong to is hidden from the
  player; they unlock via progress/milestones).
- **Center, HQ view (home screen):** a stylised neon picture of the brand's
  headquarters that grows with the business:
  Budapest Basement → Studio → Flagship Store → Glass Tower (stage 4).
  It is alive: blinking lights, a neon sign with the brand name, boxes whose
  pile reflects inventory, a mannequin wearing the latest design (rendered
  with the same preview renderer as the designer), team members as small
  avatars (from stage 2), a queue of people outside on drop day. Next to/below
  it: key numbers (cash this week, units sold, best seller) and a small
  revenue chart.
- **Other screens** open as chrome/glass panels over the center while time
  keeps running; the HQ remains reachable with one click.
- **Right side feed:** a ticker of what happens ("+$65 · VOID HOODIE sold",
  "Shipment arrived", "Drop in 3 days · hype 64%"). Important things also pop
  a toast; decision events open a modal and pause time.

**Visual direction:** Y2K chrome and neon on a near-black background — liquid
chrome headings, metallic bevelled pill buttons, acid-lime / hot-magenta /
cyber-cyan accents, subtle grain and scanlines, star-sparkle motifs. Bundled
open-licence fonts only. The frontend-design skill guides the detailed look.

## 6. Game design

### 6.1 Time

- Base tick = one in-game day. At 1x one day lasts 2 real seconds; 2x = 1 s;
  4x = 0.5 s. Pause stops everything.
- 7 days = a week; 13 weeks = a season (Spring, Summer, Fall, Winter);
  4 seasons = a year. The game starts on day 1 of Spring, Year 1.
- Weekly bills are charged at the start of each week (rent, platform fee,
  storage, salaries from stage 2).
- Time pauses automatically for: decision events, game over, the main menu,
  and the drop-result splash. Opening other screens does **not** pause time
  (builder's call; it is a tycoon — sales keep coming while you design).

### 6.2 Start, difficulty, bankruptcy

New game screen: brand name (free text, 2–18 characters), logo glyph + colour
(pick from a small set), difficulty. Start location: Budapest.

| | Easy | Normal | Hard |
|---|---|---|---|
| Starting cash | $25,000 | $12,000 | $6,000 |
| Customer demand | ×1.25 | ×1.0 | ×0.8 |
| Costs (production, rent) | ×0.85 | ×1.0 | ×1.15 |
| Grace period when overdrawn | 21 days | 14 days | 7 days |
| Bad-event weight (stage 2+) | ×0.6 | ×1.0 | ×1.4 |

These are starting values; stage 3 tunes them with balance simulations.

- Purchases (production orders, upgrades, marketing) are refused if cash is
  insufficient — the player can never go negative by clicking.
- Bills can push cash below zero. Then the brand is **Overdrawn**: a red
  warning with a countdown of the grace period. Getting back above $0 clears
  it. If the countdown reaches zero, the game is over (**Bankrupt** screen
  with run stats; options: load a save, new game, main menu).

### 6.3 Brand stats

- **Cash.**
- **Followers** — audience size; drives webshop traffic and drop demand.
  Grows with sales (word of mouth, weighted by how good the piece is), sold-out
  drops, marketing (stage 2); shrinks a little with flops and scandals.
- **Hype** (0–100) — fast-moving buzz; rises with teasers, drops, viral
  moments; decays daily toward a baseline. Multiplies demand.
- **Reputation** (0–100) — slow-moving trust; rises with good-quality pieces
  sold and successful drops; falls with defects, scandals, flops. Raises the
  price customers accept.

### 6.4 Clothing designer (Design Lab)

The player creates a **design** by choosing:
- **Garment:** Tee, Hoodie, Cargo Pants, Puffer Jacket, Cap, Beanie
  (more product lines in stage 4).
- **Colours:** primary and secondary from a palette of ~14 named colours
  (e.g. Jet Black, Bone, Acid Lime, Hot Pink, Cyber Blue, Chrome Silver,
  Blood Red, Olive, Sand, Purple Haze, Orange Burst, Baby Blue, Forest,
  Slate Grey).
- **Pattern:** Solid, Camo, Tie-Dye, Checker, Stripes, Flames, Y2K Grid,
  Gradient.
- **Graphic:** None, Text, or Emblem (Star, Skull, Flame, Wings, Barbed Wire,
  Alien, Heart-Lock, Lightning); text up to 16 characters with a font style
  (Gothic, Bubble, Chrome, Graffiti).
- **Material quality:** Basic, Standard, Premium, Luxe (cost vs quality).
- **Vibe** (added in stage 2 with trends): Y2K, Gorpcore, Techwear, Grunge,
  Skate, Luxury, Cyber, Retro Sport.
- **Name:** free text, with a random-name button ("VOID RUNNER HOODIE").

**Live preview:** a flat vector drawing of the garment that updates instantly
— fill colour, pattern overlay, secondary-colour details (cuffs, hood lining,
pockets, brim), the graphic printed on it. Beside it: estimated quality,
"fit with the market" meter (static Budapest taste in stage 1, live trends from
stage 2), estimated unit cost per factory, suggested price range.

Saved designs go into the **Collection**. Designs can be duplicated and edited
(editing creates a new design; existing stock keeps its old design).

### 6.5 How desirable a piece is

Desirability ("appeal") of a design combines:
- **Quality** = material base + factory modifier (+ designer skill, stage 2),
  clamped 0–100.
- **Market fit** = how well colour, pattern, garment (and vibe from stage 2)
  match current taste. Stage 1: a fixed Budapest taste table plus a simple
  seasonal effect (puffers and beanies sell better in Fall/Winter, tees and
  caps in Spring/Summer). Stage 2: live trends.
- **Price** vs a **fair price**: fair price = garment reference price ×
  quality factor × reputation factor. Pricing under fair raises sales; over
  fair lowers them steeply. Limited drops tolerate a scarcity premium that
  grows with hype.

Reference prices (starting values): Tee $35, Hoodie $75, Cargo $70,
Puffer $160, Cap $30, Beanie $25. Base unit costs at Standard material:
Tee $6, Hoodie $14, Cargo $13, Puffer $30, Cap $5, Beanie $4. Material cost
multipliers: Basic ×0.8, Standard ×1, Premium ×1.6, Luxe ×2.6; material
quality: 30 / 50 / 75 / 92.

The UI shows the player enough to reason (fair price hint, expected sales/day
range) without showing exact formulas.

### 6.6 Production (factories)

Stage 1 offers three invented factories:

| | Cost | Quality | Lead time | Min order | Defect risk | Delay risk | Scandal risk |
|---|---|---|---|---|---|---|---|
| FastLoop Textiles (cheap) | ×0.75 | −15 | 4 days | 50 | high | medium | small |
| Danube Works (mid, local) | ×1.0 | ±0 | 7 days | 30 | low | low | none |
| Atelier Nord (premium) | ×1.5 | +15 | 12 days | 25 | very low | very low | none |

- Order = design + factory + quantity. Paid in full when ordered.
- Quantity is limited by free warehouse space (stock + incoming).
- In transit: progress bar with ETA. On arrival: notification + sound,
  units go to inventory.
- Risks: **defect** (a share of the batch is unusable and written off;
  reputation dips if many); **delay** (+2–6 days); **scandal** (cheap factory
  labour exposé: reputation hit). In stage 1 these are notifications; in
  stage 2 they become decision events.
- More factories (and international ones) arrive in later stages.

### 6.7 Selling: webshop

- Any design with stock can be **listed** in the webshop with a price. Listed
  items sell continuously.
- Daily webshop visitors come from followers, hype, HQ level and difficulty.
  Visitors split their attention between listed items by appeal; more listings
  help with diminishing returns. Each item's daily sales are random around an
  expected value driven by appeal and price.
- The webshop screen shows each listing's price, stock, sold today/this week,
  and a sales trend; price can be changed at any time; items can be unlisted.
- Costs: weekly platform fee + a small cut of each sale.
- Sales sound: an aggregated "cash in" sound at most every few seconds, not
  one per item.

### 6.8 Selling: limited drops

1. **Plan:** choose a design, how many units to allocate (must be in stock, or
   arriving before the drop date), drop price, and release date 3–14 days
   ahead. Allocated units are reserved (not sold in the webshop).
2. **Countdown:** drop hype builds daily from followers and brand hype; the
   player can **post teasers** (small cost, once per day, diminishing returns).
   Too long a countdown lets hype cool (sweet spot around a week).
3. **Drop day:** demand is computed from followers, drop hype, appeal, price
   vs fair-price-with-scarcity-premium, plus randomness.
   - **SOLD OUT** (demand ≥ stock): splash "SOLD OUT IN 4 MIN", big sound,
     followers / reputation / hype boost, a fake resale price shown for flex.
   - **Solid** (50–99 % sold): moderate rewards; leftovers return to inventory.
   - **FLOP** (< 50 % sold): hype and reputation dip; leftovers return to
     inventory (sell them in the webshop, maybe discounted).
4. If the allocated stock has not arrived by drop day (factory delay), the drop
   is postponed automatically and loses part of its hype.

The HQ shows a queue outside on drop day.

### 6.9 HQ upgrades

| Level | Rent / week | Warehouse | Effect | Upgrade cost |
|---|---|---|---|---|
| Budapest Basement | $200 | 500 units | — | start |
| Studio | $600 | 2,000 units | +10 % visitors, staff slots (stage 2) | $8,000 |
| Flagship Store | $2,000 | 8,000 units | +25 % visitors, walk-in sales | $60,000 |
| Glass Tower (stage 4) | $8,000 | 50,000 units | global HQ | $500,000 |

Weekly storage cost per unit in stock makes over-production hurt.

### 6.10 Stage 2 — trends, marketing, team, events

- **Trends:** every colour, pattern, garment type and vibe has a popularity
  that moves through a lifecycle (emerging → rising → peak → fading → dead);
  new trends spawn over time. Market fit uses live popularity. A **Trend Board**
  shows what is hot now. The future is fogged unless the player buys a
  **trend report** (one-off forecast for the next weeks) or employs a trend
  analyst (continuous forecast).
- **Marketing:**
  - Social posts on invented platforms (post types: fit pic, behind the
    scenes, meme, teaser); cheap; chance to go viral depends on hype, trend
    fit and marketer skill; viral = follower surge.
  - Paid influencers (invented people) with audience size, fee, audience fit
    and a scandal risk.
  - Collabs with invented rappers/artists: fee (+ revenue share), unlock a
    collab drop with a big hype boost; artists have their own heat and can
    cause drama.
  - Fashion shows / fashion weeks come in stage 4.
- **Team:** individual employees with name, role (Designer, Marketer,
  Sourcer, Manager, Trend Analyst), skill, weekly salary, mood and a trait
  (e.g. Perfectionist, Hype Beast, Loyal, Diva). Hire from a candidate pool
  that refreshes weekly; staff slots depend on HQ level. Effects: designers
  raise quality and fit, marketers boost posts and hype, sourcers cut costs
  and defects, managers keep mood up and reduce bills, analysts forecast
  trends. Mood moves with pay vs. market, workload, wins and losses; actions:
  raise, bonus, team night out. Low mood for too long → they quit (with a
  warning first).
- **Random events with decisions:** an event deck with conditions and weights,
  e.g. viral post, factory scandal, defective shipment, a rapper wears your
  piece unprompted, influencer drama, warehouse leak, tax audit, counterfeits,
  staff poached (rival attacks join in stage 3). Each shows 2–3 choices with
  visible hints ("Costs $3,000", "Risky") and uncertain consequences; time
  pauses; the outcome is reported afterwards.

### 6.11 Stage 3 — rivals, wholesale, milestones, difficulty

- **Rivals:** 6–8 invented brands, each with a personality (e.g. copycat,
  luxury snob, hype machine, eco brand) and preferred vibes. Simulated weekly:
  followers, revenue, hype, their own drops (in the feed), chasing trends
  (which saturates a trend and reduces its payoff), sometimes copying the
  player's hit design. **Beef:** relationship meter; call-outs raise both
  sides' hype with risk. **Leaderboard:** ranking by brand value.
  Rival-attack events join the event deck.
- **Wholesale:** invented stores offer bulk orders (larger volume, ~50 %
  of retail price, reputation threshold, payment after a delay → cash-flow
  risk, occasional cancellation). Accept or decline offers.
- **Milestones:** first sale, first sold-out drop, 1,000 units sold,
  $100k revenue, $1M revenue, 10k / 100k / 1M followers, first employee,
  first foreign market, top 3 / #1 on the leaderboard, IPO, … Each gives a
  reward (cash, followers, unlock), a notification and a sound. A trophy
  screen lists them.
- **Difficulty tuning** with automated balance simulations (see §8).

### 6.12 Stage 4 — world, product lines, acquisitions, stock market, shows

- **World map:** Budapest plus London, Paris, Tokyo, Los Angeles, Seoul (more
  may follow). Each market: entry cost, size, taste offsets, local rivals.
  Entering adds a market's demand (shipping or a local store).
- **New product lines:** Sneakers, Jewelry, Bags, Perfume — unlocked with an
  investment; each gets its own preview drawing and economics (perfume: high
  margin, etc.).
- **Acquisitions:** buy a rival once you are big enough; absorb its followers.
- **Investors:** funding rounds (cash for equity) with growth expectations;
  **IPO** at a value threshold; afterwards a share price that reacts to
  quarterly results.
- **Fashion shows and fashion weeks:** plan a show (budget, venue), apply to
  invented fashion weeks with a reputation threshold; big reputation/hype
  payoff, real cost.
- **Glass Tower** HQ level.

## 7. Sound

Sound effects only, synthesised live by the game (no samples, no copied
audio). Character (builder's call, given the user's taste): bright, glittery,
slightly detuned/bitcrushed hyperpop flavour with punchy 808-style lows.

Stage 1 set: UI click, hover tick (very quiet), cash in, production arrived,
notification ping, drop announced (sweep), SOLD OUT (riser + hit + shimmer
chord), flop (deflating pitch-down), error/denied, scandal/bad news (detuned
low stab), bankrupt (long downward sweep). Later stages add: milestone
fanfare, viral, event appears, hire, beef.

Settings: master SFX volume and mute. Cash-in sounds are rate-limited and
slightly varied in pitch so they don't get annoying.

## 8. Saving, testing and quality

**Saving**
- Autosave every in-game week and when the window is closed; one autosave
  slot plus 3 manual slots (name, date, cash shown). Load from the main menu
  and the in-game menu.
- Saves are files in the user's app-data folder. Each save carries a format
  version; later stages load earlier-stage saves by filling new fields with
  defaults.

**Architecture rule:** the game logic (money, time, sales, trends, events…)
lives in its own part with no screen code. It is deterministic given a random
seed stored in the save, so tests can replay exact situations.

**Automated checks (must pass before any stage is called done)**
- Logic tests for every system (time, orders, sales, drops, bills,
  bankruptcy, saves, …).
- **Balance simulations** that play many in-game months with scripted
  strategies:
  - a sensible strategy on Normal grows (cash and followers up, Studio
    affordable within roughly the first 10–15 real minutes at 1x–2x);
  - a sequence of bad decisions on Normal (over-produce, over-price, cheap
    risky factory) goes bankrupt;
  - Easy forgives the same bad sequence longer than Normal; Hard punishes it
    faster.
- **Play-through test:** an automated browser session plays a short round
  (new game → design → order → wait → list in webshop → schedule drop → drop
  result → save → reload) and takes screenshots for review.
- **Program check:** the packaged desktop program starts, shows the main
  menu, and saves to disk.
- **Sound check:** each sound renders without errors, is not silent and does
  not clip.

**Pacing targets (Normal):** first sale within ~1 real minute of first stock
arriving; first drop possible within ~3 minutes; a noticeable "level-up"
(HQ upgrade or milestone) within 10–15 minutes of decent play.

## 9. Delivery

- Every stage is saved as a named restore point in version control and
  produces a downloadable Windows program (single .exe, no installer)
  published on the repository's GitHub Releases page, built on a Windows build
  machine in GitHub's own automation. Fallback if that route fails: build the
  .exe in the container.
- Handover per stage: 2–4 plain Hungarian sentences — does it work, what is
  new, exactly how to download and start it (including the SmartScreen
  "More info → Run anyway" step), what to look and listen for.

## 10. Builder's calls already made (user to confirm)

- Currency is US dollars ($) everywhere — global-brand feel, and the
  "first $1M" milestone reads naturally.
- Pace: 1 in-game day = 2 s at 1x (a season ≈ 3 minutes at 1x).
- Time keeps running while the player is in menus; it pauses only for
  decision events, the drop-result splash, game over and the main menu.
- Sound character: glittery, detuned, bitcrushed hyperpop flavour with
  808-style lows.
- Brand name and logo are chosen by the player at new game; the brand logo
  is also available as an emblem in the designer.
- One active drop at a time in stage 1 (more slots may unlock later).
- Single .exe, no installer.
- A short "first steps" checklist guides the first minutes.

## 11. Left to the builder

Exact formulas and constants (within the targets above), file/module
structure, library choices, UI layout details within §5, the invented names
of factories/brands/people, sound design details, how locked screens are
teased, onboarding hints for the first minutes (a short "first steps"
checklist is expected), window size (default 1600×900, resizable, minimum
1280×720, fullscreen toggle).

## 12. Stage 2 builder's calls (2026-11-26)

- Posting is free, limited to 1 post a day (+1 per marketer, max 3); posts give small growth, rare viral spikes.
- Trend research: a report ($1,500) shows 6 weeks ahead for 6 weeks; a Trend Analyst shows 2–5 weeks ahead permanently. Current popularity and last week's movement are always visible; hot/rising options are outlined in the Design Lab.
- Random decision events arrive roughly every 18 in-game days (about 35 s at 1x); time pauses until you choose.
- Four job candidates (four different roles) every Monday; desks: Basement 2, Studio 5, Flagship 10.
- An artist collab powers up the next drop and takes 15% of that drop's revenue.
