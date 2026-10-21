# Agent rules for this repo

Static site hosted on GitHub Pages from the `main` branch root (https://umeway.github.io/website-test/).
Plain HTML/CSS/JS, no build step, no external resources, relative paths only.

## Save and deploy often
- After each meaningful working step (a new file, a feature, a fix), commit and push:
  `git add -A && git commit -m "<short imperative summary>" && git push origin main`
- Pushing to `main` deploys the site. Never leave finished work uncommitted.
- If GitHub Pages is not enabled yet, enable it once:
  `gh api -X POST repos/umeway/website-test/pages -f "source[branch]=main" -f "source[path]=/"`
- Check the deploy: `gh api repos/umeway/website-test/pages/builds/latest --jq .status` (want `built`).
- Never force-push, rewrite history, or commit secrets.

## Review before every commit
Re-read the files you changed and fix problems before committing:
- Consistency: every ID/class used in JS or CSS exists in the HTML; names follow one style; no dead code or duplicated logic.
- Correctness: no JS errors; dates and edge cases (month boundaries, empty states) handled.
- Quality: semantic HTML, labelled form fields, 44px tap targets, good contrast, works at 390px wide and in dark mode.
- Keep files tidy and consistently formatted (2-space indent).
