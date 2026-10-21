---
description: Review recent changes (or one named area) and make small fixes
agent: review
---
Review scope: $ARGUMENTS
If no scope is given above, review only what changed in the last 3 commits (`git diff HEAD~3 --stat`, then read those files).
Go through the checklist in your instructions for that scope only, fix what you find with small edits,
run `node --check` on any JS you touched, then commit and push. Finish within about 10 tool calls.
