import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request) {
    try {
        const { email, name, userId } = await request.json()

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
        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        )
    }
} 