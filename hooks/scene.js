// Draws one frame of the animal as pixel art and packs it into Raster cells.
// Pure functions only: nothing here calls the mods API, so tests and the
// preview script can import this file directly.

// The scene is SCENE_ROWS terminal rows tall. Each cell is a half block, so it
// holds two pixels stacked vertically, which makes the pixels roughly square.
export const SCENE_ROWS = 7
export const SCENE_PX = SCENE_ROWS * 2

// Raster's value for "the terminal's default color"
export const DEFAULT_COLOR = 0x01000000

export const COLORS = {
  k: 0x2b1d14, // outline
  b: 0xd8a35d, // fur
  d: 0x8a5a2b, // ears and saddle
  D: 0x5a3a1c, // closed eye
  w: 0xf4ecdf, // muzzle, chest, paws, tail tip
  n: 0x1b1b1b, // nose
  e: 0x111111, // open eye
  p: 0xe5768f, // mouth and tongue
  r: 0xc0392b, // collar
  y: 0xf4c430, // collar tag
  t: 0xf4ecdf, // tail tip
  ball: 0xd8433a,
  dirt: 0x8b6239,
  bubble: 0xaebccb,
  heart: 0xe0507a,
}

// What sets one animal apart from another: its colors, head, ears, babies
// (a body for each step, or one for both), and the two things it dreams of. Poses read the rest of their shape from
// the flags (hump, legs, longTail, collar). An eridian has no head, ears or
// tail: ERIDIAN_POSES draw it instead, as a carapace on five limbs, one of
// which it raises where other animals prick up their ears.
export const ANIMALS = {
  camel: {
    colors: {
      b: 0xc9a46a, // fur
      d: 0xa47c45, // ears and hump shading
      D: 0x5a3a1c, // closed eye
      w: 0xe6cf9f, // muzzle, chest, feet
      n: 0x5a3a1c, // nostril
      t: 0x6b4a26, // tail tuft
    },
    head: [
      '..........',
      '..........',
      '..bbb.....',
      '..bbbbbb..',
      '..bbbbbbbn',
      '...bbbbbww',
      '....bbwww.',
      '..........',
    ],
    eye: [4, 3],
    mouth: [6, 5],
    ears: { down: ['.dd'], up: ['..d.', '..dd'], flap: ['.d..', '..d.'] },
    earRow: { down: 2, up: 0, flap: 0 },
    youngster: [['......bb.', '..bb..bew', '.bbbb.bbw', '.bbbbbbb.', '.bbbbbb..']],
    // Highest row the head may reach, so its ears keep a row above for their outline
    headTop: 1,
    hump: true,
    legs: 1,
    sound: 'hrm',
    dreams: { food: 'cactus', prey: 'water' },
  },
  cat: {
    colors: {
      b: 0x8a919c, // fur
      d: 0x8a919c, // ears and saddle
      D: 0x3b3e44, // closed eye
      w: 0x8a919c, // muzzle, chest, paws
      n: 0x45484e, // nose
      e: 0x5cb83a, // open eye
      t: 0x8a919c, // tail tip
      ball: 0x6a8fd8, // yarn
    },
    head: [
      '..........',
      '..........',
      '..bbbbbb..',
      '..bbbbbbb.',
      '..bbbbbwwn',
      '..bbbbwww.',
      '...bbbww..',
      '..........',
    ],
    eye: [6, 3],
    mouth: [5, 5],
    ears: { down: ['..dd..dd'], up: ['...d...d', '..dd..dd'], flap: ['.......d', '..dd..dd'] },
    earRow: { down: 1, up: 0, flap: 0 },
    // Its tail sways from one step to the next
    youngster: [
      ['b....d.d.', 'b....bbbb', '.b...bebw', '.bbbbbbbn', '.bbbbbb..'],
      ['.b...d.d.', '.b...bbbb', '.b...bebw', '.bbbbbbbn', '.bbbbbb..'],
    ],
    headTop: 1,
    longTail: true,
    tongue: false,
    sound: 'mrr',
    dreams: { food: 'fish', prey: 'mouse' },
  },
  dog: {
    colors: {},
    head: [
      '..........',
      '...bbbb...',
      '..bbbbbbb.',
      '..bbbbbbww',
      '..bbbbwwwn',
      '..bbbwwwww',
      '...bbbwww.',
      '..........',
    ],
    eye: [6, 3],
    mouth: [6, 5],
    ears: {
      down: ['.d..', 'ddd.', 'ddd.', 'ddd.', 'ddd.', '.dd.', '.d..'],
      up: ['..dd', '.ddd', '.dd.'],
      flap: ['dd..', 'ddd.', '.dd.'],
    },
    earRow: { down: 1, up: 0, flap: 1 },
    youngster: [['.....dbb.', '.....dbew', 'd...bbbwn', '.bbbbbbb.', '.bbbbbb..']],
    collar: true,
    sound: 'wuf',
    dreams: { food: 'bone', prey: 'squirrel' },
  },
  rocky: {
    colors: {
      b: 0x8a8370, // carapace
      d: 0x5f5a49, // mottling and underside
      l: 0x6b6450, // limbs
      w: 0xc9c1a6, // feet and fingers
      n: 0x2e2b22, // vent
      ball: 0xd9b84a, // xenonite
    },
    eridian: true,
    youngster: [
      ['.........', '...bbbb..', '.bbdbbbb.', 'bbbbbbdbb', '.bdbbbbb.'],
      ['......w.w', '...bbbbl.', '.bbdbbbb.', 'bbbbbbdbb', '.bdbbbbb.'],
    ],
    tongue: false,
    sound: '♪♫♪',
    dreams: { food: 'astrophage', prey: 'star' },
  },
}

