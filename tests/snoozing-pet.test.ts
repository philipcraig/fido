import { expect, mock, test } from 'claude-code/testing'
import * as animal from '../hooks/animal.js'
import { ANIMALS, COLORS, DEFAULT_COLOR, SCENE_ROWS, drawScene, foodSpan } from '../hooks/scene.js'
import { framesFor } from '../dev/frames.mjs'

// What Claude Code passes to a ui.render hook for the band above the prompt
const BAND = {
  plugin: 'snoozing-pet',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  viewport: { columns: 120, rows: 40, isFullscreen: true },
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const DRAWN_BY_CLAUDE_CODE = { type: 'Text', props: {}, children: ['drawn by Claude Code'] }

// Stubs everything the mod asks Claude Code for. Call before the first $ call.
function stubSession(on) {
  const clock = mock.clock(on)
  const saved = new Map<string, unknown>()
  on('store.get', ($, e) => ({ value: saved.get(e.key) }))
  on('store.set', ($, e) => {
    saved.set(e.key, e.value)
    return { value: undefined }
  })
  on('command.register', () => ({ value: undefined }))
  const toasts: string[] = []
  on('ui.toast', ($, e) => {
    toasts.push(JSON.stringify(e))
    return { value: undefined }
  })
  on('session.start', () => ({ cwd: '/work' }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.render', () => DRAWN_BY_CLAUDE_CODE)
  return { clock, saved, toasts }
}

function start($) {
  return $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
}

// A Raster's cells as code point, foreground, background triples
function cellsOf(raster): Uint32Array {
  const bin = atob(raster.props.cells)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Uint32Array(bytes.buffer)
}

// The characters drawn in a Raster that aren't half blocks or blanks
function glyphs(raster): string {
  const cells = cellsOf(raster)
  let out = ''
  for (let i = 0; i < cells.length; i += 3) {
    const ch = cells[i]
    if (ch !== 32 && ch !== 0x2580 && ch !== 0x2584) out += String.fromCodePoint(ch)
  }
  return out
}

// The pixel colors of cells drawn columns wide, as rows of colors, with -1
// for an empty pixel or a text cell
function pixelsOf(cells: Uint32Array, columns: number): number[][] {
  const rows: number[][] = []
  for (let i = 0; i < cells.length; i += 3) {
    const [ch, fg, bg] = [cells[i], cells[i + 1], cells[i + 2]]
    const row = Math.floor(i / 3 / columns) * 2
    rows[row] ??= []
    rows[row + 1] ??= []
    const color = (c: number) => (c === DEFAULT_COLOR ? -1 : c)
    const [top, bottom] = ch === 0x2580 ? [color(fg), color(bg)] : ch === 0x2584 ? [color(bg), color(fg)] : [-1, -1]
    rows[row].push(top)
    rows[row + 1].push(bottom)
  }
  return rows
}

test('draws a sleeping animal with z’s in the band', async ($, on) => {
  stubSession(on)
  await start($)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const raster = await ui.find({ type: 'Raster' })
  expect(raster).toBeDefined()
  expect(raster.props.columns).toBe(120)
  expect(raster.props.rows).toBe(SCENE_ROWS)
  expect(glyphs(raster)).toMatch(/[zZ]/)
  // What Claude Code draws in the band stays under the animal
  expect(await ui.find({ type: 'Text', text: 'drawn by Claude Code' })).toBeDefined()
})

test('/pet off hides the animal and saves the choice, and /pet brings it back', async ($, on) => {
  const { saved } = stubSession(on)
  await start($)
  await $.command.run({ command: 'pet', args: 'off' })
  expect(saved.get('enabled')).toBe(false)
  let ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Raster' })).toBeUndefined()
  await ui.unmount()

  await $.command.run({ command: 'pet', args: '' })
  expect(saved.get('enabled')).toBe(true)
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Raster' })).toBeDefined()
})

test('a failed command makes the animal jump with a !', async ($, on) => {
  stubSession(on)
  on('tool.call', () => ({ result: 'exit 1', isError: true }))
  await start($)
  await $.turn.start({ turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'false' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(glyphs(await ui.find({ type: 'Raster' }))).toContain('!')
})

test('a call the user rejects makes the animal droop, not jump', async ($, on) => {
  stubSession(on)
  const text = "The user doesn't want to proceed with this tool use. The tool use was rejected."
  on('tool.call', () => ({ result: `Error: ${text}`, text, isError: true }))
  await start($)
  await $.turn.start({ turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'rm -rf build' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(glyphs(await ui.find({ type: 'Raster' }))).not.toContain('!')
})

test('a short band keeps the bottom rows of the scene', async ($, on) => {
  stubSession(on)
  await start($)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, maxRows: 5 } })
  const raster = await ui.find({ type: 'Raster' })
  expect(raster.props.rows).toBe(5)
  expect(atob(raster.props.cells).length).toBe(120 * 5 * 3 * 4)
})

test('the Desktop app gets the band Claude Code draws', async ($, on) => {
  stubSession(on)
  await start($)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Raster' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: 'drawn by Claude Code' })).toBeDefined()
})

test('each kind of tool call has its own activity', () => {
  expect(animal.activityOf('Grep')).toBe('sniff')
  expect(animal.activityOf('Edit')).toBe('dig')
  expect(animal.activityOf('Bash')).toBe('fetch')
  expect(animal.activityOf('WebFetch')).toBe('point')
  expect(animal.activityOf('mcp__github__search')).toBe('point')
  expect(animal.activityOf('Agent')).toBe('youngster')
  expect(animal.activityOf('TodoWrite')).toBe('think')
  expect(animal.activityOf(undefined)).toBe('think')
})

test('after a turn the animal dances, lies down, and goes back to sleep', () => {
  const d = animal.createAnimal(() => 0.5)
  animal.frame(d, 0, 120)
  animal.noteTurnStart(d, 100)
  expect(animal.frame(d, 1500, 120).pose).toBe('sit')
  animal.noteTurnEnd(d, 2000, false)
  expect(animal.frame(d, 2100, 120).head.mouth).toBe('tongue')
  expect(animal.frame(d, 3700, 120).pose).toBe('bow')
  const asleep = animal.frame(d, 6500, 120)
  expect(asleep.pose).toBe('lie')
  expect(asleep.head.eye).toBe('closed')
})

test('a turn that starts while the animal lies down after a turn wakes it', () => {
  const d = animal.createAnimal(() => 0.5)
  animal.frame(d, 0, 120)
  animal.noteTurnStart(d, 100)
  animal.noteTurnEnd(d, 2000, false)
  expect(animal.frame(d, 3700, 120).pose).toBe('bow')
  animal.noteTurnStart(d, 3800)
  expect(d.reaction?.kind).toBe('wake')
  const up = animal.frame(d, 4700, 120)
  expect(up.pose).toBe('sit')
  expect(up.head.eye).toBe('open')
})

test('a turn that starts while the animal turns round in its nap walks it home from where it is', () => {
  // 0.75 picks the circle nap, which starts at 21_250
  const d = animal.createAnimal(() => 0.75)
  animal.frame(d, 0, 120)
  animal.frame(d, 21_250, 120)
  const circling = animal.frame(d, 22_250, 120)
  expect(circling.pose).toBe('stand')
  expect(circling.flip).toBe(true)
  animal.noteTurnStart(d, 22_250)
  expect(d.reaction).toBe(null)
  // It sets off at the next frame
  animal.frame(d, 22_375, 120)
  const next = animal.frame(d, 22_500, 120)
  expect(next.pose).toBe('stand')
  expect(next.flip).toBe(false)
  expect(next.x).toBeGreaterThan(circling.x)
  expect(next.x).toBeLessThan(circling.x + 2)
})

test('a turn that ends while the band is not showing does not dance later', () => {
  const d = animal.createAnimal(() => 0.5)
  animal.frame(d, 0, 120)
  animal.noteTurnStart(d, 0)
  animal.noteTurnEnd(d, 100, false)
  expect(animal.frame(d, 60_000, 120).pose).toBe('lie')
  expect(d.reaction).toBe(null)
})

test('a cat never shows its tongue, even after a long turn', () => {
  const d = animal.createAnimal(() => 0.5)
  animal.setAnimal(d, 'cat')
  animal.frame(d, 0, 120)
  animal.noteTurnStart(d, 100)
  expect(animal.frame(d, 200_000, 120).head.mouth).toBe('shut')
  animal.noteTurnEnd(d, 200_100, false)
  expect(animal.frame(d, 200_200, 120).head.mouth).toBe('open')
})

// Moves the clock in redraw-sized steps and returns the biggest jump in x
function biggestStep(d, from: number, to: number) {
  let last = animal.frame(d, from, 120).x
  let biggest = 0
  for (let now = from + 125; now <= to; now += 125) {
    const x = animal.frame(d, now, 120).x
    biggest = Math.max(biggest, Math.abs(x - last))
    last = x
  }
  return biggest
}

// Runs a Bash turn long enough that the animal ends up away from home
function chaseBall(d) {
  animal.frame(d, 0, 120)
  animal.noteTurnStart(d, 0)
  animal.noteToolStart(d, 'b', 'Bash')
  for (let now = 125; now <= 3000; now += 125) animal.frame(d, now, 120)
  animal.noteToolEnd(d, 3000, 'b', 'ok')
  animal.noteTurnEnd(d, 3000, false)
}

test('after a turn away from home, the animal walks back instead of jumping', () => {
  const d = animal.createAnimal(() => 0.5)
  chaseBall(d)
  expect(biggestStep(d, 3000, 14_000)).toBeLessThan(3)
  expect(animal.frame(d, 14_000, 120).pose).toBe('lie')
})

test('an interrupted turn away from home droops where it stands, then walks home', () => {
  const d = animal.createAnimal(() => 0.5)
  animal.frame(d, 0, 120)
  animal.noteTurnStart(d, 0)
  animal.noteToolStart(d, 'b', 'Bash')
  let away = 0
  for (let now = 125; now <= 3000; now += 125) away = animal.frame(d, now, 120).x
  animal.noteTurnEnd(d, 3000, true)
  const drooping = animal.frame(d, 3125, 120)
  expect(drooping.pose).toBe('sit')
  expect(drooping.head.ear).toBe('down')
  expect(drooping.x).toBe(away)
  for (let now = 3250; now < 4625; now += 125) animal.frame(d, now, 120)
  expect(animal.frame(d, 4625, 120).pose).toBe('stand')
  expect(biggestStep(d, 4625, 14_000)).toBeLessThan(3)
  expect(animal.frame(d, 14_000, 120).pose).toBe('lie')
})

test('a youngster plays for each running subagent, up to three', () => {
  const d = animal.createAnimal(() => 0.5)
  animal.noteTurnStart(d, 0)
  for (let i = 0; i < 4; i++) animal.noteToolStart(d, i, 'Agent')
  const youngsters = (n: number) => animal.frame(d, n, 120).effects.filter((fx) => fx.kind === 'youngster').length
  expect(youngsters(2000)).toBe(3)
  animal.noteToolEnd(d, 2000, 0, 'ok')
  animal.noteToolEnd(d, 2000, 1, 'ok')
  expect(youngsters(2100)).toBe(2)
})

test('youngsters stay on the band while the animal runs back and forth', () => {
  for (let count = 1; count <= 3; count++) {
    const d = animal.createAnimal(() => 0.5)
    animal.frame(d, 0, 120)
    animal.noteTurnStart(d, 0)
    for (let i = 0; i < count; i++) animal.noteToolStart(d, i, 'Agent')
    animal.noteToolStart(d, 'b', 'Bash')
    for (let now = 25; now <= 12_000; now += 25) {
      for (const fx of animal.frame(d, now, 120).effects.filter((fx) => fx.kind === 'youngster')) {
        // Its sprite is 9 columns wide, with an outline column on each side
        expect(fx.x).toBeGreaterThan(-1)
        expect(fx.x + 11).toBeLessThan(121)
      }
    }
  }
})

test('/pet cat swaps the animal and saves the choice', async ($, on) => {
  const { saved } = stubSession(on)
  await start($)
  const before = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const dogCells = (await before.find({ type: 'Raster' })).props.cells
  await before.unmount()
  await $.command.run({ command: 'pet', args: 'Cat' })
  expect(saved.get('animal')).toBe('cat')
  const after = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await after.find({ type: 'Raster' })).props.cells).not.toBe(dogCells)
})

test('/pet with an unknown option, or an object key, changes nothing', async ($, on) => {
  const { saved } = stubSession(on)
  await start($)
  for (const args of ['kitten', 'constructor', '__proto__', 'toString']) {
    await $.command.run({ command: 'pet', args })
  }
  expect(saved.has('enabled')).toBe(false)
  expect(saved.has('animal')).toBe(false)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Raster' })).toBeDefined()
})

test('a saved animal that is an object key falls back to the dog', async ($, on) => {
  const { saved } = stubSession(on)
  await start($)
  await $.command.run({ command: 'pet', args: 'cat' })
  // A reload with a bad saved animal brings back the dog, not the last animal
  saved.set('animal', 'constructor')
  await start($)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const colors = new Set(cellsOf(await ui.find({ type: 'Raster' })))
  expect(colors.has(COLORS.b)).toBe(true)
  expect(colors.has(ANIMALS.cat.colors.b)).toBe(false)
})

test('/pet feed sets the animal eating', async ($, on) => {
  const { clock } = stubSession(on)
  await start($)
  await clock.advance(250)
  // Both frames are drawn at the same time, so only feeding can change them
  const before = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const asleep = (await before.find({ type: 'Raster' })).props.cells
  await before.unmount()
  await $.command.run({ command: 'pet', args: 'feed' })
  const after = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await after.find({ type: 'Raster' })).props.cells).not.toBe(asleep)
})

