// What the animal is doing at a given moment. register.js tells it about turns
// and tool calls, and asks for a frame on every redraw. Pure: no mods API.
import { CENTER, DEFAULT_ANIMAL, ANIMAL_W, SCENE_PX, YOUNGSTER_W, animalName, animalOf, foodSpan, headTopRow } from './scene.js'

const Z_COLOR = 0x8fa8c8
const BANG_COLOR = 0xf4c430
const SOUND_COLOR = 0xc8b89a
const SNIFF_COLOR = 0x9a8f80

// The animal roams in the right-hand YARD columns of the band
const YARD = 64
// After this long working without a break, the animal pants
const PANT_AFTER_MS = 120_000
// How fast the animal walks home, in pixels a second
const HOME_SPEED = 14

const SLEEPING = { eye: 'closed', ear: 'down', mouth: 'shut' }
const ALERT = { eye: 'open', ear: 'up', mouth: 'shut' }

// How long each one-off reaction lasts, in milliseconds
const REACTIONS = { wake: 1000, oops: 1800, droop: 1500, happy: 1600, settle: 2200, pet: 2600, feed: 3800, twitch: 450 }
// Reactions that play wherever the animal is
const STAY_PUT = ['droop', 'oops']
// Reactions that leave the animal lying down
const LYING = ['settle', 'pet']

// The things a sleeping animal does now and then, with how long each lasts
const NAPS = {
  earTwitch: 700,
  tailThump: 1300,
  dream: 3200,
  yawn: 1700,
  scratch: 2300,
  sleepSound: 1100,
  roll: 5000,
  circle: 4200,
  oneEye: 2200,
  bubble: 5200,
}

// Which activity each tool call shows
export function activityOf(tool) {
  if (typeof tool !== 'string') return 'think'
  if (/^(Read|Grep|Glob|LS|NotebookRead)$/.test(tool)) return 'sniff'
  if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(tool)) return 'dig'
  if (/^(Bash|BashOutput|KillShell|KillBash|PowerShell)$/.test(tool)) return 'fetch'
  if (/^(WebFetch|WebSearch)$/.test(tool) || tool.startsWith('mcp__')) return 'point'
  if (/^(Agent|Task)$/.test(tool)) return 'youngster'
  return 'think'
}

export function createAnimal(random = Math.random) {
  return {
    random,
    animal: DEFAULT_ANIMAL,
    working: false,
    workStartedAt: 0,
    tools: [],
    reaction: null,
    nap: null,
    nextNapAt: null,
    lastTwitchAt: -Infinity,
    // Where the animal goes, or null before the first frame: it leaves x
    // `from` at time `at`, walks at `speed` pixels a second, and gets to x `to`
    // at time `until`, then faces left if `flip`. While it stands, from and to
    // are the same.
    move: null,
    // Where home is in the band at the last frame
    home: null,
    roamTarget: null,
    item: 'food',
  }
}

// True while anything faster than breathing is on screen
export function isBusy(d, now) {
  const napping = d.nap !== null && now < d.nap.until
  return d.working || isWalkingHome(d, now) || reactionAt(d, now) !== null || napping || d.tools.length > 0
}

function isWalkingHome(d, now) {
  const m = d.move
  return !d.working && m !== null && now >= m.at && now < m.until
}

// Where the animal is at time now, or null before the first frame
function xAt(d, now) {
  const m = d.move
  if (m === null) return null
  if (now >= m.until) return m.to
  return m.from + (m.to - m.from) * Math.max(0, (now - m.at) / (m.until - m.at))
}

// It faces the way it is going, or will go, until it gets there
function facesLeft(d, now) {
  const m = d.move
  if (m === null) return false
  return now < m.until && m.to !== m.from ? m.to < m.from : m.flip
}

// Sets the animal walking to x `to` from where it is at time now, setting off
// at time start. Once there it faces left if flip is true. With no flip, it
// keeps facing the way it walked.
function moveTo(d, now, to, speed, start = now, flip = undefined) {
  const from = xAt(d, now) ?? to
  const until = start + (Math.abs(to - from) / speed) * 1000
  d.move = { from, to, speed, at: start, until, flip: flip ?? (to === from ? facesLeft(d, now) : to < from) }
}

