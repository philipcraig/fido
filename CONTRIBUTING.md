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
npx prettier@3.8.1 --check .
npx prettier@3.8.1 --write .
```

## Type-check

The hooks are JavaScript with JSDoc types, and the tests are TypeScript. Both
are type-checked, strictly, against each other and against Claude Code's plugin
API. A new function in the hooks needs a JSDoc type for each parameter. Claude
Code writes the API's types to `.claude-plugin/types/` each time it loads the
plugin, so load it once with `claude --plugin-dir .`, then run:

```bash
npx -p typescript@5.9.3 tsc -p .
```

## CI

`.github/workflows/ci.yml` runs on each push to `main` and each pull request.
It checks formatting with Prettier, validates the manifests with
`claude plugin validate .`, runs the tests, and type-checks them with `tsc`.

The versions of Claude Code, Prettier and TypeScript it runs are pinned in
`.github/ci/package-lock.json`, and the actions it uses are pinned to commits.
The lockfile stays out of the repository root, where the Claude plugin
directory would take it for dependencies to install for each user. To change a
version, run `npm install --prefix .github/ci --save-exact <package>@<version>`,
and keep the Prettier and TypeScript versions in this file's commands the same.
The workflow passes [zizmor](https://docs.zizmor.sh/), the GitHub Actions
security linter, with no findings.

## Files

- `hooks/register.js`: the hooks module. It handles events and draws the band.
- `hooks/animal.js`: picks the animal's pose from Claude's activity and the time.
- `hooks/scene.js`: defines each animal, draws the pixel art, and packs it
  into `Raster` cells.
- `tests/`: the tests.
- `dev/preview.mjs`: renders a scripted session to a PNG contact sheet.
- `dev/live.sh`: runs Claude Code with the plugin in tmux, to drive and capture.
- `dev/snap.mjs`: renders a captured terminal screen to a PNG.
- `.github/workflows/ci.yml`: the CI workflow.
- `.claude/skills/add-animal/SKILL.md`: the `/add-animal` skill, which adds a
  new animal from an idea to a pull request.