export const DEFAULT_ANIMAL = 'dog'

export function isAnimal(name) {
  return typeof name === 'string' && Object.hasOwn(ANIMALS, name)
}

// Anything that isn't an animal's name, such as a frame's missing animal,
// means the default animal
export function animalName(name) {
  return isAnimal(name) ? name : DEFAULT_ANIMAL
}

// The animal that a frame, or the animal's state, names
export function animalOf(f) {
  return ANIMALS[animalName(f.animal)]
}

const PALETTES = Object.fromEntries(Object.entries(ANIMALS).map(([name, a]) => [name, { ...COLORS, ...a.colors }]))

function colorsOf(f) {
  return PALETTES[animalName(f.animal)]
}

// The first and last rows of the head sprite that the head or an ear, in any
// position, draws on. An eridian has neither.
const REACH = Object.fromEntries(
  Object.entries(ANIMALS)
    .filter(([, a]) => !a.eridian)
    .map(([name, a]) => {
      const rows = Object.entries(a.ears).flatMap(([ear, sprite]) => sprite.map((row, j) => [row, a.earRow[ear] + j]))
      rows.push(...a.head.map((row, j) => [row, j]))
      const drawn = rows.filter(([row]) => /[^.]/.test(row)).map(([, j]) => j)
      return [name, { top: Math.min(...drawn), bottom: Math.max(...drawn) }]
    }),
)

// Things an animal can dream of, with the palette letter each sprite uses
const DREAMS = {
  bone: { rows: ['w.....w', 'wwwwwww', 'w.....w'], colors: { w: 0xf0ead8 } },
  squirrel: { rows: ['ss...', 'sss.s', '.ssss', '.sss.'], colors: { s: 0xb06a3a } },
  fish: { rows: ['..fff..f', '.fffffff', '..fff..f'], colors: { f: 0x7fb2d9 } },
  mouse: { rows: ['....ss', 's.ssss', '.ssss.'], colors: { s: 0x8a8a8a } },
  cactus: { rows: ['c.c..', 'ccc.c', '..ccc', '..c..'], colors: { c: 0x4f9a3a } },
  water: { rows: ['.w.', 'www', 'www', '.w.'], colors: { w: 0x5aa9e6 } },
  // A cell of the star-eating microbe, glowing at its rim
  astrophage: { rows: ['.ggg.', 'gaaag', 'gaaag', '.ggg.'], colors: { a: 0x3a1c2a, g: 0xe0603a } },
  // A star, such as 40 Eridani, home
  star: { rows: ['..s..', 'sssss', '.sss.', 's...s'], colors: { s: 0xf4d35e } },
}
const HEART = ['h.h', 'hhh', '.h.']
// A youngster's legs on each step of its hop, under its body
const YOUNGSTER_LEGS = ['.b.b.b.b.', 'b..b..b.b']
export const YOUNGSTER_W = YOUNGSTER_LEGS[0].length
// The food lands this many columns ahead of the animal's center
const FOOD_AHEAD = 12

export class Canvas {
  constructor(w, h) {
    this.w = w
    this.h = h
    this.px = new Int32Array(w * h).fill(-1)
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1
    return this.px[y * this.w + x]
  }

  set(x, y, c) {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    this.px[y * this.w + x] = c
  }

