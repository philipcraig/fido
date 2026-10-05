// Runs Prettier or tsc at the version .github/ci/package-lock.json pins, the
// one CI runs, so a check that passes here passes there. Dependabot moves the
// lockfile, and this follows it. Usage: node dev/tool.mjs <prettier|tsc> [args...]
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Each tool, and the package it comes from
const PACKAGES = { prettier: 'prettier', tsc: 'typescript' }

const [tool, ...args] = process.argv.slice(2)
const pkg = PACKAGES[tool]
if (pkg === undefined) {
  console.error(`Usage: node dev/tool.mjs <${Object.keys(PACKAGES).join('|')}> [args...]`)
  process.exit(2)
}
const lock = JSON.parse(readFileSync(new URL('../.github/ci/package-lock.json', import.meta.url), 'utf8'))
const version = lock.packages[`node_modules/${pkg}`]?.version
if (version === undefined) {
  console.error(`.github/ci/package-lock.json doesn't pin ${pkg}`)
  process.exit(2)
}
const run = spawnSync('npx', ['--yes', '-p', `${pkg}@${version}`, tool, ...args], {
  stdio: 'inherit',
  // npx is a .cmd script on Windows, which only a shell can run
  shell: process.platform === 'win32',
})
process.exit(run.status ?? 1)