function standAt(d, now, x, flip = facesLeft(d, now)) {
  d.move = { from: x, to: x, speed: 1, at: now, until: now, flip }
}

function stop(d, now) {
  if (d.move !== null) standAt(d, now, xAt(d, now))
}

// Sets the animal walking home. It finishes a droop or a jump first, and naps
// only some time after it gets there.
function goHome(d, now) {
  const r = d.reaction
  const start = r !== null && STAY_PUT.includes(r.kind) ? Math.max(now, r.until) : now
  if (d.home !== null) moveTo(d, now, d.home, HOME_SPEED, start, false)
  scheduleNap(d, d.move?.until ?? now)
}

// A walk home ends in a nap, but the animal is up and alert until it arrives
function isAsleep(d, now) {
  const reaction = reactionAt(d, now)
  return !d.working && !isWalkingHome(d, now) && (reaction === null || reaction.kind === 'twitch')
}

// The reaction playing at time now, or null. None plays on the way home. A
// finished happy dance leads into lying down to sleep, unless Claude is
// working again.
function reactionAt(d, now) {
  if (isWalkingHome(d, now)) return null
  let r = d.reaction
  if (r !== null && now >= r.until && r.kind === 'happy' && !d.working) {
    r = { kind: 'settle', at: r.until, until: r.until + REACTIONS.settle }
  }
  return r !== null && now < r.until ? r : null
}

// Starts a reaction at time now. During a turn, the animal stops where it is.
// Otherwise the reaction waits until the animal gets home, and cuts short a
// droop that holds up the walk.
function react(d, kind, now) {
  if (d.working) stop(d, now)
  else if (d.move !== null && now < d.move.at) moveTo(d, now, d.move.to, HOME_SPEED, now, false)
  const at = Math.max(now, d.move?.until ?? now)
  d.reaction = { kind, at, until: at + REACTIONS[kind] }
}

function scheduleNap(d, now) {
  d.nap = null
  d.nextNapAt = now + 10_000 + d.random() * 15_000
}

export function noteTurnStart(d, now) {
  // Some naps have the animal sitting, or up and turning round
  const nap = isAsleep(d, now) ? napPose(d, now, d.home) : null
  const wasDown = nap !== null ? nap.pose === 'lie' || nap.pose === 'belly' : LYING.includes(reactionAt(d, now)?.kind)
  d.working = true
  d.workStartedAt = now
  d.nap = null
  // It stops on its way home, and drops what it was going to do there
  stop(d, now)
  if (nap !== null && d.move !== null) standAt(d, now, nap.x, nap.flip ?? false)
  if (d.reaction !== null && d.reaction.at > now) d.reaction = null
  if (wasDown) react(d, 'wake', now)
}

export function noteTurnEnd(d, now, isAborted) {
  d.working = false
  d.tools = []
  if (isAborted) {
    // It droops where it stands, then walks home
    d.reaction = { kind: 'droop', at: now, until: now + REACTIONS.droop }
    goHome(d, now)
  } else {
    goHome(d, now)
    react(d, 'happy', now)
  }
}

// Only calls made during a turn count. Background work after a turn, such as
// a subagent that is still running, leaves the animal alone.
export function noteToolStart(d, id, tool) {
  if (!d.working) return
  d.tools.push({ id, activity: activityOf(tool) })
}

// outcome is 'ok', 'error', or 'denied'. A call that outlives its turn, such
// as one the user interrupted, has already had its reaction.
export function noteToolEnd(d, now, id, outcome) {
  if (!d.tools.some((t) => t.id === id)) return
  d.tools = d.tools.filter((t) => t.id !== id)
  if (outcome === 'error') react(d, 'oops', now)
  else if (outcome === 'denied') react(d, 'droop', now)
}

export function setAnimal(d, animal) {
  d.animal = animalName(animal)
}

// kind is 'pet' or 'feed'
export function noteTreat(d, now, kind) {
  scheduleNap(d, now)
  react(d, kind, now)
}

// The user is typing: a sleeping animal's ear twitches, at most every few seconds
export function noteTyping(d, now) {
  if (!isAsleep(d, now) || d.nap !== null || now - d.lastTwitchAt < 2500) return
  d.lastTwitchAt = now
  react(d, 'twitch', now)
}

