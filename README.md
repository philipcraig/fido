# pet

`snoozing-pet`, a Claude Code mod that puts a pixel-art animal in the band
above the prompt: a dog by default, or a camel, a solid gray cat, or Rocky the
Eridian from Project Hail Mary. The animal snoozes while Claude is idle, and wakes up to react while Claude works. Tested
with Claude Code v2.1.289 in a terminal. The Desktop app gets no animal.

![Claude Code fixes a failing test while the dog sniffs, chases a ball, jumps at the failure, and goes back to sleep](media/demo.gif)

## Run it

This repository is also a plugin marketplace. To install the mod for every
session, run this in Claude Code v2.1.287 or later, then confirm adding the
marketplace and choose a scope:

```text
/plugin install snoozing-pet --marketplace philipcraig/pet
```

To try it for one session, clone this repository, then load the clone's
directory:

```bash
git clone https://github.com/philipcraig/pet
claude --plugin-dir ./pet
```

## What the animal does

While Claude is idle, the animal sleeps and breathes, with z's drifting up. Every
10 to 25 seconds it does one of these: twitches an ear, thumps its tail,
paddles its paws in a dream, yawns, sits up to scratch, makes a sleepy noise,
rolls onto its back, turns round and lies down again, opens one eye, or
dreams. The camel dreams of a cactus or water, the cat of a fish or a mouse,
the dog of a bone or a squirrel, and Rocky of astrophage or his home star.
Typing in the prompt makes its ear twitch. Rocky has no ears or face: he raises
a three-fingered hand when he's alert, and talks in musical chords.

While Claude works, the animal reacts to what Claude is doing:

| Claude is                                     | The animal                                         |
| :-------------------------------------------- | :------------------------------------------------- |
| Starting a turn                               | Wakes up and stretches, if it was lying down       |
| Thinking or writing                           | Sits and listens, tilting its head                 |
| Reading or searching (`Read`, `Grep`, `Glob`) | Sniffs back and forth, nose down                   |
| Editing (`Edit`, `Write`)                     | Digs, with dirt flying                             |
| Running a shell command (`Bash`)              | Chases a bouncing ball                             |
| Calling the web or an MCP tool                | Points, one paw raised                             |
| Running subagents                             | Plays with one baby for each subagent, up to three |
| Hitting a failed tool call                    | Jumps with a `!`, then droops its ears             |
| Interrupted, or refused a tool call           | Droops its ears and head                           |
| Working for more than two minutes             | Pants                                              |
| Finishing a turn                              | Wags with a heart, yawns, and lies down to sleep   |

## Commands

- `/pet`: shows or hides the animal. The choice persists between sessions.
- `/pet on`, `/pet off`: shows or hides the animal.
- `/pet pet`: the animal rolls over for a belly rub.
- `/pet feed`: the animal eats its favorite food: a fish for the cat, a bone
  for the dog, a cactus for the camel, astrophage for Rocky.
- `/pet camel`, `/pet cat`, `/pet dog`, `/pet rocky`: switches the animal. The choice
  persists between sessions.

## What it runs and stores

The mod is a hooks module, `hooks/register.js`, that runs inside Claude Code.
It watches Claude's turns and tool calls only to choose what the animal does,
and draws the animal in the band above the prompt. It stores two settings with
Claude Code's plugin storage: whether the animal is shown, and which animal it
is. It sends nothing over the network, reads and writes no files, runs no
commands, and calls no models.

## License

MIT. See [LICENSE](LICENSE).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development instructions, and
[docs/adding-an-animal.md](docs/adding-an-animal.md) to add a new animal with
Claude Code
