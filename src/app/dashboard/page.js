'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
    const [user, setUser] = useState(null)
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        checkUser()
        fetchEvents()
    }, [])

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/auth/login')
        } else {
            setUser(user)
        }
    }

    const fetchEvents = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const response = await fetch(`/api/events?userId=${user.id}`)
            if (response.ok) {
                const eventsData = await response.json()
                setEvents(eventsData.events)
            }
        } catch (error) {
            console.error('Error fetching events:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

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

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-xl font-semibold text-gray-900">Event Dashboard</h1>
                        <div className="flex items-center space-x-4">
                            <span className="text-gray-700">Welcome, {user?.user_metadata?.name}</span>
                            <button
                                onClick={handleSignOut}
                                className="text-gray-600 hover:text-gray-900"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Your Events</h2>
                        <Link
                            href="/events/create"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                        >
                            Create New Event
                        </Link>
                    </div>

                    {events.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 0a4 4 0 00-4 4v6a4 4 0 004 4h8a4 4 0 004-4v-6a4 4 0 00-4-4m-4 0h8" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
                            <p className="text-gray-600 mb-6">Create your first event to start collecting photos</p>
                            <Link
                                href="/events/create"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-sm font-medium"
                            >
                                Create Event
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {events.map((event) => (
                                <div key={event.id} className="bg-white rounded-lg shadow-sm border p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>
                                    {event.description && (
                                        <p className="text-gray-600 mb-4">{event.description}</p>
                                    )}
                                    {event.date && (
                                        <p className="text-sm text-gray-500 mb-4">
                                            {new Date(event.date).toLocaleDateString()}
                                        </p>
                                    )}
                                    <div className="flex space-x-2">
                                        <Link
                                            href={`/events/${event.code}/gallery`}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                                        >
                                            View Gallery
                                        </Link>
                                        <Link
                                            href={`/events/${event.code}/qr`}
                                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                                        >
                                            QR Code
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
} 