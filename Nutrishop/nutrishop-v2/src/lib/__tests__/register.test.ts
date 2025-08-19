import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '../db'

const requestBody = {
  email: 'a@a.com',
  username: 'user',
  password: 'secret1'
}

test('handles unique constraint conflicts', async () => {
  const { POST } = await import('../../app/api/auth/register/route')
  ;(prisma.user as any).findFirst = async () => null
  ;(prisma as any).$transaction = async () => { const e: any = new Error(''); e.code = 'P2002'; throw e }
  ;(bcrypt as any).hash = async () => 'hashed'

  const req = new NextRequest('http://test', {
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: { 'content-type': 'application/json' }
  })
  const res = await POST(req)
  assert.equal(res.status, 400)
})

test('authorize returns null if password hash comparison fails', async () => {
  const { authOptions } = await import('../auth')
  ;(prisma.user as any).findUnique = async () => ({ id: '1', email: 'a@a.com', username: 'user', password: 'bad' })
  ;(bcrypt as any).compare = async () => { throw new Error('fail') }
  const provider: any = authOptions.providers[0]
  const result = await provider.authorize({ email: 'a@a.com', password: 'pw' })
  assert.equal(result, null)
})

test('returns 400 on invalid JSON body', async () => {
  const { POST } = await import('../../app/api/auth/register/route')
  const req = new NextRequest('http://test', {
    method: 'POST',
    body: '{invalid',
    headers: { 'content-type': 'application/json' }
  })
  const res = await POST(req)
  assert.equal(res.status, 400)
})

test('returns 415 on invalid Content-Type', async () => {
  const { POST } = await import('../../app/api/auth/register/route')
  const req = new NextRequest('http://test', {
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: { 'content-type': 'text/plain' }
  })
  const res = await POST(req)
  assert.equal(res.status, 415)
})
