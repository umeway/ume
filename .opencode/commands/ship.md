---
description: Commit, push and confirm the GitHub Pages deploy
agent: site
---
Make sure all work is committed and pushed (AGENTS.md). Then run
`gh api repos/{owner}/{repo}/pages/builds/latest --jq .status` (get owner/repo from `gh repo view --json nameWithOwner`)
until it says built (check at most 6 times, 10 seconds apart) and report the live URL. Do not change site files.