  // Fills the pixels whose centers lie inside the ellipse. With onlyOver, it
  // paints only pixels that are already set, to add markings to a shape.
  ellipse(cx, cy, rx, ry, c, onlyOver = false) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx
        const dy = (y + 0.5 - cy) / ry
        if (dx * dx + dy * dy > 1) continue
        if (onlyOver && this.get(x, y) < 0) continue
        this.set(x, y, c)
      }
    }
  }

  rect(x0, y0, x1, y1, c) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c)
  }

  line(x0, y0, x1, y1, c, thick = 1) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2))
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / steps)
      const y = Math.round(y0 + ((y1 - y0) * i) / steps)
      for (let t = 0; t < thick; t++) this.set(x + t, y, c)
    }
  }

  // Draws a sprite of palette letters, with '.' left clear
  stamp(rows, x, y, palette = COLORS, flip = false) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i]
        if (ch === '.') continue
        const col = flip ? x + row.length - 1 - i : x + i
        this.set(col, y + j, palette[ch])
      }
    })
  }

  // Draws other onto this canvas, shifted, and mirrored when flip is set
  over(other, dx = 0, dy = 0, flip = false) {
    for (let y = 0; y < other.h; y++) {
      for (let x = 0; x < other.w; x++) {
        const c = other.px[y * other.w + x]
        if (c < 0) continue
        this.set(flip ? dx + other.w - 1 - x : dx + x, dy + y, c)
      }
    }
  }

  // A copy of this canvas with a one-pixel outline around every shape
  outlined(color = COLORS.k) {
    const out = new Canvas(this.w, this.h)
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) >= 0) continue
        if (this.get(x - 1, y) >= 0 || this.get(x + 1, y) >= 0 || this.get(x, y - 1) >= 0 || this.get(x, y + 1) >= 0) {
          out.set(x, y, color)
        }
      }
    }
    out.over(this)
    return out
  }
}

// The animal is drawn facing right into a canvas of its own, then placed in the
// scene. OX is the x of its rump and GY the ground row.
export const ANIMAL_W = 32
const OX = 6
const GY = SCENE_PX - 1

// The top-left of the head sprite in the animal canvas for frame f. The head
// rests at least a row below the animal's headTop row, so a tilt up reaches
// headTop and no further. An animal without a headTop has no limit.
function headAt(f, a) {
  const at = {
    lie: [OX + 15, GY - 8],
    sit: [OX + 8, GY - 13],
    stand: [OX + 13, GY - 12 - (a.legs ?? 0) + (f.headLow ? 5 : 0)],
    bow: [OX + 14, GY - 9],
  }[f.pose]
  const top = a.headTop ?? -Infinity
  const rest = Math.max(top + 1, at[1])
  return [at[0], Math.max(top, rest + (f.headDy ?? 0))]
}

// The scene row just above the top of the head and ears in frame f, for
// placing z's and thought bubbles over it
export function headTopRow(f) {
  const name = animalName(f.animal)
  if (ANIMALS[name].eridian) return eridianTop(f) - 1
  // On its back the head is upside down, resting on the ground
  if (f.pose === 'belly') return GY - 6 + (7 - REACH[name].bottom) - 1
  return headAt(f, ANIMALS[name])[1] + REACH[name].top - 1
}

// Draws the head with its ear, eye, and mouth variants into canvas c
function drawHead(c, x, y, head, a, P) {
  c.stamp(a.head, x, y, P)
  const [ex, ey] = a.eye
  if (head.eye === 'open') c.set(x + ex, y + ey, P.e)
  else c.rect(x + ex - 1, y + ey, x + ex, y + ey, P.D)
  const [mx, my] = a.mouth
  if (head.mouth === 'open' || head.mouth === 'tongue') {
    c.rect(x + mx, y + my, x + mx + 3, y + my, P.p)
    c.rect(x + mx - 1, y + my + 1, x + mx + 2, y + my + 1, P.w)
  }
  if (head.mouth === 'tongue') c.rect(x + mx + 2, y + my + 1, x + mx + 2, y + my + 2, P.p)
  const ear = head.ear ?? 'down'
  c.stamp(a.ears[ear], x, y + a.earRow[ear], P)
}

// A tail from the rump at (x0, y0) to its tip at (x1, y1). A long tail
// reaches half as far again, short of column 0 and row 0 so the tip keeps its
// outline.
function drawTail(c, a, P, x0, y0, x1, y1) {
  if (a.longTail) {
    x1 = Math.max(1, Math.round(x0 + (x1 - x0) * 1.5))
    y1 = Math.min(GY, Math.max(1, Math.round(y0 + (y1 - y0) * 1.5)))
  }
  c.line(x0, y0, x1, y1, P.b, 1)
  c.set(x1, y1, P.t)
}

