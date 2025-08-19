import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
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

  const req = new NextRequest('http://test', {
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: { 'content-type': 'application/json' }
  })
  const res = await POST(req)
  assert.equal(res.status, 400)
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

  const req = new NextRequest('http://test', {
    method: 'POST',
    body: JSON.stringify({ email: ' TeSt@Example.COM ', username: ' UsEr ', password: 'Secret1!' }),
    headers: { 'content-type': 'application/json' }
  })
  await POST(req)
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

test('returns 400 on weak password', async () => {
  const { POST } = await import('../../app/api/auth/register/route')
  const weak = { ...requestBody, password: 'weakpass' }
  const req = new NextRequest('http://test', {
    method: 'POST',
    body: JSON.stringify(weak),
    headers: { 'content-type': 'application/json' }
  })
  const res = await POST(req)
  assert.equal(res.status, 400)
})
