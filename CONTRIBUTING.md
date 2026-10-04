# Contributing

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

## Code style

Code is formatted with Prettier. To check formatting, or fix it:

```bash
npx prettier@3.8.1 --check .
npx prettier@3.8.1 --write .
```

## CI

`.github/workflows/ci.yml` runs on each push to `main` and each pull request.
It checks formatting with Prettier, validates the manifests with
`claude plugin validate .`, and runs the tests.

## Files

- `hooks/register.js`: the hooks module. It handles events and draws the band.
- `hooks/animal.js`: picks the animal's pose from Claude's activity and the time.
- `hooks/scene.js`: defines each animal, draws the pixel art, and packs it
  into `Raster` cells.
- `tests/`: the tests.
- `dev/preview.mjs`: renders a scripted session to a PNG contact sheet.
- `.github/workflows/ci.yml`: the CI workflow.