// A square wave: true for the first half of each period
function blink(now, period) {
  return now % period < period / 2
}

// The most recent tool still running decides the activity
function currentActivity(d) {
  for (let i = d.tools.length - 1; i >= 0; i--) {
    if (d.tools[i].activity !== 'youngster') return d.tools[i].activity
  }
  return 'think'
}

// The frame to draw at time now, in a band columns wide. Moves the animal along
// as time passes, so call it once for each redraw.
export function frame(d, now, columns) {
  const right = columns - (ANIMAL_W - CENTER)
  const left = Math.max(CENTER, columns - YARD)
  // Far enough from the right edge that the z's miss the band's [-] control
  d.home = Math.max(left, right - 8)
  const home = d.home
  // A band that narrows leaves the animal standing at its edge
  const x = xAt(d, now)
  const kept = Math.min(Math.max(x ?? home, left), Math.max(left, right))
  if (x !== kept) standAt(d, now, kept)
  if (d.nextNapAt === null) scheduleNap(d, now)

  // While Claude is idle, the animal goes home before it does anything else,
  // such as dancing after a turn, eating, or napping. If home moves, as when
  // the band is resized, it heads for the new home. A reaction under way
  // waits, and plays from the start once it is home. A droop or a jump plays
  // where the animal stands.
  if (!d.working && d.move.to !== home) {
    const r = isWalkingHome(d, now) ? d.reaction : reactionAt(d, now)
    goHome(d, now)
    if (r !== null && !STAY_PUT.includes(r.kind)) react(d, r.kind, now)
  }
  const walking = isWalkingHome(d, now)
  if (!walking) d.reaction = reactionAt(d, now)
  // Keeps only a reaction that waits for the animal to get home
  else if (d.reaction !== null && d.reaction.until <= now) d.reaction = null
  if (d.nap !== null && now >= d.nap.until) scheduleNap(d, now)
  if (!d.working && !walking && d.reaction === null && d.nap === null && now >= d.nextNapAt) {
    const kinds = Object.keys(NAPS)
    const kind = kinds[Math.floor(d.random() * kinds.length)]
    d.nap = { kind, at: now, until: now + NAPS[kind] }
    d.item = d.random() < 0.5 ? 'food' : 'prey'
  }
  let f
  if (walking) f = walkingFrame(now, HOME_SPEED)
  else f = d.reaction !== null ? reactionFrame(d, now, home, columns) : d.working ? workFrame(d, now, home, left, right) : napFrame(d, now, home)
  f.x = f.x ?? xAt(d, now)
  f.flip = f.flip ?? facesLeft(d, now)
  f.animal = d.animal
  resolveEffects(f, now)
  addYoungsters(d, now, f, columns)
  return f
}

// Walks toward target at speed pixels a second, then faces left if flip is
// true. Returns a walking frame while the animal is on its way, or null once
// it has arrived.
function walkTo(d, now, target, speed, head = ALERT, flip = undefined) {
  if (d.move.to !== target || d.move.speed !== speed) moveTo(d, now, target, speed, now, flip)
  return now < d.move.until ? walkingFrame(now, speed, head) : null
}

function walkingFrame(now, speed, head = ALERT) {
  return { pose: 'stand', head, legPhase: Math.floor(now / (speed > 10 ? 70 : 140)), wag: blink(now, 300) ? 1 : 0, effects: [] }
}

// Where the animal's head is in the scene, for placing z's, '!', and so on
function headSpot(f) {
  const facing = f.flip ? -1 : 1
  const x = Math.round(f.x) + facing * (f.pose === 'sit' ? 4 : 10)
  return { x, top: headTopRow(f) }
}

// Text dx columns past the head, in the direction the animal faces. With no
// y, it goes in the row of cells above the head and ears.
function text(f, s, dx, y, color) {
  f.effects.push({ kind: 'headText', text: s, dx, y, color })
}

// Three z's drifting up and away from the head
function addZs(f) {
  f.effects.push({ kind: 'zs' })
}

