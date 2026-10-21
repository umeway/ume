# Bikini Bottom Availability — overhaul

Goal: replace Cafe Dates with a simple availability calendar. Every day shows X (busy, the default) or O (free); tap to toggle. Infinite month navigation that opens on today. SpongeBob theme focused on the incidental fish of Bikini Bottom. Site stays working after every step.

- [x] **Core availability calendar** — new index.html/app.js/style.css: month grid (Mon-first), prev/next with no limits, Today button, opens on the current month with today highlighted. Each day is a toggle button showing X (default) or O; state saved in localStorage (store only O dates). Commit, push, check deploy.
- [x] **Bikini Bottom theme** — ocean palette, flower-cloud sky, bubbles, chunky cartoon type (system fonts only), works in dark mode (deep-sea). Commit, push, check deploy.
- [x] **Incidental fish cast** — inline SVG background fish (Fred "My leg!", Tom "Chocolate!", Nat, Harold, Scooter, etc.): one featured per month with their quote, small fish reacting to O/X. Commit, push, check deploy.
- [x] **Review pass** — IDs/classes match, `node --check app.js`, 44px targets, 390px wide, contrast, dark mode. Commit fixes separately.

## Round 2 — Japanese, Fred-style fish, reference layout
- [x] **Japanese + new layout** — lang="ja", title 梅田のスケジュール on a wooden sign in an ocean banner, Sun-first grid (日 red), ○/× legend (参加できる / 参加できない), white cells with blue grid lines, flowers in empty cells, ビキニタウン signpost.
- [x] **Fred-style fish** — upright bullet-head fish with googly eyes, droopy lips, striped cream fin and arms, belt + brown pants; variants (shirts, hats, hair, glasses, colours). Full-body fish in the banner saying 陽菜、会いたいよ！, a bust in every day cell.
- [ ] **Review** — IDs/classes, node --check, 390px, 44px targets.
