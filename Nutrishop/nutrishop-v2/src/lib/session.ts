import { getServerSession } from 'next-auth'
import { NextAuthOptions } from 'next-auth'

export type SessionGetter = (authOptions: NextAuthOptions) => Promise<any>

let getter: SessionGetter = getServerSession

export function setSessionGetter(fn: SessionGetter) {
  getter = fn
}

export function getSession(authOptions: NextAuthOptions) {
  return getter(authOptions)
}