function drawHump(c, a, P, cx, cy, rx, ry) {
  if (a.hump) c.ellipse(cx, cy, rx, ry, P.b)
}

// Each pose returns its parts back to front. Every part is outlined on its
// own, so a part in front gets a dark edge over the part behind it.
const POSES = {
  lie(f, a, P) {
    const breath = f.breath ?? 0
    const lift = f.tailLift ?? 0
    const paddle = f.paddle ?? 0
    return [
      (c) => drawTail(c, a, P, OX + 1, GY - 2, OX - 4, GY - lift),
      (c) => {
        // Far front leg, which paddles in a dream
        c.rect(OX + 15, GY - 1, OX + 20 + paddle, GY - 1, P.b)
        c.rect(OX + 20 + paddle, GY - 1, OX + 21 + paddle, GY - 1, P.w)
      },
      (c) => {
        c.ellipse(OX + 9, GY - 2.4 - breath * 0.4, 8.6, 2.9 + breath * 0.6, P.b)
        drawHump(c, a, P, OX + 8, GY - 5.2 - breath * 0.5, 3.6, 2.4)
        c.ellipse(OX + 8, GY - 4.6 - breath * 0.5, 5, 1.5, P.d, true)
        c.ellipse(OX + 9, GY - 0.6, 6, 1, P.w, true)
      },
      (c) => {
        c.ellipse(OX + 4, GY - 2.2, 3.4, 2.6, P.b)
        c.rect(OX + 3, GY, OX + 7 - paddle, GY, P.w)
      },
      (c) => {
        c.rect(OX + 14, GY, OX + 20 - paddle, GY, P.b)
        c.rect(OX + 20 - paddle, GY, OX + 22 - paddle, GY, P.w)
      },
      (c) => {
        drawHead(c, ...headAt(f, a), f.head, a, P)
        if (a.collar) c.rect(OX + 16, GY - 3, OX + 16, GY - 2, P.r)
      },
    ]
  },

  sit(f, a, P) {
    const wag = f.wag ?? 0
    const scratch = f.scratch
    return [
      (c) => drawTail(c, a, P, OX + 1, GY - 1, OX - 3, GY - 1 - Math.round(1 + wag)),
      (c) => {
        // Far front leg
        c.rect(OX + 12, GY - 4, OX + 12, GY, P.b)
        c.set(OX + 13, GY, P.w)
      },
      (c) => {
        c.ellipse(OX + 9, GY - 4.6, 3.4, 4.6, P.b)
        drawHump(c, a, P, OX + 6.5, GY - 7, 2.6, 2.4)
        c.ellipse(OX + 11, GY - 4, 1.5, 2.8, P.w, true)
        c.ellipse(OX + 7, GY - 6, 2, 2.6, P.d, true)
      },
      (c) => {
        c.ellipse(OX + 5, GY - 2.4, 3.8, 2.9, P.b)
        if (scratch === undefined) c.rect(OX + 3, GY, OX + 8, GY, P.w)
      },
      (c) => {
        const paw = f.pawUp ? 2 : 0
        c.rect(OX + 10, GY - 4, OX + 11, GY - paw, P.b)
        c.rect(OX + 10, GY - paw, OX + 12, GY - paw, P.w)
      },
      (c) => {
        drawHead(c, ...headAt(f, a), f.head, a, P)
        if (!a.collar) return
        c.rect(OX + 10, GY - 7, OX + 11, GY - 7, P.r)
        c.set(OX + 12, GY - 7, P.y)
      },
      (c) => {
        if (scratch === undefined) return
        // Back leg reaches past the shoulder to scratch behind the ear
        const footY = GY - 9 + scratch
        c.line(OX + 5, GY - 3, OX + 7, footY, P.b, 2)
        c.rect(OX + 7, footY - 1, OX + 8, footY, P.w)
      },
    ]
  },

  stand(f, a, P) {
    const phase = f.legPhase ?? 0
    const wag = f.wag ?? 0
    const swing = [0, 1, 0, -1][phase % 4]
    const low = f.headLow ? 5 : 0
    const up = a.legs ?? 0
    return [
      (c) => drawTail(c, a, P, OX + 1, GY - 6 - up, OX - 2, GY - 9 - up - Math.round(wag)),
      (c) => {
        // Far legs, half a stride behind the near ones
        c.line(OX + 4, GY - 4 - up, OX + 4 - swing, GY, P.b, 1)
        c.line(OX + 13, GY - 4 - up, OX + 13 - swing, GY, P.b, 1)
      },
      (c) => {
        c.ellipse(OX + 8.5, GY - 5.2 - up, 7.2, 2.7, P.b)
        drawHump(c, a, P, OX + 7.5, GY - 8.4 - up, 3.8, 3)
        c.ellipse(OX + 7, GY - 6.6 - up, 4.5, 1.3, P.d, true)
        c.ellipse(OX + 9, GY - 3.6 - up, 5, 0.9, P.w, true)
        c.ellipse(OX + 14.5, GY - 7 - up + low * 0.5, 2, 2.6, P.b)
      },
      (c) => {
        const paw = f.pawUp ? 2 : 0
        c.line(OX + 2, GY - 4 - up, OX + 2 + swing, GY, P.b, 2)
        c.line(OX + 11, GY - 4 - up, OX + 11 + swing, GY - paw, P.b, 2)
        c.rect(OX + 2 + swing, GY, OX + 3 + swing, GY, P.w)
        c.rect(OX + 11 + swing, GY - paw, OX + 13 + swing, GY - paw, P.w)
      },
      (c) => {
        drawHead(c, ...headAt(f, a), f.head, a, P)
        if (a.collar) c.rect(OX + 14, GY - 7 + low, OX + 15, GY - 7 + low, P.r)
      },
    ]
  },

  // Rolled onto its back with its paws in the air
  belly(f, a, P) {
    const kick = f.paddle ?? 0
    return [
      (c) => drawTail(c, a, P, OX + 1, GY - 1, OX - 4, GY),
      (c) => {
        for (const [x, k] of [
          [3, kick],
          [6, -kick],
          [12, -kick],
          [15, kick],
        ]) {
          c.line(OX + x, GY - 3, OX + x + k, GY - 7, P.b, 2)
          c.rect(OX + x + k, GY - 8, OX + x + k + 1, GY - 8, P.w)
        }
      },
      (c) => {
        c.ellipse(OX + 9, GY - 1.8, 8.6, 2.6, P.b)
        c.ellipse(OX + 9, GY - 3, 6, 1.4, P.w, true)
      },
      (c) => {
        // Upside down head, resting on the ground
        const h = new Canvas(10, 8)
        drawHead(h, 0, 0, f.head, a, P)
        for (let y = 0; y < 8; y++)
          for (let x = 0; x < 10; x++) {
            const col = h.get(x, y)
            if (col >= 0) c.set(OX + 16 + x, GY - 6 + (7 - y), col)
          }
      },
    ]
  },

  // A play bow: chest down, rump up, the start of a stretch
  bow(f, a, P) {
    const wag = f.wag ?? 0
    return [
      (c) => drawTail(c, a, P, OX + 1, GY - 8, OX - 2, GY - 11 - Math.round(wag)),
      (c) => {
        c.line(OX + 3, GY - 5, OX + 3, GY, P.b, 2)
        c.rect(OX + 3, GY, OX + 4, GY, P.w)
      },
      (c) => {
        c.ellipse(OX + 5, GY - 6.5, 4, 2.6, P.b)
        c.ellipse(OX + 10, GY - 3.6, 5, 2.2, P.b)
        drawHump(c, a, P, OX + 7.5, GY - 7.4, 3, 2.2)
        c.ellipse(OX + 7, GY - 6.4, 3.5, 1.2, P.d, true)
      },
      (c) => {
        c.rect(OX + 12, GY, OX + 21, GY, P.b)
        c.rect(OX + 20, GY, OX + 22, GY, P.w)
      },
      (c) => {
        drawHead(c, ...headAt(f, a), f.head, a, P)
      },
    ]
  },
}

