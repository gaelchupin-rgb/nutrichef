import { test } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { getPrisma } from '../db'
const prisma = getPrisma()
import { Prisma } from '@prisma/client'

const requestBody = {
  email: 'a@a.com',
  username: 'user',
  password: 'Secret1!'
}

test('handles unique constraint conflicts', async () => {
  const { POST } = await import('../../app/api/auth/register/route')
  ;(prisma.user as any).findFirst = () => { throw new Error('should not be called') }
  ;(prisma as any).$transaction = async () => {
    throw new Prisma.PrismaClientKnownRequestError('', {
      code: 'P2002',
      clientVersion: '5.7.1'
    })
  }
  ;(bcrypt as any).hash = async () => 'hashed'

  const req = new Request('http://test', {
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: { 'content-type': 'application/json' }
  })
  const res = await POST(req as any)
  assert.equal(res.status, 400)
  const data = await res.json()
  assert.ok('error' in data)
})

test('normalizes email and username casing before persistence', async () => {
  const { POST } = await import('../../app/api/auth/register/route')
  let createArgs: any
  ;(prisma.user as any).findFirst = () => { throw new Error('should not be called') }
  ;(prisma as any).$transaction = async (cb: any) => {
    return cb({
      user: {
        create: async (args: any) => {
          createArgs = args
          return { id: 1 }
        }
      },
      profile: { create: async () => {} }
    })
  }
  ;(bcrypt as any).hash = async () => 'hashed'

  const req = new Request('http://test', {
    method: 'POST',
    body: JSON.stringify({ email: ' TeSt@Example.COM ', username: ' UsEr ', password: 'Secret1!' }),
    headers: { 'content-type': 'application/json' }
  })
  await POST(req as any)
  assert.equal(createArgs.data.email, 'test@example.com')
  assert.equal(createArgs.data.username, 'user')
})

test('authorize returns null if password hash comparison fails', async () => {
  const { authOptions } = await import('../auth')
  ;(prisma.user as any).findUnique = async () => ({ id: '1', email: 'a@a.com', username: 'user', password: 'bad' })
  ;(bcrypt as any).compare = async () => { throw new Error('fail') }
  const provider: any = authOptions.providers[0]
  const result = await provider.authorize({ email: 'a@a.com', password: 'pw' })
  assert.equal(result, null)
})

test('authorize normalizes email casing', async () => {
  ;(globalThis as any).prisma = {
    user: {
      findUnique: async () => ({
        id: '1',
        email: 'a@a.com',
        username: 'user',
        password: 'hash',
      })
    }
  }
  ;(bcrypt as any).compare = async () => true
  const { authorize } = await import(`../auth?t=${Date.now()}`)
  const result = await authorize({ email: ' A@A.COM ', password: 'pw' })
  assert.deepEqual(result, { id: '1', email: 'a@a.com', name: 'user' })
})

test('returns 400 on invalid JSON body', async () => {
  const { POST } = await import('../../app/api/auth/register/route')
  const req = new Request('http://test', {
    method: 'POST',
    body: '{invalid',
    headers: { 'content-type': 'application/json' }
  })
  const res = await POST(req as any)
  assert.equal(res.status, 400)
  const data = await res.json()
  assert.ok('error' in data)
})

test('returns 415 on invalid Content-Type', async () => {
  const { POST } = await import('../../app/api/auth/register/route')
  const req = new Request('http://test', {
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: { 'content-type': 'text/plain' }
  })
  const res = await POST(req as any)
  assert.equal(res.status, 415)
  const data = await res.json()
  assert.ok('error' in data)
})

test('returns 400 on weak password', async () => {
  const { POST } = await import('../../app/api/auth/register/route')
  const weak = { ...requestBody, password: 'weakpass' }
  const req = new Request('http://test', {
    method: 'POST',
    body: JSON.stringify(weak),
    headers: { 'content-type': 'application/json' }
  })
  const res = await POST(req as any)
  assert.equal(res.status, 400)
  const data = await res.json()
  assert.ok('error' in data)
})