test('/pet feed between redraws draws the whole bone', async ($, on) => {
  const { clock } = stubSession(on)
  await start($)
  // Partway to the next redraw tick
  await clock.advance(300)
  await $.command.run({ command: 'pet', args: 'feed' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const cells = cellsOf(await ui.find({ type: 'Raster' }))
  const BONE = 0xf0ead8
  const columns = new Set<number>()
  for (let i = 0; i < cells.length; i += 3) {
    if (cells[i + 1] === BONE || cells[i + 2] === BONE) columns.add((i / 3) % BAND.props.bodyColumns)
  }
  expect(columns.size).toBe(7)
})

test('/pet feed in the Desktop app says where the animal shows', async ($, on) => {
  const { toasts } = stubSession(on)
  await start($)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.unmount()
  await $.command.run({ command: 'pet', args: 'feed' })
  expect(toasts.join()).toContain('terminal')
})

test('a frame drawn just before the animal is fed shows the whole food', () => {
  const d = animal.createAnimal(() => 0.5)
  animal.frame(d, 1000, 64)
  animal.noteTreat(d, 1130, 'feed')
  expect(animal.frame(d, 1125, 64).effects.find((fx) => fx.kind === 'food').left).toBe(1)
})

test('a fed animal eats all its food, licks its lips, and goes back to sleep', () => {
  const d = animal.createAnimal(() => 0.5)
  animal.setAnimal(d, 'cat')
  animal.noteTreat(d, 0, 'feed')
  const food = (now: number) => animal.frame(d, now, 64).effects.find((fx) => fx.kind === 'food')
  expect(food(100).left).toBe(1)
  expect(food(1500).left).toBeLessThan(1)
  const licking = animal.frame(d, 3000, 64)
  expect(licking.pose).toBe('sit')
  expect(licking.effects.some((fx) => fx.kind === 'food')).toBe(false)
  expect(animal.frame(d, 4000, 64).pose).toBe('lie')
})

test('a dog by default, and each animal draws differently', () => {
  const d = animal.createAnimal(() => 0.5)
  expect(d.animal).toBe('dog')
  const cells = (name: string) => {
    animal.setAnimal(d, name)
    return Array.from(drawScene(animal.frame(d, 0, 64), 64)).join()
  }
  expect(new Set([cells('camel'), cells('cat'), cells('dog')]).size).toBe(3)
  animal.setAnimal(d, 'unicorn')
  expect(d.animal).toBe('dog')
})

test('feeding the animal on its way home after a turn does not make it jump', () => {
  const d = animal.createAnimal(() => 0.5)
  chaseBall(d)
  animal.frame(d, 3125, 120)
  animal.noteTreat(d, 3125, 'feed')
  expect(biggestStep(d, 3125, 14_000)).toBeLessThan(3)
})

test('feeding a napping animal puts off its next nap', () => {
  const d = animal.createAnimal(() => 0.5)
  animal.frame(d, 0, 64)
  d.nap = { kind: 'roll', at: 0, until: 5000 }
  d.nextNapAt = 0
  animal.noteTreat(d, 100, 'feed')
  for (let now = 225; now <= 4500; now += 125) animal.frame(d, now, 64)
  expect(d.reaction).toBe(null)
  expect(d.nap).toBe(null)
})

// Puts the animal at x, standing still and facing right
function standAt(d, x: number) {
  d.move = { from: x, to: x, speed: 1, at: 0, until: 0, flip: false }
}

test('the food stays on the band when the animal is fed at the right edge', () => {
  const d = animal.createAnimal(() => 0.5)
  animal.frame(d, 0, 64)
  animal.noteTurnStart(d, 0)
  animal.noteToolStart(d, 'b', 'Bash')
  standAt(d, 64)
  animal.noteTreat(d, 125, 'feed')
  const food = animal.frame(d, 250, 64).effects.find((fx) => fx.kind === 'food')
  const [first, last] = foodSpan(ANIMALS.dog, food.x, food.flip)
  expect(first).toBeGreaterThanOrEqual(0)
  expect(last).toBeLessThan(64)
})

test('a camel near the right edge eats facing right when its cactus fits', () => {
  const d = animal.createAnimal(() => 0.5)
  animal.setAnimal(d, 'camel')
  animal.frame(d, 0, 64)
  animal.noteTurnStart(d, 0)
  animal.noteToolStart(d, 'b', 'Bash')
  standAt(d, 44)
  animal.noteTreat(d, 125, 'feed')
  const food = animal.frame(d, 250, 64).effects.find((fx) => fx.kind === 'food')
  expect(food.flip).toBe(false)
  expect(foodSpan(ANIMALS.camel, food.x, false)[1]).toBeLessThan(64)
})

test('food that fits on neither side of a narrow band slides onto it whole', () => {
  // The color of each animal's food, and how many pixels of it the sprite has
  const foods = { dog: [0xf0ead8, 11], cat: [0x7fb2d9, 15] }
  for (const [name, [color, count]] of Object.entries(foods)) {
    for (let columns = 30; columns <= 36; columns++) {
      const d = animal.createAnimal(() => 0.5)
      animal.setAnimal(d, name)
      animal.frame(d, 0, columns)
      animal.noteTreat(d, 0, 'feed')
      const px = pixelsOf(drawScene(animal.frame(d, 125, columns), columns), columns)
      expect(px.flat().filter((c) => c === color).length).toBe(count)
    }
  }
})

test('an animal fed while it roams keeps facing the way it was going', () => {
  const d = animal.createAnimal(() => 0.5)
  animal.frame(d, 0, 120)
  animal.noteTurnStart(d, 0)
  animal.noteToolStart(d, 'b', 'Bash')
  // It wakes, then runs left after the ball
  let running
  for (let now = 125; now <= 1000; now += 125) running = animal.frame(d, now, 120)
  expect(running.pose).toBe('stand')
  expect(running.flip).toBe(true)
  animal.noteTreat(d, 1000, 'feed')
  expect(animal.frame(d, 1125, 120).flip).toBe(true)
  // It keeps facing that way after it eats
  expect(animal.frame(d, 3500, 120).flip).toBe(true)
})

test('a standing camel keeps a clear row above its head and hump', () => {
  const frame = { animal: 'camel', pose: 'stand', head: { eye: 'open', ear: 'up', mouth: 'shut' }, x: 20, effects: [] }
  const cells = drawScene(frame, 40)
  // The top pixel row holds only outline
  for (let x = 0; x < 40; x++) {
    if (cells[x * 3] === 0x2580) expect(cells[x * 3 + 1]).toBe(COLORS.k)
  }
})

test('every animal tilts its head while thinking', () => {
  for (const name of ['camel', 'cat', 'dog']) {
    const sitting = (headDy: number) => {
      const frame = { animal: name, pose: 'sit', head: { eye: 'open', ear: 'up', mouth: 'shut' }, headDy, x: 20, effects: [] }
      return Array.from(drawScene(frame, 40)).join()
    }
    expect(sitting(-1)).not.toBe(sitting(0))
  }
})

test('a frame without an animal draws the dog', () => {
  const frame = { pose: 'sit', head: { eye: 'open', ear: 'up', mouth: 'shut' }, x: 20, effects: [] }
  expect(Array.from(drawScene(frame, 40)).join()).toBe(Array.from(drawScene({ ...frame, animal: 'dog' }, 40)).join())
})

test('the z’s float clear of every sleeping animal’s head and ears', () => {
  for (const [name, nap] of ['camel', 'cat', 'dog'].flatMap((name) => [[name, null], [name, 'roll']])) {
    const d = animal.createAnimal(() => 0.5)
    animal.setAnimal(d, name)
    animal.frame(d, 0, 64)
    if (nap !== null) d.nap = { kind: nap, at: 0, until: 10_000 }
    for (let now = 0; now <= 4200; now += 125) {
      const f = animal.frame(d, now, 64)
      const bare = drawScene({ ...f, effects: [] }, 64)
      for (const z of f.effects.filter((fx) => fx.kind === 'text' && /z/i.test(fx.text))) {
        if (z.y < 0) continue
        expect(bare[(Math.floor(z.y / 2) * 64 + z.x) * 3]).toBe(32)
      }
    }
  }
})

test('the sleep sound stays clear of every sleeping animal’s head and ears', () => {
  for (const name of ['camel', 'cat', 'dog']) {
    for (const nap of ['dream', 'sleepSound']) {
      const d = animal.createAnimal(() => 0.5)
      animal.setAnimal(d, name)
      animal.frame(d, 0, 64)
      d.nap = { kind: nap, at: 0, until: 10_000 }
      let heard = false
      for (let now = 125; now <= 2000; now += 125) {
        const f = animal.frame(d, now, 64)
        const bare = drawScene({ ...f, effects: [] }, 64)
        for (const t of f.effects.filter((fx) => fx.kind === 'text')) {
          heard = true
          for (let k = 0; k < t.text.length; k++) expect(bare[(Math.floor(t.y / 2) * 64 + t.x + k) * 3]).toBe(32)
        }
      }
      expect(heard).toBe(true)
    }
  }
})

test('the animal walks home when the band widens, and naps again only once home', () => {
  const d = animal.createAnimal(() => 0.5)
  animal.frame(d, 0, 120)
  d.nap = { kind: 'bubble', at: 0, until: 5200 }
  expect(animal.frame(d, 125, 200).pose).toBe('stand')
  expect(animal.isBusy(d, 125)).toBe(true)
  expect(d.nap).toBe(null)
  let now = 125
  while (animal.frame(d, (now += 125), 200).pose === 'stand') {}
  expect(d.nap).toBe(null)
  expect(d.nextNapAt).toBeGreaterThan(now)
})

test('no nap starts while the animal walks home', () => {
  const d = animal.createAnimal(() => 0.5)
  animal.frame(d, 0, 120)
  d.nextNapAt = 500
  let now = 0
  while (animal.frame(d, (now += 125), 200).pose === 'stand') expect(d.nap).toBe(null)
  expect(d.nextNapAt).toBeGreaterThan(now)
})

// Runs a Bash turn that the user interrupts, and lets the droop finish, so
// the animal is walking home
function walkHomeAfterAbort(d) {
  chaseBall(d)
  animal.noteTurnEnd(d, 3000, true)
  for (let now = 3125; now <= 4625; now += 125) animal.frame(d, now, 120)
  expect(animal.frame(d, 4750, 120).pose).toBe('stand')
  expect(d.reaction).toBe(null)
}

test('a turn that starts while the animal walks home does not lay it down', () => {
  const d = animal.createAnimal(() => 0.5)
  walkHomeAfterAbort(d)
  animal.noteTurnStart(d, 4800)
  expect(animal.frame(d, 4875, 120).pose).not.toBe('lie')
})

test('typing while the animal walks home does not twitch its ear', () => {
  const d = animal.createAnimal(() => 0.5)
  walkHomeAfterAbort(d)
  animal.noteTyping(d, 4800)
  expect(d.reaction).toBe(null)
})

test('a walk does not keep the animal busy past the time it gets home', () => {
  const d = animal.createAnimal(() => 0.5)
  walkHomeAfterAbort(d)
  expect(animal.isBusy(d, 4800)).toBe(true)
  expect(animal.isBusy(d, 10_000)).toBe(false)
})

test('a reaction or a nap does not keep the animal busy once it is over', () => {
  const d = animal.createAnimal(() => 0.5)
  animal.frame(d, 0, 64)
  animal.noteTurnStart(d, 0)
  animal.noteTurnEnd(d, 100, false)
  expect(animal.isBusy(d, 125)).toBe(true)
  expect(animal.isBusy(d, 10_000)).toBe(false)
  d.reaction = null
  d.nap = { kind: 'roll', at: 0, until: 5000 }
  expect(animal.isBusy(d, 125)).toBe(true)
  expect(animal.isBusy(d, 10_000)).toBe(false)
})

test('the happy dance waits for the walk home, even with slow redraws', () => {
  const d = animal.createAnimal(() => 0.5)
  chaseBall(d)
  let now = 3000
  let steps = 0
  while (animal.frame(d, (now += 900), 120).pose === 'stand') steps += 1
  expect(steps).toBeGreaterThan(0)
  expect(d.reaction?.kind).toBe('happy')
})

test('a turn that starts while the animal walks home drops the dance it was going to do', () => {
  const d = animal.createAnimal(() => 0.5)
  chaseBall(d)
  for (let now = 3125; now <= 3375; now += 125) expect(animal.frame(d, now, 120).pose).toBe('stand')
  animal.noteTurnStart(d, 3500)
  animal.noteToolStart(d, 'g', 'Grep')
  for (let now = 3625; now <= 5000; now += 125) {
    const f = animal.frame(d, now, 120)
    expect(f.pose).toBe('stand')
    expect(f.headLow).toBe(true)
  }
  // Nor does it dance after the next turn is interrupted and it walks home
  animal.noteToolEnd(d, 5000, 'g', 'ok')
  animal.noteTurnEnd(d, 5000, true)
  for (let now = 5125; now <= 20_000; now += 125) {
    animal.frame(d, now, 120)
    expect(d.reaction?.kind).not.toBe('happy')
  }
})

test('a tool call that ends after its turn was interrupted does not jump', () => {
  const d = animal.createAnimal(() => 0.5)
  animal.frame(d, 0, 120)
  animal.noteTurnStart(d, 0)
  animal.noteToolStart(d, 'b', 'Bash')
  animal.noteTurnEnd(d, 1000, true)
  animal.noteToolEnd(d, 1000, 'b', 'error')
  expect(d.reaction?.kind).toBe('droop')
})

test('a slow redraw on the way home moves the animal only as far as it walks', () => {
  const d = animal.createAnimal(() => 0.5)
  chaseBall(d)
  const before = animal.frame(d, 3125, 120).x
  const after = animal.frame(d, 4225, 120)
  expect(after.pose).toBe('stand')
  // 1.1 seconds at 14 pixels a second
  expect(Math.abs(after.x - before)).toBeGreaterThan(15)
  expect(Math.abs(after.x - before)).toBeLessThan(16)
  expect(animal.isBusy(d, 4225)).toBe(true)
})

test('a walk the band stopped showing does not keep the animal awake', () => {
  const typed = animal.createAnimal(() => 0.5)
  chaseBall(typed)
  animal.frame(typed, 3125, 120)
  animal.noteTyping(typed, 60_000)
  expect(typed.reaction?.kind).toBe('twitch')
  expect(animal.frame(typed, 60_125, 120).pose).toBe('lie')

  const turned = animal.createAnimal(() => 0.5)
  chaseBall(turned)
  animal.frame(turned, 3125, 120)
  animal.noteTurnStart(turned, 60_000)
  expect(turned.reaction?.kind).toBe('wake')
})

test('a sleeping animal always shows a big Z', () => {
  for (const name of ['camel', 'cat', 'dog']) {
    const d = animal.createAnimal(() => 0.5)
    animal.setAnimal(d, name)
    for (let now = 0; now <= 4200; now += 50) {
      const zs = animal.frame(d, now, 80).effects.filter((fx) => fx.kind === 'text')
      expect(zs.length).toBe(3)
      for (const z of zs) expect(z.y).toBeGreaterThanOrEqual(0)
      expect(zs.some((z) => z.text === 'Z')).toBe(true)
    }
  }
})

test('the dream bubble’s puffs stand apart from its ring', () => {
  for (const name of ['camel', 'cat', 'dog']) {
    const d = animal.createAnimal(() => 0.5)
    animal.setAnimal(d, name)
    animal.frame(d, 0, 80)
    d.nap = { kind: 'bubble', at: 0, until: 5200 }
    const f = animal.frame(d, 100, 80)
    const px = pixelsOf(drawScene(f, 80), 80)
    const bubble = f.effects.find((fx) => fx.kind === 'bubble')
    // A puff has no other bubble pixel next to it, even on a diagonal
    for (const [x, y] of [[bubble.x - 1, bubble.y - 1], [bubble.x - 3, bubble.y - 2]]) {
      expect(px[y][x]).toBe(COLORS.bubble)
      for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) {
        expect(px[y + dy][x + dx]).not.toBe(COLORS.bubble)
      }
    }
  }
})

// The bubble may rest on the outline of the animal's back
test('the dream bubble and its dream leave every animal’s fur uncovered', () => {
  for (const name of ['camel', 'cat', 'dog']) {
    for (const item of ['food', 'prey']) {
      const d = animal.createAnimal(() => 0.5)
      animal.setAnimal(d, name)
      animal.frame(d, 0, 64)
      d.nap = { kind: 'bubble', at: 0, until: 5200 }
      d.item = item
      for (let now = 125; now <= 2000; now += 125) {
        const f = animal.frame(d, now, 64)
        const bare = pixelsOf(drawScene({ ...f, effects: [] }, 64), 64)
        const full = pixelsOf(drawScene(f, 64), 64)
        bare.forEach((row, y) => row.forEach((c, x) => c >= 0 && c !== COLORS.k && expect(full[y][x]).toBe(c)))
      }
    }
  }
})

test('the cat’s tail tip keeps its outline when it lies down or rolls over', () => {
  for (const pose of ['lie', 'belly']) {
    const frame = { animal: 'cat', pose, head: { eye: 'closed', ear: 'down', mouth: 'shut' }, x: 20, effects: [] }
    const px = pixelsOf(drawScene(frame, 40), 40)
    const left = Math.min(...px.map((row) => row.findIndex((c) => c >= 0)).filter((x) => x >= 0))
    for (const row of px) if (row[left] >= 0) expect(row[left]).toBe(COLORS.k)
  }
})

test('the cat’s tail tip keeps its outline at the top of a bow', () => {
  const frame = { animal: 'cat', pose: 'bow', head: { eye: 'open', ear: 'up', mouth: 'open' }, wag: 1, x: 20, effects: [] }
  const px = pixelsOf(drawScene(frame, 40), 40)
  for (const c of px[0]) if (c >= 0) expect(c).toBe(COLORS.k)
})

test('a reload does not double the redraws', async ($, on) => {
  const { clock } = stubSession(on)
  let redraws = 0
  on('ui.invalidate', () => {
    redraws += 1
    return { value: undefined }
  })
  await start($)
  await start($)
  await clock.advance(1000)
  // A sleeping animal redraws on every other 125 ms tick
  expect(redraws).toBe(4)
})

test('a turn that starts while the animal is hidden starts at the time it comes', async ($, on) => {
  const { clock } = stubSession(on)
  await start($)
  await $.command.run({ command: 'pet', args: 'off' })
  await clock.advance(60_000)
  await $.turn.start({ turnId: 't1' })
  await $.command.run({ command: 'pet', args: 'on' })
  // The highest row the animal reaches, with -1 for an empty pixel
  const top = async () => {
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    const rows = pixelsOf(cellsOf(await ui.find({ type: 'Raster' })), 120)
    await ui.unmount()
    return rows.findIndex((row) => row.some((c) => c !== -1))
  }
  // It wakes from lying down, then sits up
  const waking = await top()
  await clock.advance(1125)
  expect(waking).toBeGreaterThan(await top())
})

test('with no room for the band, the timer stops asking for redraws', async ($, on) => {
  const { clock } = stubSession(on)
  let redraws = 0
  on('ui.invalidate', () => {
    redraws += 1
    return { value: undefined }
  })
  await start($)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.unmount()
  await clock.advance(1000)
  expect(redraws).toBe(0)
})

test('a render in the Desktop app does not stop the terminal redraws', async ($, on) => {
  const { clock } = stubSession(on)
  let redraws = 0
  on('ui.invalidate', () => {
    redraws += 1
    return { value: undefined }
  })
  await start($)
  for (const surface of ['terminal', 'desktop']) {
    const ui = await $.ui.mount({ ...BAND, surface })
    await ui.unmount()
  }
  await clock.advance(1000)
  expect(redraws).toBe(4)
})

test('an event between ticks shows at the next redraw', async ($, on) => {
  const { clock } = stubSession(on)
  await start($)
  await clock.advance(250)
  const cells = async () => {
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    const raster = await ui.find({ type: 'Raster' })
    await ui.unmount()
    return raster.props.cells
  }
  const first = await cells()
  expect(await cells()).toBe(first)
  await $.command.run({ command: 'pet', args: 'pet' })
  expect(await cells()).not.toBe(first)
})

test('/pet pet right after /pet on does not say the band is too small', async ($, on) => {
  const { toasts } = stubSession(on)
  await start($)
  await $.command.run({ command: 'pet', args: 'off' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.unmount()
  await $.command.run({ command: 'pet', args: 'on' })
  await $.command.run({ command: 'pet', args: 'pet' })
  expect(toasts.join()).not.toContain('rows free')
})

test('tool calls after the turn ends leave the animal alone', () => {
  const d = animal.createAnimal(() => 0.5)
  animal.frame(d, 0, 120)
  animal.noteTurnStart(d, 0)
  animal.noteTurnEnd(d, 100, false)
  animal.noteToolStart(d, 'bg', 'Agent')
  expect(animal.isBusy(d, 60_000)).toBe(false)
  expect(animal.frame(d, 60_000, 120).effects.some((fx) => fx.kind === 'youngster')).toBe(false)
  animal.noteToolEnd(d, 60_000, 'bg', 'error')
  expect(d.reaction).toBe(null)
})

test('the animal eats its food from the near end', () => {
  const d = animal.createAnimal(() => 0.5)
  animal.frame(d, 0, 64)
  animal.noteTreat(d, 0, 'feed')
  const BONE = 0xf0ead8
  const span = (now: number) => {
    const xs = pixelsOf(drawScene(animal.frame(d, now, 64), 64), 64).flatMap((row) => row.flatMap((c, x) => (c === BONE ? [x] : [])))
    return [Math.min(...xs), Math.max(...xs)]
  }
  const whole = span(125)
  const bitten = span(1500)
  const ahead = animal.frame(d, 1500, 64).flip ? 0 : 1
  // The far end stays put, and the near end moves away from the mouth
  expect(bitten[ahead]).toBe(whole[ahead])
  expect(bitten[1 - ahead]).not.toBe(whole[1 - ahead])
})

test('the preview sheet shows each tool call’s activity', () => {
  const frames = Object.fromEntries(framesFor('dog').map(({ label, frame }) => [label, frame]))
  const kinds = (label: string) => frames[label].effects.map((fx) => fx.kind)
  expect(frames['sniffing (Grep)'].headLow).toBe(true)
  expect(kinds('fetch (Bash)')).toContain('ball')
  expect(frames['oops (failed command)'].effects.some((fx) => fx.text === '!')).toBe(true)
  expect(kinds('digging (Edit)')).toContain('dirt')
  expect(kinds('pointing (WebFetch), two youngsters (subagents)').filter((k) => k === 'youngster').length).toBe(2)
})
