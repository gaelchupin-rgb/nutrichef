import { DefaultUser } from 'next-auth'

export interface SessionUser {
  id: string
  email: string
  name: string
}

declare module 'next-auth' {
  interface User extends DefaultUser {
    id: string
  }
  interface Session {
    user: SessionUser
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
  }
}