// The top row of an eridian's carapace, or of its raised feet when it lies on
// its back, in frame f
function eridianTop(f) {
  const tilt = f.headDy ?? 0
  return {
    stand: 2 + (f.headLow ? 2 : 0) + tilt,
    sit: 4 + tilt,
    lie: 8,
    belly: 5,
    bow: 2,
  }[f.pose]
}

// An eridian's carapace: a mottled dome rx wide, with its top row at top. On
// its back, the darker underside is uppermost.
function drawCarapace(c, P, cx, top, rx, ry, upsideDown = false) {
  const cy = top + ry - 0.5
  c.ellipse(cx + 0.5, cy, rx, ry, P.b)
  c.ellipse(cx + 0.5, upsideDown ? top + 0.2 : top + 2 * ry - 0.7, rx - 1.5, 0.9, P.d, true)
  const spots = [
    [-4, 1],
    [2, 1],
    [-1, 2],
    [4, 2],
    [-5, 3],
    [1, 3],
    [5, 3],
    [-2, 4],
  ]
  for (const [dx, dy] of spots) {
    const y = upsideDown ? top + 2 * ry - 1 - dy : top + dy
    if (c.get(cx + dx, y) >= 0) c.set(cx + dx, y, P.d)
  }
}

// A jointed limb from the hip through the knee to a foot drawn outward
function drawLimb(c, P, hip, knee, foot) {
  c.line(...hip, ...knee, P.l)
  c.line(...knee, ...foot, P.l)
  const out = foot[0] < hip[0] ? -1 : 1
  c.set(foot[0], foot[1], P.w)
  c.set(foot[0] + out, foot[1], P.w)
}

