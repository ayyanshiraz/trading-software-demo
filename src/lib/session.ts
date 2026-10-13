import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const key = new TextEncoder().encode('YOUR_VERY_SECRET_KEY_CHANGE_THIS')

export async function encrypt(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key)
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, key, {
      algorithms: ['HS256'],
    })
    return payload
  } catch (error) {
    return null
  }
}

export async function createSession(userId: string) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const session = await encrypt({ userId, expires })
  const cookieStore = await cookies()

  cookieStore.set('session', session, {
    httpOnly: true,
    // CRITICAL FIX: Only use secure cookies in production. 
    // If this is true on localhost (http), the browser rejects the cookie.
    secure: process.env.NODE_ENV === 'production', 
    expires,
    sameSite: 'lax',
    path: '/',
  })
}

export async function deleteSession() {
  (await cookies()).delete('session')
}

export async function getSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  const payload = await decrypt(session)
  return payload
}

export async function verifySession() {
  const session = await getSession()
  if (!session?.userId) {
    redirect('/login')
  }
  return { userId: session.userId as string }
}