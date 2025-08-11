import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request, { params }) {
    try {
        const { code } = params

        if (!code) {
            return NextResponse.json(
                { error: 'Event code is required' },
                { status: 400 }
            )
        }

        const event = await prisma.event.findUnique({
            where: {
                code: code,
            },
            include: {
                owner: {
                    select: {
                        name: true,
                    },
                },
            },
        })

        if (!event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({ event })
    } catch (error) {
        console.error('Error fetching event:', error)
        return NextResponse.json(
            { error: 'Failed to fetch event' },
            { status: 500 }
        )
    }
} 