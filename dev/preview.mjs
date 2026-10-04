// Renders frames of the animal to a PNG contact sheet, so the art can be checked
// without a terminal. Usage: node dev/preview.mjs out.png [camel|cat|dog]
import { writeFileSync } from 'node:fs'
import { deflateSync, crc32 } from 'node:zlib'
import { drawScene, isAnimal, DEFAULT_ANIMAL, SCENE_ROWS, DEFAULT_COLOR } from '../hooks/scene.js'
import { framesFor, COLUMNS } from './frames.mjs'

const name = (process.argv[3] ?? DEFAULT_ANIMAL).toLowerCase()
if (!isAnimal(name)) {
  console.error(`Unknown animal "${process.argv[3]}"`)
  process.exit(1)
}
const FRAMES = framesFor(name)

const SCALE = 8
const BG = 0x1e1e1e
const GAP = 2

function cellsToPixels(cells) {
  const px = []
  const color = (c) => (c === DEFAULT_COLOR ? BG : c)
  for (let row = 0; row < SCENE_ROWS; row++) {
    const top = []
    const bottom = []
    for (let x = 0; x < COLUMNS; x++) {
      const i = (row * COLUMNS + x) * 3
      const [ch, fg, bg] = [cells[i], cells[i + 1], cells[i + 2]]
      if (ch === 0x2580) top.push(color(fg)), bottom.push(color(bg))
      else if (ch === 0x2584) top.push(color(bg)), bottom.push(color(fg))
      else if (ch === 32) top.push(BG), bottom.push(BG)
      // A text cell: show its color in the top half only, to mark the glyph
      else top.push(color(fg)), bottom.push(BG)
    }
    px.push(top, bottom)
  }
  return px
}

const sheets = FRAMES.map(({ frame }) => cellsToPixels(drawScene(frame, COLUMNS)))
const perRow = 2
const tileW = COLUMNS + GAP
const tileH = SCENE_ROWS * 2 + GAP
const W = tileW * perRow * SCALE
const H = tileH * Math.ceil(sheets.length / perRow) * SCALE
const img = Buffer.alloc((W * 3 + 1) * H)
for (let y = 0; y < H; y++) {
  img[y * (W * 3 + 1)] = 0
  for (let x = 0; x < W; x++) {
    const tx = Math.floor(x / SCALE / tileW)
    const ty = Math.floor(y / SCALE / tileH)
    const px = Math.floor(x / SCALE) % tileW
    const py = Math.floor(y / SCALE) % tileH
    const sheet = sheets[ty * perRow + tx]
    let c = 0x101010
    if (sheet && px < COLUMNS && py < SCENE_ROWS * 2) c = sheet[py][px]
    const o = y * (W * 3 + 1) + 1 + x * 3
    img[o] = (c >> 16) & 255
    img[o + 1] = (c >> 8) & 255
    img[o + 2] = c & 255
  }
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td) >>> 0)
  return Buffer.concat([len, td, crc])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0)
ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8
ihdr[9] = 2
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(img)),
  chunk('IEND', Buffer.alloc(0)),
])
writeFileSync(process.argv[2] ?? 'preview.png', png)
console.log(FRAMES.map((f, i) => i + ': ' + f.label).join('\n'))
