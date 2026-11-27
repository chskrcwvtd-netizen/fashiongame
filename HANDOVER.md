# Streetwear Tycoon — handover (for the next AI assistant)

Written 2026-11-27 when the project moved from Claude Code to another assistant.

## Who the user is and how to talk to them (important)

- Music producer (rage/hyperpop, FL Studio), **not a programmer**. Does not read code, terminal output or file paths.
- Write in **plain Hungarian**, short. No jargon (function, build, commit, dependency…); if unavoidable, explain in one sentence, ideally with a music analogy.
- Do all technical work and technical decisions yourself. **Do not ask many questions** — the user finds frequent decisions/approvals very annoying. Pick the best option and say in one line what you chose.
- At the end of each task say: is it done and working (yes/no/partly), what changed that they will see/hear, and exact click-by-click steps if they must do something.
- Never say "done" without testing; say plainly what you could not check (e.g. real Windows launch, sound on their device).
- Every reply ends with two lines (their standing request):
  - `Ajánlott skill a következő lépéshez: … – …`
  - `Ajánlott effort a következő lépéshez: low|medium|high|xhigh|max – …`
- Game text is **English**. Only invented brands, rappers, influencers, shops. **No copied sounds**: every sound effect is synthesised in code.
- The user said the **Windows version must not change** when adding the iPhone version.

## What the game is

A tycoon game: you are CEO of an underground streetwear brand starting in a Budapest basement. Design clothes, order from factories, sell in a webshop, run limited "drops", marketing, team, trends, rival brands, wholesale, world expansion, investors/stock market, runway shows, loans, own factory, challenges/sandbox modes. Version 0.5.0.

## Tech

- Electron 45 + Vite 5 + React 18 + TypeScript. Tests: Vitest (125 unit tests) + Playwright (12 end-to-end incl. Electron launch and an iPhone touch run).
- Fonts via @fontsource (Unbounded, Chakra Petch, UnifrakturMaguntia, Rubik Bubbles, Permanent Marker).
- `src/engine/` — pure deterministic game logic (seeded RNG in `state.rngState`, `advanceDay(state)` returns events). Content in `content.ts`, events in `events.ts`/`events2.ts`, extras (loans, factory, shares, challenges…) in `extras.ts`. Bots for balance tests in `src/engine/sim/bots.ts`.
- `src/store/gameStore.ts` — clock (2 s per day at 1x), feed, toasts, sounds, weekly autosave, 5 s undo; exposed as `window.__store` for tests.
- `src/ui/` — React screens (`App.tsx`, `game/*` panels, `screens/MainMenu.tsx`, `screens/Settings.tsx`). One stylesheet: `src/styles/app.css`.
- `src/audio/sfx.ts` — all sound effects synthesised with Web Audio (19 sounds, limiter, 3 sound styles). `src/audio/music.ts` — plays the user's own tracks (desktop only, from a music folder).
- `src/platform/storage.ts` — saves: Electron files (desktop), browser localStorage, plus on the Claude page a private cloud copy (`WebBackend`). Save format version 4 with migrations.
- `electron/main.ts`, `electron/preload.ts` — window, save files, music protocol `swt-music://`, autosave on close.
- Design spec: `docs/superpowers/specs/2026-11-26-streetwear-tycoon-design.md`; stage plans in `docs/superpowers/plans/`.

## Commands

```
npm install
npm test                      # unit tests
npm run build                 # type check + web build + electron build
xvfb-run -a npx playwright test --trace off   # e2e (Linux, headless)
npm run dist:win              # Windows portable .exe in release/ (needs wine on Linux for the icon)
npx vite build                # web/iPhone build only, output dist/
```

## Versions that exist

1. **Windows**: `release/StreetwearTycoon.exe` (portable, 0.5.0) plus `installer/Install-StreetwearTycoon.cmd` / `Uninstall-…cmd` (copy exe + shortcuts). Not tested on a real Windows PC by the assistant.
2. **iPhone / web**: the same game in the browser. Phone-only layout lives entirely in `src/styles/app.css` under `@media (max-width: 900px), (max-height: 520px)` (the desktop window is min 1280×720, so desktop is pixel-identical — this was verified). It was published as a private Claude page (claude.ai artifact) — the next assistant cannot update that page; to host it elsewhere, deploy the `dist/` folder to any static host (Netlify, GitHub Pages, Vercel). On iPhone: open in Safari → Share → Add to Home Screen (manifest + icons are in `public/`).

## Source code

GitHub: `chskrcwvtd-netizen/fashiongame`, branch `claude/streetwear-tycoon-game-x4mvfb` (the only branch). The zip handed over contains the same source.

## Open items / next steps

- A full phone QA pass was started but stopped before reporting. Next: test every screen on an iPhone-sized screen (portrait + landscape) for overlaps, cut-off text, small tap targets; fix in the phone media query only.
- Fixed already: Design Lab preview sliding over text (was `position: sticky` on `.lab-stage`).
- Not verified: real Windows launch, sound on the user's devices, the .cmd installer scripts, long-run balance of the newest events (an emergency loan delays bankruptcy on Normal to ~1–2 years).
- On iPhone: own music, "Save as image" and "Report a problem" are not available (they need files on a PC).
