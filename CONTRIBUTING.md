# Contributing

To add a new kind of animal, see
[docs/adding-an-animal.md](docs/adding-an-animal.md): Claude Code does most of
the work with the `/add-animal` skill.

## Run it from a clone

To try a change for one session, clone this repository, then load the clone's
directory:

```bash
git clone https://github.com/philipcraig/pet
claude --plugin-dir ./pet
```

## Test

Run the tests from the repository root:

```bash
claude plugin test
```

To render a scripted session to a PNG contact sheet, so the art can be checked
without a terminal, pass the output file and an animal:

```bash
node dev/preview.mjs sheet.png cat
```

## Drive it in a live session

`dev/live.sh` runs Claude Code with the plugin loaded in a detached tmux
session, so the band can be driven and captured from a script, or by an agent
with no terminal of its own. It needs tmux, and for `snap`, Playwright with
Chromium:

```bash
dev/live.sh start --permission-mode acceptEdits
dev/live.sh send '/pet feed'
dev/live.sh snap feed.png 14  # the last 14 rows: the band, prompt and footer
dev/live.sh send 'Run the bash command "sleep 5"'
dev/live.sh keys 1            # answers a permission prompt
dev/live.sh text              # prints the screen as plain text
dev/live.sh stop
```

Claude Code runs in a scratch folder under `$TMPDIR`, so its edits stay out of
the repository. Inside a Claude Code cloud session it also gets a config
folder of its own, so it skips the login and theme screens. A permission prompt
covers the band while it is open.

## Code style

Code is formatted with Prettier. To check formatting, or fix it:

```bash
node dev/tool.mjs prettier --check .
node dev/tool.mjs prettier --write .
```

`dev/tool.mjs` runs Prettier, or `tsc`, at the version CI pins in
`.github/ci/package-lock.json`, so a check that passes locally passes in CI.

## Type-check

The hooks are JavaScript with JSDoc types, and the tests are TypeScript. Both
are type-checked, strictly, against each other and against Claude Code's plugin
API. A new function in the hooks needs a JSDoc type for each parameter. Claude
Code writes the API's types to `.claude-plugin/types/` each time it loads the
plugin, so load it once with `claude --plugin-dir .`, then run:

```bash
node dev/tool.mjs tsc -p .
```

## CI

`.github/workflows/ci.yml` runs on each push to `main` and each pull request.
It checks formatting with Prettier, validates the manifests with
`claude plugin validate .`, runs the tests, type-checks them with `tsc`, and
audits the workflows.

The versions of Claude Code, Prettier and TypeScript it runs are pinned in
`.github/ci/package-lock.json`, and the actions it uses are pinned to commits.
The lockfile stays out of the repository root, where the Claude plugin
directory would take it for dependencies to install for each user. To change a
version, run `npm install --prefix .github/ci --save-exact <package>@<version>`.
Dependabot, set up in `.github/dependabot.yml`, proposes updates to both each
week, once a release is a week old. It skips major versions of TypeScript,
which can change how the hooks' JSDoc is checked; take one on by hand when
you're ready.

Its Workflow security job audits the workflows with
[zizmor](https://docs.zizmor.sh/), the GitHub Actions security linter, at its
strictest (pedantic) persona and with its online audits, and fails on any
finding. To run it locally, with zizmor installed:

```bash
zizmor --persona=pedantic .github/
```

### Reviewing Dependabot's pull requests

Most merge once CI is green, but some need work CI can't do. Ask Claude Code
to review one with the `/review-dependabot` skill, giving the pull request's
number, or none for all of Dependabot's open ones. It pushes any fixes to the
pull request's branch and says whether it's ready to merge. It handles each
kind of update:

- **Claude Code**: it runs the mod in a live session of the new version, since
  CI never does, then updates the version the README and
  `docs/adding-an-animal.md` say the mod is tested with.
- **Prettier**: it reformats the files if the new version formats differently.
- **TypeScript**: it fixes the JSDoc or the tests if they no longer type-check.
- **An action's major version**: it reads the release notes for changed
  defaults.

To review one by hand, follow the steps in
`.claude/skills/review-dependabot/SKILL.md`. Dependabot doesn't move zizmor's
own version, the `version:` input of the zizmor job, or `node-version` in each
job, so change those by hand.

## Files

- `hooks/register.js`: the hooks module. It handles events and draws the band.
- `hooks/animal.js`: picks the animal's pose from Claude's activity and the time.
- `hooks/scene.js`: defines each animal, draws the pixel art, and packs it
  into `Raster` cells.
- `tests/`: the tests.
- `dev/preview.mjs`: renders a scripted session to a PNG contact sheet.
- `dev/live.sh`: runs Claude Code with the plugin in tmux, to drive and capture.
  `PET_LIVE_CLAUDE` picks which Claude Code it runs.
- `dev/snap.mjs`: renders a captured terminal screen to a PNG.
- `dev/tool.mjs`: runs Prettier or `tsc` at the version CI pins.
- `.github/workflows/ci.yml`: the CI workflow.
- `.claude/skills/add-animal/SKILL.md`: the `/add-animal` skill, which adds a
  new animal from an idea to a pull request.
- `.claude/skills/review-dependabot/SKILL.md`: the `/review-dependabot` skill,
  which reviews a Dependabot pull request and does the work it needs.