// The raised limb, waving its three-fingered hand above the carapace's front
function drawArm(c, P, cx, top, ear) {
  const wave = ear === 'flap' ? 1 : 0
  const wrist = [cx + 11 + wave, top]
  c.line(cx + 5, top + 3, cx + 9, top + 2, P.l)
  c.line(cx + 9, top + 2, ...wrist, P.l)
  const [wx, wy] = wrist
  c.rect(wx - 1, wy - 1, wx + 1, wy - 1, P.w)
  for (const dx of [-2, 0, 2]) c.set(wx + dx + (dx === 0 ? 0 : wave * Math.sign(dx)), wy - 2, P.w)
}

// The vent it talks through, open on top of the carapace
function drawVent(c, P, cx, top, head) {
  if (head.mouth === 'open' || head.mouth === 'tongue') c.rect(cx, top, cx + 1, top, P.n)
}

// An eridian's poses, which read the same frame values as POSES
const ERIDIAN_POSES = {
  lie(f, a, P) {
    const breath = f.breath ?? 0
    const ry = 2.4 + breath * 0.4
    const top = Math.round(GY + 0.5 - 2 * ry)
    const paddle = f.paddle ?? 0
    const lift = f.tailLift ?? 0
    // Asleep, it twitches its front knee where other animals twitch an ear
    const twitch = f.head.ear === 'down' ? 0 : 1
    const cx = OX + 9
    return [
      (c) => {
        drawLimb(c, P, [cx - 5, GY - 2], [cx - 8, GY - 4], [cx - 10, GY - lift])
        drawLimb(c, P, [cx + 6, GY - 2], [cx + 9, GY - 4 - Math.max(paddle, twitch)], [cx + 11, GY])
      },
      (c) => {
        drawCarapace(c, P, cx, top, 7, ry)
        drawVent(c, P, cx, top, f.head)
      },
    ]
  },

  sit(f, a, P) {
    const top = eridianTop(f)
    const hip = top + 5
    const cx = OX + 9
    const raised = f.head.ear === 'up' || f.head.ear === 'flap'
    const scratch = f.scratch
    return [
      (c) => {
        c.line(cx, hip + 1, cx, GY, P.l)
        drawLimb(c, P, [cx - 2, hip + 1], [cx - 4, hip + 1], [cx - 5, GY])
        drawLimb(c, P, [cx + 3, hip + 1], [cx + 5, hip + 1], [cx + 6, GY])
      },
      (c) => {
        drawCarapace(c, P, cx, top, 6.5, 3.2)
        drawVent(c, P, cx, top, f.head)
      },
      (c) => {
        if (scratch === undefined) drawLimb(c, P, [cx - 5, hip - 1], [cx - 9, hip - 4], [cx - 10, GY])
        else drawLimb(c, P, [cx - 5, hip - 1], [cx - 9, top - 1], [cx - 4, top - 1 + scratch])
        if (raised) drawArm(c, P, cx, top, f.head.ear)
        else drawLimb(c, P, [cx + 6, hip - 1], [cx + 10, hip - 4], [cx + 11, GY])
      },
    ]
  },

  stand(f, a, P) {
    const top = eridianTop(f)
    const hip = top + 5
    const cx = OX + 9
    const swing = [0, 1, 0, -1][(f.legPhase ?? 0) % 4]
    const paw = f.pawUp ? 2 : 0
    const raised = f.head.ear === 'up' || f.head.ear === 'flap'
    return [
      (c) => {
        c.line(cx, hip + 1, cx - swing, GY, P.l)
        drawLimb(c, P, [cx - 2, hip + 1], [cx - 5, hip + 2], [cx - 6 + swing, GY])
        drawLimb(c, P, [cx + 3, hip + 1], [cx + 6, hip + 2], [cx + 7 - swing, GY])
      },
      (c) => {
        drawCarapace(c, P, cx, top, 6.5, 3.2)
        drawVent(c, P, cx, top, f.head)
      },
      (c) => {
        drawLimb(c, P, [cx - 5, hip - 1], [cx - 9, hip - 3], [cx - 11 - swing, GY])
        if (raised) drawArm(c, P, cx, top, f.head.ear)
        else drawLimb(c, P, [cx + 6, hip - 1], [cx + 10, hip - 3], [cx + 12 + swing, GY - paw])
      },
    ]
  },

  // Rolled onto its back with its five limbs in the air
  belly(f, a, P) {
    const kick = f.paddle ?? 0
    const cx = OX + 9
    return [
      (c) => {
        for (const [dx, k] of [
          [-6, kick],
          [-3, -kick],
          [0, kick],
          [3, -kick],
          [6, kick],
        ]) {
          const out = Math.sign(dx)
          drawLimb(c, P, [cx + dx, GY - 4], [cx + dx + out, GY - 6], [cx + dx + out * 2 + k, GY - 8])
        }
      },
      (c) => drawCarapace(c, P, cx, GY - 4, 7, 2.4, true),
    ]
  },

  // Rear up, front down, the start of a stretch
  bow(f, a, P) {
    const cx = OX + 9
    return [
      (c) => {
        drawLimb(c, P, [cx - 2, GY - 4], [cx - 3, GY - 3], [cx - 4, GY])
        drawLimb(c, P, [cx + 3, GY - 2], [cx + 6, GY - 2], [cx + 8, GY])
      },
      (c) => {
        drawCarapace(c, P, cx - 2, 2, 5, 3)
        drawCarapace(c, P, cx + 3, 5, 5, 3)
        drawVent(c, P, cx + 3, 5, f.head)
      },
      (c) => {
        drawLimb(c, P, [cx - 6, 7], [cx - 8, 7], [cx - 10, GY])
        drawLimb(c, P, [cx + 7, GY - 3], [cx + 10, GY - 2], [cx + 12, GY])
      },
    ]
  },
}