// Turns effects placed relative to the head into scene positions, once the
// frame's x and direction are known
function resolveEffects(f, now) {
  const spot = headSpot(f)
  const facing = f.flip ? -1 : 1
  // Text fills a whole cell, so the cell above the one that holds spot.top,
  // the head's outline, is the lowest that keeps clear of the head
  const above = 2 * Math.floor(spot.top / 2) - 1
  const out = []
  for (const fx of f.effects ?? []) {
    if (fx.kind === 'headText') {
      out.push({ kind: 'text', text: fx.text, x: spot.x + (f.flip ? -fx.dx - fx.text.length + 1 : fx.dx), y: fx.y ?? above, color: fx.color })
    } else if (fx.kind === 'zs') {
      // Each z rises from above the head to the top row of the band, growing
      // into a Z halfway up
      for (let i = 0; i < 3; i++) {
        const phase = (now / 4200 + i / 3) % 1
        const dx = 1 + Math.round(phase * 6)
        const y = Math.round(above * (1 - phase))
        out.push({ kind: 'text', text: phase < 0.5 ? 'z' : 'Z', x: spot.x + facing * dx, y, color: Z_COLOR })
      }
    } else if (fx.kind === 'headHeart') {
      out.push({ kind: 'heart', x: spot.x + facing * fx.dx - (f.flip ? 2 : 0), y: fx.y })
    } else if (fx.kind === 'food') {
      // drawFood puts it on the ground in front of the animal centered on x
      out.push({ ...fx, x: Math.round(f.x), flip: f.flip })
    } else if (fx.kind === 'bubble') {
      out.push({ ...fx, x: spot.x, y: spot.top })
    } else {
      out.push(fx)
    }
  }
  f.effects = out
}

function sleepFrame(now) {
  return {
    pose: 'lie',
    head: SLEEPING,
    breath: (Math.sin((now / 3200) * 2 * Math.PI) + 1) / 2,
    effects: [],
  }
}

// Whether the animal lies, sits, or stands at time now in its nap, where it
// is, and whether it faces left if that differs from where it walked
function napPose(d, now, home) {
  const nap = d.nap
  const t = nap === null ? 0 : now - nap.at
  switch (nap?.kind) {
    case 'scratch':
      if (t > 300 && t < 2000) return { pose: 'sit', x: home }
      break
    case 'roll':
      return { pose: 'belly', x: home }
    case 'circle':
      // Gets up, turns round once, and lies down again
      if (t < 1600) return { pose: 'stand', x: home - t / 200, flip: true }
      if (t <= 3400) return { pose: 'stand', x: home - 8 + (t - 1600) / 225 }
  }
  return { pose: 'lie', x: home }
}

function napFrame(d, now, home) {
  const f = { ...sleepFrame(now), ...napPose(d, now, home) }
  const nap = d.nap
  if (nap === null) {
    addZs(f)
    return f
  }
  const t = now - nap.at
  switch (nap.kind) {
    case 'earTwitch':
      f.head = { ...SLEEPING, ear: blink(t, 240) ? 'flap' : 'down' }
      addZs(f)
      break
    case 'tailThump':
      f.tailLift = blink(t, 260) ? 2 : 0
      addZs(f)
      break
    case 'dream':
      f.paddle = blink(t, 180) ? 1 : 0
      f.head = { ...SLEEPING, ear: blink(t, 700) ? 'flap' : 'down' }
      if (t > 1200 && t < 2000) text(f, animalOf(d).sound, 2, undefined, SOUND_COLOR)
      break
    case 'yawn':
      f.headDy = t > 200 && t < 1500 ? -1 : 0
      f.head = { ...SLEEPING, mouth: t > 350 && t < 1300 ? 'open' : 'shut' }
      break
    case 'scratch':
      if (f.pose === 'sit') {
        f.head = { ...SLEEPING, ear: 'flap' }
        f.scratch = blink(t, 120) ? 1 : 0
      }
      break
    case 'sleepSound':
      f.head = { ...SLEEPING, mouth: blink(t, 260) && t < 700 ? 'open' : 'shut' }
      if (t > 150) text(f, animalOf(d).sound, 2, undefined, SOUND_COLOR)
      break
    case 'roll':
      f.paddle = t > 1500 && t < 3500 && blink(t, 400) ? 1 : 0
      if (t > 1000) addZs(f)
      break
    case 'circle':
      if (f.pose === 'stand') Object.assign(f, { head: ALERT, legPhase: Math.floor(t / 140), wag: blink(t, 300) ? 1 : 0 })
      break
    case 'oneEye':
      f.head = { ...SLEEPING, eye: t > 250 && t < 1700 ? 'open' : 'closed' }
      break
    case 'bubble':
      f.effects.push({ kind: 'bubble', item: d.item, itemFlip: blink(t, 900) })
      if (d.item === 'prey') f.paddle = blink(t, 200) ? 1 : 0
      break
  }
  return f
}

