import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('db throws without DATABASE_URL', () => {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', '-e', "import('./src/lib/db.ts')"],
    {
      env: { ...process.env, DATABASE_URL: '' },
    },
  )
  assert.notEqual(result.status, 0)
  assert.match(result.stderr.toString(), /DATABASE_URL is required/)
})

test('disconnects prisma on beforeExit', () => {
  const code = `
    (async () => {
      process.env.DATABASE_URL='postgresql://user:pass@localhost:5432/test'
      const mod = await import('./src/lib/db.ts')
      const prisma = mod.prisma || mod.default?.prisma
      prisma.$disconnect = () => { console.log('disconnected'); return Promise.resolve() }
      process.emit('beforeExit', 0)
    })()
  `
  const result = spawnSync(process.execPath, ['--import', 'tsx', '-e', code])
  assert.equal(result.status, 0)
  assert.match(result.stdout.toString(), /disconnected/)
})

test('registers signal handlers only once', () => {
  const code = `
    process.env.DATABASE_URL='postgresql://user:pass@localhost:5432/test';
    const before = process.listenerCount('SIGINT');
    await import('./src/lib/db.ts');
    const first = process.listenerCount('SIGINT');
    await import('./src/lib/db.ts');
    const second = process.listenerCount('SIGINT');
    console.log(before, first, second);
  `
  const result = spawnSync(process.execPath, ['--import', 'tsx', '-e', code])
  assert.equal(result.status, 0)
  const [before, first, second] = result.stdout
    .toString()
    .trim()
    .split(/\s+/)
    .map(Number)
  assert.equal(first, before + 1)
  assert.equal(second, first)
})