// x of the body's center inside the animal canvas, facing right
export const CENTER = OX + 9

// The scene x of the animal canvas's left edge, for an animal centered on f.x
export function animalLeft(f) {
  return Math.round(f.x) - (f.flip ? ANIMAL_W - 1 - CENTER : CENTER)
}

// Draws animal a with palette P for frame f into an ANIMAL_W by SCENE_PX
// canvas, facing right
function drawAnimal(f, a, P) {
  const out = new Canvas(ANIMAL_W, SCENE_PX)
  for (const part of (a.eridian ? ERIDIAN_POSES : POSES)[f.pose](f, a, P)) {
    const c = new Canvas(ANIMAL_W, SCENE_PX)
    part(c)
    out.over(c.outlined())
  }
  return out
}

// Draws a whole frame: the animal, then its effects and any text, into a grid of
// columns by SCENE_ROWS cells. Returns the cells as code point, foreground,
// background triples.
export function drawScene(f, columns) {
  const scene = new Canvas(columns, SCENE_PX)
  const a = animalOf(f)
  const P = colorsOf(f)
  scene.over(drawAnimal(f, a, P), animalLeft(f), f.dy ?? 0, f.flip)
  const texts = []
  for (const fx of f.effects ?? []) {
    switch (fx.kind) {
      case 'text':
        texts.push(fx)
        break
      case 'youngster':
        scene.over(spriteCanvas(youngsterRows(a, fx.phase % 2), P), fx.x, SCENE_PX - 7, fx.flip)
        break
      case 'ball':
        scene.over(spriteCanvas(['bb', 'bb'], { b: P.ball }), fx.x, fx.y)
        break
      case 'heart':
        scene.over(spriteCanvas(HEART, { h: COLORS.heart }, false), fx.x, fx.y)
        break
      case 'dirt':
        scene.set(fx.x, fx.y, COLORS.dirt)
        break
      case 'bubble':
        drawBubble(scene, fx, a)
        break
      case 'food':
        drawFood(scene, fx, a)
        break
    }
  }
  return toCells(scene, texts)
}

// A youngster's sprite on one step of its hop
function youngsterRows(a, step) {
  return [...a.youngster[step % a.youngster.length], YOUNGSTER_LEGS[step]]
}

