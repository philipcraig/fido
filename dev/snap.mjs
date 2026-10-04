// Renders a terminal screen captured with colors (tmux capture-pane -p -e) to
// a PNG, through Playwright's Chromium. Usage, with the screen on stdin:
// node dev/snap.mjs out.png [rows], rows keeping only the last rows of the screen
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const [out, rows] = process.argv.slice(2)
if (!out) {
  console.error('Usage: tmux capture-pane -p -e | node dev/snap.mjs out.png [rows]')
  process.exit(1)
}

// Playwright from a local install, or else from the global one
async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    const root = execSync('npm root -g').toString().trim()
    return createRequire(join(root, 'noop.js'))('playwright')
  }
}

const BASE = [
  '#000000',
  '#cd3131',
  '#0dbc79',
  '#e5e510',
  '#2472c8',
  '#bc3fbc',
  '#11a8cd',
  '#e5e5e5',
  '#666666',
  '#f14c4c',
  '#23d18b',
  '#f5f543',
  '#3b8eea',
  '#d670d6',
  '#29b8db',
  '#ffffff',
]

function color256(n) {
  if (n < 16) return BASE[n]
  if (n >= 232) {
    const v = 8 + (n - 232) * 10
    return `rgb(${v},${v},${v})`
  }
  const steps = [0, 95, 135, 175, 215, 255]
  n -= 16
  return `rgb(${steps[Math.floor(n / 36)]},${steps[Math.floor(n / 6) % 6]},${steps[n % 6]})`
}

// Applies one SGR sequence's parameters to the style
function applySgr(style, params) {
  for (let i = 0; i < params.length; i++) {
    const p = params[i]
    if (p === 0) for (const k of Object.keys(style)) delete style[k]
    else if (p === 1) style.bold = true
    else if (p === 2) style.dim = true
    else if (p === 22) style.bold = style.dim = false
    else if (p === 38 || p === 48) {
      const key = p === 38 ? 'fg' : 'bg'
      if (params[i + 1] === 2) {
        style[key] = `rgb(${params[i + 2]},${params[i + 3]},${params[i + 4]})`
        i += 4
      } else {
        style[key] = color256(params[i + 2])
        i += 2
      }
    } else if (p === 39) delete style.fg
    else if (p === 49) delete style.bg
    else if (p >= 30 && p <= 37) style.fg = BASE[p - 30]
    else if (p >= 90 && p <= 97) style.fg = BASE[p - 82]
    else if (p >= 40 && p <= 47) style.bg = BASE[p - 40]
    else if (p >= 100 && p <= 107) style.bg = BASE[p - 92]
  }
}

function css(style) {
  return [
    style.fg && `color:${style.fg}`,
    style.bg && `background:${style.bg}`,
    style.bold && 'font-weight:bold',
    style.dim && 'opacity:.6',
  ]
    .filter(Boolean)
    .join(';')
}

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

function lineToHtml(line) {
  const style = {}
  let html = ''
  for (const [, sgr, text] of line.matchAll(/\x1b\[([0-9;]*)m|([^\x1b]+)/g)) {
    if (text) html += `<span style="${css(style)}">${escapeHtml(text)}</span>`
    else applySgr(style, (sgr || '0').split(';').map(Number))
  }
  return html || ' '
}

let lines = readFileSync(0, 'utf8').replace(/\n+$/, '').split('\n')
if (rows) lines = lines.slice(-Number(rows))
const body = lines.map((l) => `<div>${lineToHtml(l)}</div>`).join('')
const page =
  '<body style="margin:0;background:#1e1e1e;color:#cccccc">' +
  `<pre style="margin:12px;font:16px/1.16 'DejaVu Sans Mono',monospace">${body}</pre></body>`

const { chromium } = await loadPlaywright()
const browser = await chromium.launch()
const tab = await browser.newPage({ viewport: { width: 1000, height: 100 } })
await tab.setContent(page)
await tab.screenshot({ path: out, fullPage: true })
await browser.close()
