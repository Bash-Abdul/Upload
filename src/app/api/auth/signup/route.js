import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request) {
    try {
        const { email, name, userId } = await request.json()
        if (!email || !name || !userId) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
          }

        // Create user in our database
        const user = await prisma.user.create({
            data: {
                id: userId,
                email,
                name,
            },
        })

        return NextResponse.json({ user }, { status: 201 })
    } catch (error) {
        console.error('Signup error:', error)
         // Handle unique email or id conflicts gracefully
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'User already exists' }, { status: 409 })
      }
        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        )
    }
} 