function reactionFrame(d, now, home, columns) {
  const r = d.reaction
  const t = Math.max(0, now - r.at)
  switch (r.kind) {
    case 'twitch': {
      const f = sleepFrame(now)
      f.head = { ...SLEEPING, ear: 'flap' }
      addZs(f)
      return f
    }
    case 'wake':
      if (t < 350) return { ...sleepFrame(now), head: { ...ALERT, ear: 'flap' }, effects: [] }
      if (t < 800) return { pose: 'bow', head: { ...ALERT, mouth: 'open' }, wag: blink(t, 160) ? 1 : 0, effects: [] }
      return { pose: 'sit', head: ALERT, wag: 1, effects: [] }
    case 'oops': {
      const f = { pose: d.tools.length > 0 ? 'stand' : 'sit', head: { eye: 'open', ear: t < 600 ? 'up' : 'down', mouth: 'shut' }, effects: [] }
      f.dy = t < 300 ? -2 : 0
      if (t < 900) text(f, '!', 1, 1, BANG_COLOR)
      return f
    }
    case 'droop':
      return { pose: 'sit', head: { eye: 'open', ear: 'down', mouth: 'shut' }, headDy: 1, wag: -1, effects: [] }
    case 'happy': {
      const f = { pose: 'sit', head: { eye: 'open', ear: 'up', mouth: tongueOr(d, 'open') }, wag: blink(t, 120) ? 2 : 0, effects: [] }
      f.flip = t > 500 && t < 1000
      f.effects.push({ kind: 'headHeart', dx: 8, y: Math.max(0, 8 - Math.floor(t / 200)) })
      return f
    }
    case 'settle':
      if (t < 700) return { pose: 'bow', head: { ...ALERT, mouth: t > 200 ? 'open' : 'shut' }, effects: [] }
      return {
        ...sleepFrame(now),
        head: { eye: t < 1500 ? 'open' : 'closed', ear: 'down', mouth: t > 900 && t < 1500 ? 'open' : 'shut' },
        x: home,
      }
    case 'feed': {
      // Turns round to eat only if the food would run off the band ahead and
      // fits behind
      const fits = (flip) => {
        const [first, last] = foodSpan(animalOf(d), Math.round(xAt(d, now)), flip)
        return first >= 0 && last < columns
      }
      const flip = sideThatFits(facesLeft(d, now), fits)
      if (t < 2800) {
        const f = { flip, pose: 'stand', head: { eye: 'open', ear: 'down', mouth: blink(t, 220) ? 'open' : 'shut' }, headLow: true, wag: blink(t, 300) ? 1 : 0, effects: [] }
        f.effects.push({ kind: 'food', left: 1 - Math.floor(t / 700) / 4 })
        return f
      }
      const f = { flip, pose: 'sit', head: { eye: 'closed', ear: 'up', mouth: blink(t, 160) ? tongueOr(d, 'open') : 'shut' }, wag: 2, effects: [] }
      f.effects.push({ kind: 'headHeart', dx: 8, y: Math.max(0, 8 - Math.floor((t - 2800) / 200)) })
      return f
    }
    case 'pet': {
      const f = { pose: 'belly', head: { eye: 'open', ear: 'down', mouth: tongueOr(d, 'open') }, paddle: blink(t, 200) ? 1 : 0, effects: [] }
      f.effects.push({ kind: 'headHeart', dx: 0, y: Math.max(0, 5 - Math.floor((t % 1300) / 260)) })
      return f
    }
  }
  return sleepFrame(now)
}

