---
name: add-animal
description: Adds a new kind of animal to the snoozing-pet mod, from the idea to a draft pull request. Use when the user wants a new pet, such as a pony, owl or rabbit, in the band above the prompt.
argument-hint: <name> [idea, such as "a shaggy chestnut Shetland that dreams of apples"]
allowed-tools:
  - Edit(hooks/**)
  - Edit(tests/**)
  - Edit(dev/**)
  - Edit(README.md)
  - Edit(CONTRIBUTING.md)
  - Edit(.preview/**)
  - Read(.preview/**)
  - Bash(node dev/preview.mjs *)
  - Bash(dev/live.sh *)
  - Bash(claude plugin test *)
  - Bash(claude plugin validate *)
  - Bash(npx --yes prettier@3.8.1 *)
  - Bash(mkdir -p .preview)
  - Bash(cmp *)
  - Bash(git status *)
  - Bash(git diff *)
  - Bash(git fetch *)
  - Bash(git switch *)
  - Bash(git add *)
  - Bash(git commit *)
  - Bash(git push *)
  - Bash(gh pr create *)
  - Bash(gh repo fork *)
---

# Add an animal

The request: `$ARGUMENTS`

The first word is the animal's name. Anything after it is the person's idea for
the animal. Take the whole job from that idea to a draft pull request, without
stopping to ask questions: where the idea leaves something open, decide it
yourself and say what you chose. Stop and ask only if the name can't be used
(see step 1). The person can redirect you after they see the result, and you
push their changes to the same pull request.

Run every command from the repository root, written out in full as this skill
shows it: no `cd`, no shell variables, and no loops. Chaining with `&&` is
fine. This skill pre-approves the commands it needs, so the person isn't asked
about each one, but a command with a `cd`, a variable or a loop can't be
matched and needs their approval. For the same reason, change files with the
Edit and Write tools, never with a script such as `sed` or `python3`.

Keep every image you render in `.preview/` at the repository root. Git ignores
that folder, and you can read the images there with the Read tool to see the
art.

## 1. Check the name

The name must be one lowercase word of letters. It can't already be a key of
`ANIMALS` in `hooks/scene.js`, and it can't be a `/pet` option: `on`, `off`,
`pet` or `feed`. If it fails a check, say why and stop.

## 2. Write the brief

Decide the following, filling any gap in the idea with a choice that suits the
animal, then show the brief to the person in a short list and carry on:

- **Colors**: the palette letters in `COLORS` to override. These are `b` fur,
  `d` ears and saddle (a mane or markings), `D` closed eye, `w` muzzle, chest
  and paws, `n` nose, `e` open eye, `t` tail tip, and `ball` for the toy it
  chases.
- **Head**: its shape, where the eye and mouth sit, and its ears in the
  `down`, `up` and `flap` positions.
- **Body flags**: which of the existing ones it takes. `hump` (camel), `legs`
  (extra leg length, camel 1), `longTail` (cat), `collar` (dog), `tongue: false`
  (it neither pants nor lolls its tongue), and `headTop` (the highest row the
  head may reach).
- **Sound**: its sleepy noise, three letters or fewer, such as `wuf`, `mrr` or
  `hrm`.
- **Dreams**: `food`, what it eats with `/pet feed`, and `prey`, what else it
  dreams of.
- **Babies**: what its youngster looks like while subagents run.

For a pony, for example: chestnut fur with a darker mane drawn in `d`, a white
blaze in `w`, `legs: 2`, `longTail: true`, `tongue: false`, sound `nei`, food
a carrot, prey an apple, and a foal for the babies.

## 3. Start a branch

If the working tree has changes, stop and say so. Otherwise run
`git fetch origin` and `git switch -c add-<name> origin/main`.

## 4. Render the existing animals

Before changing anything, render a sheet for each animal already in `ANIMALS`,
to compare against later:

```bash
mkdir -p .preview
node dev/preview.mjs .preview/before-dog.png dog
```

Write one such command for each existing animal.

## 5. Add the animal

All the drawing is in `hooks/scene.js`:

- Add the entry to `ANIMALS`, keeping the keys in alphabetical order. Copy the
  shape of the closest existing animal and change it.
- If its food or prey is new, add a sprite to `DREAMS`. A sprite is a few rows
  of palette letters with `.` for clear pixels, no more than 9 pixels wide and
  5 high, with its own colors.
- Use the existing body flags where you can. If the look needs a new part,
  such as a mane down the neck, add a flag for it to the animal. Draw that part
  in `POSES` behind the flag, in every pose where it shows (`lie`, `sit`,
  `stand`, `belly`, `bow`), so that the other animals draw exactly as before.
  Explain the flag in the comment above `ANIMALS`.

Behavior lives in `hooks/animal.js` and reads the animal only through
`sound`, `tongue` and `dreams`. A new animal shouldn't need changes there.

## 6. Look at it and refine it

Render the new animal's sheet and read the image:

```bash
node dev/preview.mjs .preview/<name>.png <name>
```

The sheet has 21 labeled moments, from sleeping to eating. Check each one:

- It reads as the animal at a glance, and as different from the others.
- Every shape has its dark outline, and nothing is cut off at the top row or
  at the edges.
- The ears are visible and change between down, up and flap.
- The z's and the dream bubble sit above the head without covering it, and
  its dream is recognizable.
- The food is recognizable whole, half eaten and gone.
- The babies look like small versions of it.

Fix what's wrong and render again, up to five rounds. Make the art good, not
just valid: this is the whole point of the change.

## 7. Check the other animals are unchanged

Render each existing animal again and compare:

```bash
node dev/preview.mjs .preview/after-dog.png dog
cmp .preview/before-dog.png .preview/after-dog.png
```

Write the pair of commands out for each existing animal. If any file differs,
find what changed it and fix that.

## 8. Cover it in the tests

In `tests/snoozing-pet.test.ts`:

- Add the name to every hard-coded list of the animals, such as
  `['camel', 'cat', 'dog']`. Search for each existing animal's name to find
  them all.
- Update the counts that depend on how many animals there are, such as the
  `toBe(3)` in "each animal draws differently".
- If you added a flag, add a test showing that it draws for the new animal and
  changes nothing for the others.

Then run the checks, and fix whatever fails:

```bash
npx --yes prettier@3.8.1 --write .
npx --yes prettier@3.8.1 --check .
claude plugin validate .
claude plugin test
```

## 9. Update the words

Name the new animal wherever the animals are listed:

- `README.md`: the opening sentence, the sentence saying what each animal
  dreams of, `/pet feed`, and the list of commands that switch the animal.
- The comment at the top of `hooks/register.js`.
- The usage comment at the top of `dev/preview.mjs`.

## 10. Watch it in Claude Code

If `tmux` is installed, run the real Claude Code with the plugin and capture the
band:

```bash
dev/live.sh start
dev/live.sh send '/pet <name>'
dev/live.sh snap .preview/live-<name>.png 14
dev/live.sh send '/pet feed'
dev/live.sh snap .preview/live-<name>-feed.png 14
dev/live.sh send '/pet pet'
dev/live.sh snap .preview/live-<name>-pet.png 14
dev/live.sh stop
```

Wait a second after each `send` before you `snap`. Read the images. If
`dev/live.sh` fails because tmux or Playwright is missing, skip this step and
say so.

## 11. Open the pull request

Commit with a message like `Add a pony`, saying in the body what it looks like
and any flag or sprite you added. Push with `git push -u origin HEAD`. If the
push is refused because the person can't write to this repository, run
`gh repo fork --remote`, then push again.

Open a draft pull request against `main`. Use `gh pr create --draft` if `gh` is
available, or else your GitHub tools. Fill the body with:

- The brief from step 2.
- What changed in each file.
- The checks you ran and their results.
- How a reviewer can see it: `node dev/preview.mjs sheet.png <name>`, or
  `claude --plugin-dir .` and then `/pet <name>`.

## 12. Hand it over

Show the person the new animal's sheet and any live captures. Give them the
pull request's link. Then say that they can ask for changes in plain words,
such as "make the mane longer", and that you'll redraw it and push to the same
pull request. When they do, go back to step 6, then repeat steps 7, 8 and 11,
pushing to the same branch.
