import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('db throws without DATABASE_URL', () => {
  const result = spawnSync(process.execPath, ['-r', 'tsx', '-e', "import('./src/lib/db.ts')"], {
    env: { ...process.env, DATABASE_URL: '' }
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr.toString(), /DATABASE_URL is required/)
})

test('disconnects prisma on beforeExit', () => {
  const code = `
    (async () => {
      process.env.DATABASE_URL='postgresql://user:pass@localhost:5432/test'
      const { prisma } = await import('./src/lib/db.ts')
      prisma.$disconnect = () => { console.log('disconnected'); return Promise.resolve() }
      process.emit('beforeExit', 0)
    })()
  `
  const result = spawnSync(process.execPath, ['-r', 'tsx', '-e', code])
  assert.equal(result.status, 0)
  assert.match(result.stdout.toString(), /disconnected/)
})
