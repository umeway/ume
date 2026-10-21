# Agent rules for this repo

Static site on GitHub Pages, served from the `main` branch root (repo: umeway/ume, live at https://umeway.github.io/ume/).
Plain HTML/CSS/JS. No frameworks, no build step, no external resources (system fonts, inline SVG). Relative paths only.
The model runs locally and slowly: keep every response short and every step small.

## Boundaries
- Work only inside this repo. Do not read or list anything outside it (home folder, Library, browsers, other projects).
- Do not install software or packages (npm, brew, pip, playwright...). Use what exists: git, gh, node --check.
- You cannot see the page. Do not try to run browsers or screenshot tools; the human tests on a phone and reports back.

## Save and deploy after every step
- As soon as the step works, commit and push: `git add -A && git commit -m "<short imperative summary>" && git push`
- Then do the review below; commit any fixes as a separate small commit. Do not polish beyond the task.
- Pushing to `main` deploys the site. Never leave finished work uncommitted.
- Check the deploy: `gh api repos/{owner}/{repo}/pages/builds/latest --jq .status` (want `built`).
- Never force-push, rewrite history, or commit secrets.

## Review (after the first commit)
- Re-read the files you changed. Run `node --check app.js` for any JS you touched.
- Consistency: every ID/class used in JS or CSS exists in the HTML; one naming style; no dead code or duplicated logic.
- Correctness: no JS errors; edge cases (empty states, boundaries) handled.
- Quality: semantic HTML, labelled form fields, 44px tap targets, good contrast, works at 390px wide and in dark mode.
- 2-space indent, tidy formatting.

## Plan
- PLAN.md holds the checklist of steps. Do one step at a time and tick it off when done.
