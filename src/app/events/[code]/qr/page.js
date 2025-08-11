'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import QRCode from 'react-qr-code'
import { supabase } from '@/lib/supabase'

export default function EventQR() {
    const [event, setEvent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const params = useParams()
    const router = useRouter()
    const eventCode = params.code

    useEffect(() => {
        checkUser()
        fetchEvent()
    }, [eventCode])

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/auth/login')
        }
    }

    const fetchEvent = async () => {
        try {
            const response = await fetch(`/api/events/${eventCode}`)
            if (response.ok) {
                const eventData = await response.json()
                setEvent(eventData.event)
            } else {
                setError('Event not found')
            }
        } catch (error) {
            setError('Failed to fetch event')
        } finally {
            setLoading(false)
        }
    }

    const uploadUrl = `${window.location.origin}/upload/${eventCode}`

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => router.back()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-xl font-semibold text-gray-900">Event QR Code</h1>
                        <button
                            onClick={() => router.back()}
                            className="text-gray-600 hover:text-gray-900"
                        >
                            ← Back
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow-sm border p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h2>
                        {event.description && (
                            <p className="text-gray-600 text-lg">{event.description}</p>
                        )}
                        {event.date && (
                            <p className="text-gray-500 mt-2">
                                {new Date(event.date).toLocaleDateString()}
                            </p>
                        )}
                        {event.location && (
                            <p className="text-gray-500">{event.location}</p>
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row items-center justify-center gap-12">
                        <div className="text-center">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">QR Code for Guests</h3>
                            <div className="bg-white p-4 rounded-lg shadow-md inline-block">
                                <QRCode
                                    value={uploadUrl}
                                    size={256}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>
                            <p className="text-sm text-gray-500 mt-4">
                                Guests can scan this to upload photos
                            </p>
                        </div>

                        <div className="text-center lg:text-left">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">Share with Guests</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Direct Link
                                    </label>
                                    <div className="flex">
                                        <input
                                            type="text"
                                            value={uploadUrl}
                                            readOnly
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-gray-500"
                                        />
                                        <button
                                            onClick={() => navigator.clipboard.writeText(uploadUrl)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Event Code
                                    </label>
                                    <div className="flex">
                                        <input
                                            type="text"
                                            value={event.code}
                                            readOnly
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-gray-500 text-center font-mono text-lg"
                                        />
                                        <button
                                            onClick={() => navigator.clipboard.writeText(event.code)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                                <ol className="text-sm text-blue-800 space-y-1">
                                    <li>1. Share the QR code or link with your guests</li>
                                    <li>2. Guests scan/click to access the upload page</li>
                                    <li>3. Photos appear instantly in your event gallery</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => router.push(`/events/${event.code}`)}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium"
                        >
                            View Event Gallery
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
} 