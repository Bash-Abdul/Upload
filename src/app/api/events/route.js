import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            )
        }

        const events = await prisma.event.findMany({
            where: {
                ownerId: userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        return NextResponse.json({ events })
    } catch (error) {
        console.error('Error fetching events:', error)
        return NextResponse.json(
            { error: 'Failed to fetch events' },
            { status: 500 }
        )
    }
}

export async function POST(request) {
    try {
        const { title, description, date, location, code, ownerId } = await request.json()

        if (!title || !code || !ownerId) {
            return NextResponse.json(
                { error: 'Title, code, and ownerId are required' },
                { status: 400 }
            )
        }

        const event = await prisma.event.create({
            data: {
                title,
                description,
                date: date ? new Date(date) : null,
                location,
                code,
                ownerId,
            },
        })

        return NextResponse.json({ event }, { status: 201 })
    } catch (error) {
        console.error('Error creating event:', error)
        return NextResponse.json(
            { error: 'Failed to create event' },
            { status: 500 }
        )
    }
} 