function spriteCanvas(rows, palette, outline = true) {
  const c = new Canvas(rows[0].length, rows.length)
  c.stamp(rows, 0, 0, palette)
  return outline ? padOutline(c) : c
}

// Outlines a small sprite, growing it by a pixel on each side for the edge
function padOutline(c) {
  const big = new Canvas(c.w + 2, c.h + 2)
  big.over(c, 1, 1)
  return big.outlined()
}

// The thought bubble's outline: a 13x7 ellipse with its middle cut out
const RING = (() => {
  const ring = new Canvas(13, 7)
  ring.ellipse(6.5, 3.5, 6.5, 3.5, COLORS.bubble)
  const inner = new Canvas(13, 7)
  inner.ellipse(6.5, 3.5, 5.5, 2.5, 1)
  for (let i = 0; i < inner.px.length; i++) if (inner.px[i] >= 0) ring.px[i] = -1
  return ring
})()

// A thought bubble with one of the animal's dreams in it, and small puffs
// leading down to its head at (fx.x, fx.y). An animal with a hump has the
// bubble behind the hump, with more puffs leading over it.
function drawBubble(scene, fx, a) {
  const bx = Math.max(0, fx.x - (a.hump ? 28 : 17))
  // The puffs rise from the head, and stop a column short of the ring
  let x = fx.x - 1
  for (let k = 0; x >= bx + 14; k++) {
    scene.set(x, Math.max(2, fx.y - 1 - k), COLORS.bubble)
    x -= k === 0 ? 2 : 3
  }
  scene.over(RING, bx, 0)
  const dream = DREAMS[a.dreams[fx.item]]
  const item = spriteCanvas(dream.rows, dream.colors, false)
  scene.over(item, bx + Math.floor((13 - item.w) / 2), Math.floor((7 - item.h) / 2), fx.item === 'prey' && fx.itemFlip)
}

// The first and last scene columns that animal a's whole favorite food covers,
// outline included, when it lies in front of the animal centered on x
export function foodSpan(a, x, flip) {
  const w = DREAMS[a.dreams.food].rows[0].length + 2
  const near = x + (flip ? -FOOD_AHEAD : FOOD_AHEAD)
  return flip ? [near - w + 1, near] : [near, near + w - 1]
}

// The animal's favorite food on the ground in front of the animal centered on
// fx.x, eaten down to the fx.left share. The animal eats from the near end,
// so the far end stays put. Food that would run off the band slides back onto it.
function drawFood(scene, fx, a) {
  const { rows, colors } = DREAMS[a.dreams.food]
  const w = rows[0].length
  const item = spriteCanvas(
    rows.map((r) => r.slice(w - Math.ceil(w * fx.left))),
    colors,
  )
  const [first, last] = foodSpan(a, fx.x, fx.flip)
  const slide = Math.max(0, -first) - Math.max(0, last - (scene.w - 1))
  const x0 = (fx.flip ? first : last - item.w + 1) + slide
  scene.over(item, x0, SCENE_PX - item.h + 1, fx.flip)
}

// Packs pixel pairs into half-block cells, then lays text over them
function toCells(scene, texts) {
  const columns = scene.w
  const cells = new Uint32Array(columns * SCENE_ROWS * 3)
  for (let row = 0; row < SCENE_ROWS; row++) {
    for (let x = 0; x < columns; x++) {
      const top = scene.get(x, row * 2)
      const bottom = scene.get(x, row * 2 + 1)
      const i = (row * columns + x) * 3
      if (top < 0 && bottom < 0) {
        cells.set([32, DEFAULT_COLOR, DEFAULT_COLOR], i)
      } else if (top < 0) {
        cells.set([0x2584, bottom, DEFAULT_COLOR], i) // ▄
      } else if (bottom < 0) {
        cells.set([0x2580, top, DEFAULT_COLOR], i) // ▀
      } else {
        cells.set([0x2580, top, bottom], i)
      }
    }
  }
  for (const t of texts) {
    const row = Math.floor(t.y / 2)
    if (row < 0 || row >= SCENE_ROWS) continue
    for (let k = 0; k < t.text.length; k++) {
      const x = t.x + k
      if (x < 0 || x >= columns) continue
      cells.set([t.text.charCodeAt(k), t.color, DEFAULT_COLOR], (row * columns + x) * 3)
    }
  }
  return cells
}

// Base64 of the cells' bytes, in the platform's byte order, as Raster expects
export function packCells(cells) {
  const bytes = new Uint8Array(cells.buffer, cells.byteOffset, cells.byteLength)
  // In chunks, since each byte becomes an argument to fromCharCode
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
