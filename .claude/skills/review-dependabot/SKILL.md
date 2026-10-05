---
name: review-dependabot
description: Reviews a Dependabot pull request for the snoozing-pet mod, does the manual work it needs, such as a live check of a new Claude Code, reformatting for a new Prettier or updating the tested version, and pushes that to the pull request's branch. Use when the person asks to review, check or get a Dependabot pull request ready to merge.
argument-hint: '[pull request number]'
allowed-tools:
  - Edit(README.md)
  - Edit(docs/**)
  - Edit(hooks/**)
  - Edit(tests/**)
  - Read(.preview/**)
  - Bash(gh pr list *)
  - Bash(gh pr view *)
  - Bash(gh pr checks *)
  - Bash(gh pr checkout *)
  - Bash(gh release view *)
  - Bash(git fetch *)
  - Bash(git switch *)
  - Bash(git status *)
  - Bash(git diff *)
  - Bash(git log *)
  - Bash(git add *)
  - Bash(git commit *)
  - Bash(git push *)
  - Bash(npm ci --prefix .github/ci)
  - Bash(node dev/tool.mjs *)
  - Bash(.github/ci/node_modules/.bin/claude --version)
  - Bash(.github/ci/node_modules/.bin/claude plugin *)
  - Bash(PET_LIVE_CLAUDE=.github/ci/node_modules/.bin/claude dev/live.sh start *)
  - Bash(dev/live.sh *)
  - Bash(mkdir -p .preview)
---

# Review a Dependabot pull request

The request: `$ARGUMENTS`

Dependabot proposes updates, each week, to what CI pins: the actions in
`.github/workflows/ci.yml`, and Claude Code, Prettier and TypeScript in
`.github/ci/package-lock.json`. CI checks most of what an update can break, but
not all of it. Do the rest of the work, push what it changes to the pull
request's branch, and say whether the pull request is ready to merge. Don't
merge it yourself: that's the person's call.

Work without stopping to ask questions. Stop and ask only when a fix would
change how the mod behaves, rather than only how it's checked or what the
words say.

Run every command from the repository root, written out in full as this skill
shows it: no `cd`, no shell variables, and no loops. Chaining with `&&` is
fine. This skill pre-approves the commands it needs, so the person isn't asked
about each one, but a command with a `cd`, a variable or a loop can't be
matched and needs their approval. For the same reason, change files with the
Edit tool, never with a script such as `sed` or `python3`.

Use `gh` for GitHub where this skill shows it. If `gh` isn't available, use
your GitHub tools to do the same.

## 1. Find the pull request

If the request names a number, that's the pull request. Otherwise list the open
ones from Dependabot:

```bash
gh pr list --author app/dependabot
```

If there's none, say so and stop. If there's more than one, review each in
turn, starting with the actions, then the CI tools.

## 2. See what it moves

```bash
gh pr view <number>
gh pr checks <number>
gh pr checkout <number>
git diff origin/main...HEAD --stat
```

Read the diff of `.github/ci/package.json` and `.github/workflows/ci.yml` to
learn each package or action it moves, from which version to which. Note which
CI jobs failed: Format, Validate and test, Workflow security or Type-check. If
CI is still running, carry on: the checks below run the same tools.

Then do each of the steps below that applies, in order.

## 3. Prettier

```bash
node dev/tool.mjs prettier --check .
```

If it fails, the new version formats some files differently. Run
`node dev/tool.mjs prettier --write .`, read `git diff` to make sure only the
formatting changed, and commit with a message like
`Reformat for Prettier 3.9.0`.

## 4. TypeScript

Dependabot skips TypeScript's major versions, so this is a minor version or a
patch. The check needs the plugin API's types in `.claude-plugin/types/`, which
Claude Code writes as it loads the plugin. If Claude Code moves too, do step 5
first, which writes them.

```bash
node dev/tool.mjs tsc -p .
```

If it fails, fix the JSDoc in `hooks/` or the types in `tests/`. Don't change
what the code does, and don't loosen `tsconfig.json`.

## 5. Claude Code

CI validates and tests the plugin with the new Claude Code, but never runs it
in a real session. Install what CI pins, and check which version it is:

```bash
npm ci --prefix .github/ci
.github/ci/node_modules/.bin/claude --version
```

Run the checks with it:

```bash
.github/ci/node_modules/.bin/claude plugin validate .
.github/ci/node_modules/.bin/claude plugin test
```

Then watch the mod in a live session of it. That also writes the new plugin
API's types for step 4.

```bash
mkdir -p .preview
PET_LIVE_CLAUDE=.github/ci/node_modules/.bin/claude dev/live.sh start --permission-mode acceptEdits
dev/live.sh snap .preview/dependabot-start.png 14
dev/live.sh send '/pet feed'
dev/live.sh snap .preview/dependabot-feed.png 14
dev/live.sh send '/pet cat'
dev/live.sh snap .preview/dependabot-cat.png 14
dev/live.sh send 'Run the bash command "sleep 5"'
dev/live.sh snap .preview/dependabot-turn.png 14
dev/live.sh stop
```

Give the session a few seconds between commands. If a permission prompt
covers the band, answer it with `dev/live.sh keys 1`, and use
`dev/live.sh text` to see the screen as text. Read each snap with the Read
tool: the animal should draw above the prompt, eat after `/pet feed`, turn into
a cat after `/pet cat`, and wake up to react while the turn runs. If `dev/live.sh`
fails because tmux or Playwright is missing, say you couldn't do the live
check, and leave the pull request unready to merge.

If the checks, the types or the live session show that the plugin API changed,
fix the hooks or the tests for it. If a fix would change what the mod does,
stop and ask the person.

Once it all works, update the version it's tested with: the
`Tested with Claude Code v...` line in `README.md`, and the version
`docs/adding-an-animal.md` asks for. Leave the minimum version in the
README's install steps alone: that's the oldest Claude Code that can install
the mod, which a newer one doesn't change. Commit with a message like
`Test with Claude Code 2.1.300`.

## 6. Actions

For each action that moves a major version, such as `actions/checkout` from v5
to v6, read the release notes of each release between the two:

```bash
gh release view <tag> --repo <owner>/<action>
```

Look for changed defaults, newly required inputs, and a new Node.js the runner
must have. CI's jobs show whether the workflow still works. Workflow security
flags anything zizmor counts as a risk, such as an action that isn't pinned to
a commit.

If `zizmorcore/zizmor-action` moves, check that the zizmor version in the
`version:` input of the zizmor job is one the new release can install. Dependabot
doesn't move that input, nor `node-version` in each job: if either has a newer
version worth taking, say so in your summary rather than changing it here.

## 7. Push

If you committed anything, push it to the pull request's branch:

```bash
git push
```

Dependabot stops rebasing a pull request once someone else pushes to it, so
mention that if the person might want Dependabot to keep it up to date.

## 8. Report

Tell the person, for each pull request:

- What it moves, from which version to which.
- Each check you ran, and its result, with the live snaps if you took them.
- What you changed and pushed, if anything.
- Your verdict: ready to merge once CI is green, or what still stands in the
  way.
