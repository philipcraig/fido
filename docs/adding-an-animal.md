# Add a new animal with Claude Code

This guide takes a new kind of animal from an idea to a pull request, with
Claude Code doing the work. The example is a pony. The repository has a
project skill, `/add-animal`, that holds the whole process, so the main step
is one prompt.

## What you need

- A GitHub account.
- Claude Code v2.1.289 or later, and either of these:
  - **Claude Code on the web** ([claude.ai/code](https://claude.ai/code)),
    where everything else is already set up. Pick this repository, or your
    fork of it, when you start a session.
  - **Claude Code on your computer**, with Node.js 22, git, and the
    [GitHub CLI](https://cli.github.com) signed in (`gh auth login`). To let
    Claude watch the animal in a real session, install tmux and
    Playwright's Chromium (`npx playwright install chromium`) as well. Without
    them, Claude still checks the art with a contact sheet.

## 1. Open the repository in Claude Code

On the web, start a session on the repository. On your computer, clone it and
start Claude Code in it:

```bash
git clone https://github.com/philipcraig/pet
cd pet
claude
```

If you can't push to `philipcraig/pet`, Claude forks it for you when it opens
the pull request.

## 2. Describe the animal in one prompt

Type `/add-animal` followed by the animal's name and, if you like, your idea for
it:

```text
/add-animal pony a shaggy chestnut Shetland pony with a cream mane, that dreams of apples
```

`/add-animal pony` on its own works too: Claude picks the details.

The skill pre-approves the commands it runs, such as rendering, testing,
committing and pushing, so you aren't asked about each one. You may still be
asked once to approve file edits, depending on your permission mode. To skip
those prompts as well, press Shift+Tab before sending the prompt, to switch to
accepting edits.

## 3. What Claude does

Claude works through these steps without stopping:

1. **Writes a brief** and shows it to you: the colors, the head and ears, the
   body shape, the sleepy noise, its food and its dreams, and its babies. For
   the pony, that's something like this:

   | Part     | Choice                                                 |
   | :------- | :----------------------------------------------------- |
   | Colors   | Chestnut coat, cream mane, white blaze on the nose     |
   | Body     | Longer legs, a long flowing tail, a mane down the neck |
   | Sound    | `nei`                                                  |
   | Food     | A carrot, for `/pet feed`                              |
   | Dreams   | A carrot or an apple                                   |
   | Babies   | A foal, while subagents run                            |
   | Behavior | Doesn't pant or loll its tongue, unlike the dog        |

2. **Starts a branch**, `add-pony`.
3. **Renders the existing animals**, so it can later prove they haven't
   changed.
4. **Draws the pony** in `hooks/scene.js`: its entry in `ANIMALS`, sprites for
   new foods and dreams (a carrot and an apple), and any new body part it
   needs, such as the mane.
5. **Looks at its work.** It renders a contact sheet of 21 moments, from
   sleeping to eating, reads the image, and redraws whatever doesn't look
   right.
6. **Checks the dog, cat and camel are unchanged**, comparing their sheets
   before and after.
7. **Adds the pony to the tests** and runs Prettier, the manifest check and
   the tests.
8. **Updates the README** and the comments that list the animals.
9. **Watches the pony in a real Claude Code session**, using `dev/live.sh`,
   with `/pet pony`, `/pet feed` and `/pet pet`, and captures the band as
   images.
10. **Commits, pushes and opens a draft pull request**, describing the pony,
    what changed and the checks it ran.

It then shows you the contact sheet, the captures and the link to the pull
request.

## 4. Ask for changes in plain words

If something isn't right, say so:

```text
Make the mane longer and darker, and give the foal a mane too
```

Claude redraws the pony, checks it the same way, and pushes to the same pull
request. Repeat until you're happy.

The images are in `.preview/` in the repository, which git ignores, if you want
to look at them yourself.

## 5. Try it yourself

On your computer, load your branch into a fresh Claude Code session and switch
to the pony:

```bash
claude --plugin-dir .
```

```text
/pet pony
```

Then give Claude something to do and watch the pony react. `/pet feed` and
`/pet pet` show its food and its belly rub.

## 6. Finish the pull request

When CI is green and you like the pony, mark the pull request as ready for
review on GitHub. On the web, you can also ask Claude to watch the pull
request: it then fixes CI failures and answers review comments as they come
in.

```text
Watch the PR and fix anything that comes up
```

## If something goes wrong

- **Claude asks for permission a lot.** Press Shift+Tab to accept edits, or
  say "go ahead" once. The skill only pre-approves the commands it needs.
- **`dev/live.sh` fails.** tmux or Playwright is missing. Claude skips the
  live check and says so; the contact sheet still checks the art.
- **The push is refused.** You don't have write access. Claude runs
  `gh repo fork --remote` and pushes to your fork.
- **You want to see how it works.** The process is in
  `.claude/skills/add-animal/SKILL.md`. The animals are defined in
  `hooks/scene.js`, and the files are described in
  [CONTRIBUTING.md](../CONTRIBUTING.md).
