# Stage 4 (World Brand) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** Turn the Budapest brand into a world brand: world map with five cities, four new product lines, buying rivals, investors and an IPO with a share price, fashion weeks and runway shows, and the Glass Tower HQ.

**Spec:** `docs/superpowers/specs/2026-11-26-streetwear-tycoon-design.md` §6.12 (+ §13 decisions)

## Builder's decisions
- Cities: London, Paris, Tokyo, Los Angeles, Seoul. Each city has two levels: **Ship there** (entry fee + weekly fee) and **Open a store** (bigger fee + rent, walk-in shoppers). Each level adds audience room (the follower ceiling becomes home 120k + cities) and webshop visitors. Each city loves two vibes: matching pieces sell up to 30% better.
- Product lines: Sneakers ($40k), Bags ($60k), Jewelry ($90k), Perfume ($150k) — one-off investment, then they appear in the Design Lab with their own drawings. Perfume: cheap to make, high margin.
- Glass Tower: 4th HQ level ($500k, rent $8k/week, 50k warehouse, 20 desks), needs 2 cities opened.
- Acquisitions: a rival can be bought when your brand value is at least 1.5× theirs; price = 60% of their value. You absorb half their followers and keep 30% of their weekly sales as income; they leave the chart.
- Investors: Seed ($1M value → $250k for 10%), Series A ($5M → $1.5M for 15%), Series B ($20M → $6M for 15%). Each round sets a growth target (+60% value in a year); missing it triggers a board event.
- IPO at $40M value: sell 20% for cash, then a weekly share price that follows brand value growth with noise; every 13 weeks an earnings report beats or misses expectations (price jump/drop, feed news).
- Fashion weeks: four invented weeks a year (Danube, Paris Atelier, Tokyo Neon, LA Concrete) with reputation thresholds; pick a show budget; on the day a result splash (reputation, hype, followers; can flop). Plus an any-time runway show at the Flagship or Tower.
- Save v4: migration fills new fields and the trend values for new product lines.

## Review Focus
1. Old saves without trend values for new pieces → trends fill in, no crash (`fills missing trend values`).
2. Buying the last rival / a rival twice → refused cleanly (`cannot buy twice`).
3. Share price never negative, IPO only once (`ipo once, price positive`).
4. Entering a city without cash → refused, no partial state (`enter city needs cash`).
5. Fashion week applied then the date passes during a pending event → resolved once (`fashion week resolves once`).
