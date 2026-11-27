# Hand to hand (Kézről kézre) — prototype test results, 2026-11-27

## What was built
- A sold tee from a drop (single or multi-piece) is followed: at most one per game, only if at least one tee sold.
  Wearer (Mira, Kőbánya rehearsal room / Bence, Csepel sound booth) is chosen from the drop id, so the game's random sequence is untouched.
- 21 days later a photo returns once, as a normal decision window (saved, reloadable): the player's own tee from the back, sleeves cut off, own back print visible.
- Choice A: make 8 cut tees for the club — new design variant (cut, wearer's name credited on the back), real production order at FastLoop (real unit cost, 8 warehouse spaces, factory lead time; factory minimum waived for this small run). The club pays 75% of the drop price per piece on delivery, once.
- Choice B: say no — nothing spent, story ends.
- Passing the tee around never earns money; only the club delivery is revenue. Old saves load with an empty log.
- Lookbook "Out in the city": design table (back) · photo · club run, with status line.
- Phone: all buttons ≥ 44×44 px, collapsed feed is one line, smaller photo in landscape.

## Code
- src/engine/lifepath.ts (rule, offer, decision), types.ts (LifePath, Design.cut/credit), drops.ts (start after a sale), tick.ts (daily check), events.ts (decision lookup), production.ts (smallRun).
- src/ui/components/WornPhoto.tsx, GarmentPreview.tsx (cut + credit), game/EventModal.tsx, game/Lookbook.tsx, styles/app.css.

## How to reproduce
```
npm install
npx vitest run                                   # 136 passed, 1 skipped (incl. 7 new in lifepath.test.ts)
npm run build
xvfb-run -a npx playwright test --trace off --project browser --project desktop --project iphone
# 21 passed: incl. e2e/handtohand.spec.ts (desktop 1280x720 and iPhone 393x659 at 130%)
```
Screenshots: test-results/handtohand/*.png

## Checked by machine
- zero sales → no story; single drop → story; two-piece drop (tee + bag) → follows the tee, drop totals unchanged
- photo comes exactly once, also after save + reload; accept → real order, cash and space go down, delivered once (also from a reloaded save); decline → nothing spent; refused without cash
- old save without the field loads and plays a day
- 1280×720, iPhone portrait at 130%, iPhone landscape with reduced motion: decision fits / scrolls, buttons ≥ 44 px
- the 19 earlier play-throughs incl. Electron launch and iPhone portrait/landscape still pass

## Not checked (needs a human / real device)
- real iPhone and real Windows PC; WebKit project (iphone-webkit) not run here (no WebKit browser in this container)
- undo of the decision itself (the game's 5-second undo covers normal actions, not decision windows)
- whether a player recognises their tee the next day and changes a production decision because of it — the human test question
