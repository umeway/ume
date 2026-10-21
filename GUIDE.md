# Building static sites with Qwen3.8 on the MacBook Air

Setup: MacBook Air M5 32 GB · Ollama + `qwen3.8:27b-mtp-q4_K_M` (17 GB, 100% GPU) · opencode
(terminal coding agent) · GitHub Pages. Example result: https://umeway.github.io/website-test/

## What this machine can do (measured 2026-10-21)

| | |
|---|---|
| Writing speed | ~7 tokens/s fresh, ~4-6 after 30-60 min (fanless, it throttles) |
| Start-up per step | ~60 s to read the ~5.5K-token agent prompt (cached after: ~1 s) |
| Small step with the fast agent (one bug, one feature) | **3-6 min** |
| Review step | ~11 min |
| `/plan` with medium thinking | ~15 min |
| One big "build the whole app" prompt | 50+ min, often writes nothing |

The model is strong at web design and tool use. The machine is slow. Everything below is about
turning a slow model into steady progress: on the example site, autopilot did 5 steps in 23 minutes.

## The workflow

```sh
~/dev/new-site.sh my-site "one-line idea"   # GitHub repo + Pages + agents, ~30 s
cd ~/dev/my-site
~/dev/plan.sh "<your idea in detail>"       # thinking model writes PLAN.md (4-10 small steps)
# read PLAN.md; edit or reorder steps if you like (plain markdown checklist)
tmux new -s site                            # so it survives you closing the terminal
~/dev/autopilot.sh                          # fast model works through PLAN.md, commit per step
# Ctrl-b d to detach; watch from the other Mac: ssh -t air tmux attach -t site
# open https://<you>.github.io/my-site/ on your phone and test
~/dev/plan.sh "Fix what I found: <list what you saw, on what screen>"   # next round
~/dev/autopilot.sh
```

Interactive instead of autopilot: run `opencode` in the repo and use the slash commands below.
Every step commits and pushes, so the live site updates as you go, and a failed step loses one step.

## Agents, commands and models

| | What | Notes |
|---|---|---|
| `site` agent | writes and edits code; temp 0.3, max 30 tool calls | default agent for /next, /fix, /ship |
| `review` agent | plans and reviews; temp 0.1, max 25 tool calls | used by /plan, /review |
| `/plan <idea>` | writes PLAN.md | best with the thinking model (`plan.sh` does this) |
| `/next` | does the first unchecked PLAN.md step, ticks it, commits | what autopilot runs |
| `/review [area]` | reviews the last 3 commits (or the named area), small fixes | |
| `/fix <problem>` | smallest fix for one problem | |
| `/ship` | commit, push, wait for Pages, print URL | |
| `ollama/qwen3.8-fast` | no thinking, cap 8K output tokens | **default**; use for writing code |
| `ollama/qwen3.8-dev` | thinking (medium effort), cap 12K output tokens | planning and hard bugs only |

Files: agents in `.opencode/agents/`, commands in `.opencode/commands/`, house rules in `AGENTS.md`
(every agent reads it), models in `~/.config/opencode/opencode.json` + Modelfiles in `~/`
(copies in `~/dev/site-kit/config/`).

opencode 2.1 quirks found while setting this up:
- An agent's `model:` setting is ignored; it always uses the selected/default model. Choose the model
  explicitly: `-m ollama/qwen3.8-dev` on the command line, or the model picker in the TUI.
- A project-level `opencode.json` with agent overrides made runs hang; keep config global.
- `limit.output` is not enforced. The real caps are `num_predict` in the Modelfiles.
- Thinking with no effort set has no limit (12-21K+ tokens). With `reasoningEffort: medium` it is ~500.

## Best practices

1. **One small task per prompt or plan step.** One file or one feature, 3-10 minutes. This is the
   single biggest factor. "The calendar", then "the add-plan sheet", never "the app".
2. **Plan with thinking, build without.** The thinking model found the real cause of the sheet bug
   (the browser's built-in `top: 0` on `<dialog>`); the fast model then fixed it in 3 minutes.
3. **Be concrete.** Name the file, IDs, classes, the exact behaviour and how to test it. The plan
   steps that worked best read like small tickets. See `prompts/README.md`.
4. **Edit, don't rewrite.** Rewriting a 10 KB file costs ~3K tokens (~8 min); an edit costs ~1 min.
5. **Commit as soon as it works, then review.** Two early steps polished before committing, hit the
   25-minute limit and saved nothing.
6. **Fresh session per step.** Long sessions fill the 64K context and slow every reply.
7. **You are the tester.** The model can't see the page. Test on your phone between plan rounds and
   describe exactly what you saw. Don't ask it to "smoke test": with no browser it went looking for one.
8. **Hard limits everywhere.** Token caps (Modelfiles), tool-call caps (`steps`), 25-min timeout per
   autopilot step, autopilot stops after 2 steps without progress.
9. **Fence the agent in.** `--auto` approves anything not explicitly denied, so the global config
   denies: package installs (npm/npx/brew/pip), sudo, curl, force-push, web access, and shell
   commands touching `~`, `Library`, dotfiles and personal folders. (Before this, an agent installed
   Playwright and listed the Brave profile folder while trying to "test" the page.)
10. **Keep the Air cool and free.** Plugged in, hard surface, lid open, other apps closed, one model
    at a time (`ollama ps`).

## Watching and stopping

- Progress: `git log --oneline`, `tail -f autopilot.log`, the live site.
- Live speed: `grep n_gen /opt/homebrew/var/log/ollama.log | tail -1`
- **Stop everything:** `pkill -f opencode; brew services restart ollama`
  Closing a normal `opencode` client is not enough: its background service keeps the model
  generating. The scripts use `opencode run --standalone`, so killing them stops the work.

## When something goes wrong

| Symptom | Fix |
|---|---|
| A step makes no change for 2x the expected time | Stop it, split the step in PLAN.md, rerun autopilot |
| Autopilot "STOPPED: 2 steps without progress" | That step is too big or vague; rewrite it smaller |
| Model keeps polishing / reviewing | `/ship` to commit what's there, then `/fix` one thing |
| "Permission denied: shell" in the log | A guardrail blocked it; usually it was wandering. Rephrase the step |
| Page wrong on phone | `/fix On a 390px screen <what you see> instead of <expected>` |
| Everything slow | Air is throttling: let it cool, close apps, keep steps short |
| `command not found` over ssh | Homebrew PATH lives in `~/.zshenv`; open a new shell |

## Files on the Air

- `~/dev/site-kit/` - template for new repos: `.opencode/`, `AGENTS.md`, this guide, `prompts/`, `config/`
- `~/dev/new-site.sh`, `~/dev/plan.sh`, `~/dev/autopilot.sh`
- `~/.config/opencode/opencode.json` - Ollama provider, the two models, permission guardrails
- `~/.qwen3.8-fast.Modelfile`, `~/.qwen3.8-dev.Modelfile` - `ollama create <name> -f <file>` to rebuild
