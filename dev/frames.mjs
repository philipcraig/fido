// Frames for the preview sheet, taken from a scripted session run through
// the real behavior code in hooks/animal.js
import * as animal from '../hooks/animal.js'

export const COLUMNS = 64

// The labeled frames of the session for the named animal
export function framesFor(name) {
  const d = animal.createAnimal(() => 0.5)
  animal.setAnimal(d, name)
  let now = 0
  const frames = []

  // Advances the clock in small steps, as the redraw timer would, and keeps
  // the frame at the end
  function at(ms, label) {
    const end = now + ms
    let f
    while (now < end) {
      now = Math.min(end, now + 125)
      f = animal.frame(d, now, COLUMNS)
    }
    frames.push({ label, frame: f })
  }

  function nap(kind, ms) {
    d.reaction = null
    d.nap = { kind, at: now, until: now + 10_000 }
    at(ms, 'nap ' + kind)
  }

  at(1000, 'sleeping')
  nap('dream', 1500)
  nap('scratch', 800)
  nap('roll', 2000)
  nap('circle', 900)
  d.item = 'prey'
  nap('bubble', 900)
  d.nap = null
  d.nextNapAt = Infinity

  animal.noteTurnStart(d, now)
  at(500, 'wake: stretch')
  at(1500, 'thinking')
  animal.noteToolStart(d, 'r1', 'Grep')
  at(2000, 'sniffing (Grep)')
  animal.noteToolEnd(d, now, 'r1', 'ok')
  animal.noteToolStart(d, 'b1', 'Bash')
  at(1500, 'fetch (Bash)')
  animal.noteToolEnd(d, now, 'b1', 'error')
  at(200, 'oops (failed command)')
  at(2500, 'back home')
  animal.noteToolStart(d, 'e1', 'Edit')
  at(3000, 'digging (Edit)')
  animal.noteToolEnd(d, now, 'e1', 'ok')
  animal.noteToolStart(d, 'a1', 'Agent')
  animal.noteToolStart(d, 'a2', 'Agent')
  animal.noteToolStart(d, 'w1', 'WebFetch')
  at(600, 'pointing (WebFetch), two youngsters (subagents)')
  animal.noteToolEnd(d, now, 'w1', 'ok')
  animal.noteToolEnd(d, now, 'a1', 'ok')
  animal.noteToolEnd(d, now, 'a2', 'ok')
  animal.noteTurnEnd(d, now, false)
  at(300, 'turn done: happy')
  at(2300, 'settling down')
  animal.noteTreat(d, now, 'pet')
  at(500, '/fido pet')
  at(2700, 'settling back down')
  animal.noteTreat(d, now, 'feed')
  at(300, '/fido feed: first bite')
  at(1500, '/fido feed: half eaten')
  at(1500, '/fido feed: licking its lips')
  return frames
}
