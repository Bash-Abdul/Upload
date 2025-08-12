import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request, { params }) {
    try {
        const { code } = params

        if (!code) {
            return NextResponse.json(
                { error: 'Event code is required' },
                { status: 400 }
            )
        }

        // Verify event exists
        const event = await prisma.event.findUnique({
            where: { code: code }
        })

        if (!event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            )
        }

        // Fetch photos for this event
        const photos = await prisma.photo.findMany({
            where: { eventId: event.id },
            orderBy: { uploadedAt: 'desc' }
        })

        return NextResponse.json({ photos })
    } catch (error) {
        console.error('Error fetching photos:', error)
        return NextResponse.json(
            { error: 'Failed to fetch photos' },
            { status: 500 }
        )
    }
}

export async function POST(request, { params }) {
    try {
        const { code } = params

        // Get form data (files + other fields)
        const formData = await request.formData()
        const files = formData.getAll('files')
        const guestName = formData.get('guestName') || null

        if (!code) {
            return NextResponse.json(
                { error: 'Event code is required' },
                { status: 400 }
            )
        }

        if (!files || files.length === 0) {
            return NextResponse.json(
                { error: 'No files provided' },
                { status: 400 }
            )
        }

        // Verify event exists
        const event = await prisma.event.findUnique({
            where: { code: code }
        })

        if (!event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            )
        }

        const uploadedPhotos = []

        // Process each file
        for (const file of files) {
            if (!(file instanceof File)) {
                continue
            }

            // Upload to Supabase Storage using admin client
            const fileName = `${Date.now()}-${file.name}`
            const filePath = `events/${code}/${fileName}`

            const { data, error: uploadError } = await supabaseAdmin.storage
                .from('photos')
                .upload(filePath, file)

            if (uploadError) {
                console.error('Upload error:', uploadError)
                continue
            }

            // Get public URL
            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('photos')
                .getPublicUrl(filePath)

            // Save photo record to database using admin client (bypasses RLS)
            const photo = await prisma.photo.create({
                data: {
                    filename: file.name,
                    storagePath: filePath,
                    mime: file.type,
                    bytes: file.size,
                    guestName,
                    eventId: event.id
                }
            })

            uploadedPhotos.push({
                id: photo.id,
                filename: file.name,
                url: publicUrl,
                storagePath: filePath
            })
        }

        if (uploadedPhotos.length === 0) {
            return NextResponse.json(
                { error: 'Failed to upload any files' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            message: `Successfully uploaded ${uploadedPhotos.length} photo(s)`,
            photos: uploadedPhotos
        })
    } catch (error) {
        console.error('Error uploading photos:', error)
        return NextResponse.json(
            { error: 'Failed to upload photos' },
            { status: 500 }
        )
    }
} 