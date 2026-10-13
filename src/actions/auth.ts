'use server'

import { PrismaClient } from '@prisma/client'
import { createSession, deleteSession } from '@/lib/session'
import { redirect } from 'next/navigation'

const prisma = new PrismaClient()

// Define the allowed admins and their specific IDs
const ALLOWED_USERS = [
    { id: 'user_admin_1', name: 'ADMIN', username: 'admin', email: 'admin@fahadtraders.com', password: '12345678' },
    { id: 'user_admin_2', name: 'ADMIN 2', username: 'admin2', email: 'admin2@fahadtraders.com', password: 'qwertyui' },
    { id: 'user_admin_3', name: 'ADMIN 3', username: 'admin3', email: 'admin3@fahadtraders.com', password: 'asdfghjk' }
]

export async function login(formData: FormData) {
    const username = formData.get('username') as string
    const password = formData.get('password') as string

    // 1. Check if the input matches one of our allowed admins
    const targetUser = ALLOWED_USERS.find(u => u.username === username)

    if (!targetUser) {
        // User is not in our allowed list
        return redirect('/login?error=InvalidUser')
    }

    // 2. FORCE SYNC: Ensure this user exists in the DB with the correct password
    // This fixes the issue where old data prevented new users from being created
    const user = await prisma.user.upsert({
        where: { id: targetUser.id }, // Look up by fixed ID
        update: { 
            password: targetUser.password, 
            email: targetUser.email,
            name: targetUser.name
        },
        create: {
            id: targetUser.id,
            email: targetUser.email,
            password: targetUser.password,
            name: targetUser.name
        }
    })

    // 3. Verify Password (Double check, though upsert handled it)
    if (password !== user.password) {
        return redirect('/login?error=WrongPassword')
    }

    // 4. Create Session
    await createSession(user.id)
    
    // 5. Success
    redirect('/')
}

export async function logout() {
    await deleteSession()
    redirect('/login')
}