// Cats don't pant or loll their tongue
function tongueOr(d, mouth) {
  return animalOf(d).tongue === false ? mouth : 'tongue'
}

function workFrame(d, now, home, left, right) {
  const activity = currentActivity(d)
  const tired = now - d.workStartedAt > PANT_AFTER_MS
  const head = { ...ALERT, mouth: tired ? tongueOr(d, 'shut') : 'shut' }

  if (activity === 'sniff' || activity === 'fetch') {
    // Roams between two points: slowly with its nose down, or at a run
    const fast = activity === 'fetch'
    const ends = fast ? [left, right] : [Math.max(left, home - 22), home]
    if (d.roamTarget === null || !ends.includes(d.roamTarget)) d.roamTarget = ends[0]
    let f = walkTo(d, now, d.roamTarget, fast ? 18 : 5, head)
    if (f === null) {
      d.roamTarget = d.roamTarget === ends[0] ? ends[1] : ends[0]
      f = walkTo(d, now, d.roamTarget, fast ? 18 : 5, head) ?? { pose: 'stand', head, effects: [] }
    }
    if (fast) {
      // The ball bounces along ahead of the animal
      const ahead = facesLeft(d, now) ? -1 : 1
      const bounce = Math.abs(Math.sin(now / 160))
      f.effects.push({ kind: 'ball', x: Math.round(xAt(d, now)) + ahead * 15 - 1, y: SCENE_PX - 3 - Math.round(bounce * 5) })
    } else {
      f.headLow = true
      if (now % 3000 < 700) text(f, 'snf', 3, 6, SNIFF_COLOR)
    }
    return f
  }

  d.roamTarget = null
  // Back home, it faces right
  const back = walkTo(d, now, home, 10, head, false)
  if (back !== null) return back

  switch (activity) {
    case 'dig': {
      const f = { pose: 'stand', head, headLow: true, pawUp: blink(now, 160), wag: blink(now, 240) ? 1 : 0, effects: [] }
      // Dirt flies back between the legs
      for (let i = 0; i < 5; i++) {
        const phase = (now / 550 + i / 5) % 1
        f.effects.push({ kind: 'dirt', x: Math.round(home - 6 - phase * 16), y: Math.round(SCENE_PX - 2 - Math.sin(phase * Math.PI) * 8) })
      }
      return f
    }
    case 'point':
      return { pose: 'stand', head, pawUp: true, wag: 0, effects: [] }
    default: {
      // Thinking: sits and listens, head tilting now and then, with a blink
      const tilt = Math.floor(now / 2500) % 3 === 1
      const blinking = now % 4100 < 150
      return {
        pose: 'sit',
        head: { ...head, eye: blinking ? 'closed' : 'open' },
        headDy: tilt ? -1 : 0,
        wag: Math.round(1 + Math.sin(now / 180)),
        effects: [],
      }
    }
  }
}

// The side given by preferred, a boolean, unless only the other side fits
function sideThatFits(preferred, fits) {
  return !fits(preferred) && fits(!preferred) ? !preferred : preferred
}

// One youngster for each subagent that is running, playing behind the animal,
// or ahead of it when they would run off the band behind
function addYoungsters(d, now, f, columns) {
  const youngsters = Math.min(3, d.tools.filter((t) => t.activity === 'youngster').length)
  // Where youngster i's sprite starts, to the animal's left or right
  const leftOf = (onLeft, i) => Math.round(f.x) + (onLeft ? -(CENTER + 4 + i * 10) - (YOUNGSTER_W - 1) : CENTER + 4 + i * 10)
  // Its outline adds a column on each side
  const fits = (onLeft) => leftOf(onLeft, youngsters - 1) >= 0 && leftOf(onLeft, youngsters - 1) + YOUNGSTER_W + 2 <= columns
  const onLeft = sideThatFits(!f.flip, fits)
  for (let i = 0; i < youngsters; i++) {
    const hop = Math.floor(now / 200 + i) % 2
    const x = leftOf(onLeft, i)
    f.effects.push({ kind: 'youngster', x, phase: hop, flip: (Math.floor(now / 1700) + i) % 3 === 0 })
  }
}
