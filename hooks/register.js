// A pixel-art animal in the band above the prompt: a dog, a camel, or a solid
// gray cat. It snoozes while Claude is idle, and wakes up and reacts while Claude
// works: it sniffs around during reads and searches, digs during edits, chases
// a ball during shell commands, points during web requests, and has babies
// over while subagents run.
import { ANIMALS, SCENE_ROWS, drawScene, isAnimal, packCells } from './scene.js'
import * as animal from './animal.js'

// Redraw interval. An animal that is only sleeping redraws every other tick.
const TICK_MS = 125
// The band is skipped when it has fewer rows than this
const MIN_ROWS = 4
const OPTIONS = ['on', 'off', 'pet', 'feed', ...Object.keys(ANIMALS)]
// Claude Code reports a call the user rejected as failed, with text that
// starts with one of these, for Claude or for a subagent
const REJECTED = ["The user doesn't want to proceed with this tool use.", 'Permission for this tool use was denied.']

const d = animal.createAnimal()
let enabled = true
let now = 0
let ticks = 0
// For each surface that has rendered the band, such as the terminal or the
// Desktop app, whether its last render had room for the animal, whether or not
// it is hidden
const room = new Map()
// Whether some surface had room, or null before the first render
function hasRoom() {
  return room.size === 0 ? null : [...room.values()].some(Boolean)
}
// The last scene drawn, reused until the time, the band's size, or the animal
// changes, or null
let drawn = null
// The redraw timer. Each session.start cancels the last one and starts
// another. Claude Code cancels it when it unloads this module.
let timer = null

// The tick reads the time through here, and other handlers use the last tick's
// time, which keeps them from waiting on the clock. Clock replies can arrive
// out of order, so now only moves forward.
async function clockNow($) {
  const t = await $.clock.now()
  now = Math.max(now, t)
  return now
}

// The time for a turn starting or ending. While the animal is hidden, the tick
// doesn't read the clock, so this does. Other events while it is hidden use a
// stale time, which at worst skips a reaction they start.
function eventTime($) {
  return enabled ? now : clockNow($)
}

// Passes an event on to the animal, so the next render draws it again
function change(note, ...args) {
  note(d, ...args)
  drawn = null
}

export function register(on) {
  // Runs before the first prompt, and again after a reload
  on('session.start', async ($, e, next) => {
    const [, saved, name] = await Promise.all([clockNow($), $.store.get('enabled'), $.store.get('animal')])
    enabled = saved !== false
    change(animal.setAnimal, name)
    timer?.cancel()
    timer = $.clock.every(TICK_MS, async () => {
      if (!enabled) return
      await clockNow($)
      ticks += 1
      // With no room, nothing shows until Claude Code renders the band again,
      // as on a resize
      if (hasRoom() === false || (!animal.isBusy(d, now) && ticks % 2 === 1)) return
      $.ui.invalidate('ui.render')
    })
    await $.command.register({
      name: 'fido',
      description: 'Show, hide, pet, feed, or change the animal above the prompt',
      argumentHint: `[${OPTIONS.join('|')}]`,
      immediate: true,
    })
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) change(animal.noteTurnStart, await eventTime($))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) change(animal.noteTurnEnd, await eventTime($), e.isAborted === true)
    return next(e)
  })

  // Each tool call sets what the animal is doing until the call finishes
  on('tool.call', async ($, e, next) => {
    change(animal.noteToolStart, e.tool_use_id, e.tool)
    // A call that throws counts as failed
    let outcome = 'error'
    try {
      const result = await next(e)
      const rejected = result?.isError && typeof result.text === 'string' && REJECTED.some((s) => result.text.startsWith(s))
      outcome = result?.deny || rejected ? 'denied' : result?.isError ? 'error' : 'ok'
      return result
    } finally {
      change(animal.noteToolEnd, now, e.tool_use_id, outcome)
    }
  })

  // Typing in the prompt makes a sleeping animal's ear twitch
  on('prompt.edit', async ($, e, next) => {
    if (enabled) change(animal.noteTyping, now)
    return next(e)
  })

  on('command.run', { command: 'fido' }, async ($, e) => {
    const arg = (e.args ?? '').trim().toLowerCase()
    if (arg !== '' && !OPTIONS.includes(arg)) {
      $.ui.toast(`Unknown option "${arg}". Try /fido [${OPTIONS.join('|')}].`)
      return {}
    }
    if (arg === 'pet' || arg === 'feed') {
      if (!enabled) {
        $.ui.toast(`The ${d.animal} is hidden. Run /fido on to bring it back.`)
        return {}
      }
      change(animal.noteTreat, now, arg)
      if (hasRoom() === false) $.ui.toast(`The ${d.animal} shows only in a terminal with at least ${MIN_ROWS} rows free above the prompt.`)
      return {}
    }
    if (isAnimal(arg)) {
      change(animal.setAnimal, arg)
      // Events use the tick's time once the animal shows, so read the clock first
      await Promise.all([clockNow($), $.store.set('animal', arg), $.store.set('enabled', true)])
      enabled = true
      $.ui.invalidate('ui.render')
      $.ui.toast(`Here is your ${arg}.`)
      return {}
    }
    const show = arg === 'on' ? true : arg === 'off' ? false : !enabled
    await Promise.all([clockNow($), $.store.set('enabled', show)])
    enabled = show
    $.ui.invalidate('ui.render')
    $.ui.toast(enabled ? `The ${d.animal} is back.` : `The ${d.animal} is hidden. Run /fido to bring it back.`)
    return {}
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const columns = e.props.bodyColumns
    const rows = Math.min(SCENE_ROWS, e.props.maxRows ?? SCENE_ROWS)
    room.set(e.surface, e.surface === 'terminal' && columns > 0 && rows >= MIN_ROWS)
    if (!enabled || !room.get(e.surface)) return next(e)
    const { Box, Raster } = await $.ui.resolve(e)
    const key = `${now} ${columns} ${rows}`
    if (drawn?.key !== key) {
      let cells = drawScene(animal.frame(d, now, columns), columns)
      // With less room than the scene needs, keep its bottom rows
      if (rows < SCENE_ROWS) cells = cells.slice((SCENE_ROWS - rows) * columns * 3)
      drawn = { key, cells: packCells(cells) }
    }
    const raster = Raster({ key: 'animal', columns, rows, cells: drawn.cells })
    // Keep whatever mods after this one draw in the band, under the animal
    const theirs = await next(e)
    if (theirs === null || theirs === undefined) return raster
    return Box({ flexDirection: 'column', children: [raster, theirs] })
  })
}
