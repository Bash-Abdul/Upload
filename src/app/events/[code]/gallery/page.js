'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function EventGallery() {
    const [event, setEvent] = useState(null)
    const [photos, setPhotos] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedPhoto, setSelectedPhoto] = useState(null)
    const [user, setUser] = useState(null)
    const params = useParams()
    const router = useRouter()
    const eventCode = params.code

    useEffect(() => {
        checkUser()
        fetchEvent()
        fetchPhotos()
    }, [eventCode])

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/auth/login')
            return
        }
        setUser(user)
    }

    const fetchEvent = async () => {
        try {
            const response = await fetch(`/api/events/${eventCode}`)
            if (response.ok) {
                const eventData = await response.json()
                setEvent(eventData.event)

                // Check if user owns this event
                if (user && eventData.event.ownerId !== user.id) {
                    setError('You do not have permission to view this event gallery')
                }
            } else {
                setError('Event not found')
            }
        } catch (error) {
            setError('Failed to fetch event')
        } finally {
            setLoading(false)
        }
    }

    const fetchPhotos = async () => {
        try {
            const response = await fetch(`/api/events/${eventCode}/photos`)
            if (response.ok) {
                const photosData = await response.json()
                setPhotos(photosData.photos)
            }
        } catch (error) {
            console.error('Error fetching photos:', error)
        }
    }

    const openPhotoModal = (photo) => {
        setSelectedPhoto(photo)
    }

    const closePhotoModal = () => {
        setSelectedPhoto(null)
    }

    const getPhotoUrl = (photo) => {
        if (photo.storagePath) {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            return `${supabaseUrl}/storage/v1/object/public/photos/${photo.storagePath}`
        }
        return ''
    }

    const downloadPhoto = (photo) => {
        const link = document.createElement('a')
        link.href = getPhotoUrl(photo)
        link.download = photo.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
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
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.back()}
                                className="text-gray-600 hover:text-gray-900"
                            >
                                ← Back
                            </button>
                            <h1 className="text-xl font-semibold text-gray-900">Event Gallery</h1>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => router.push(`/events/${eventCode}/qr`)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                            >
                                QR Code & Sharing
                            </button>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm"
                            >
                                Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Event Info */}
                <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h2>
                        {event.description && (
                            <p className="text-xl text-gray-600 mb-4">{event.description}</p>
                        )}
                        {event.date && (
                            <p className="text-gray-500 text-lg">
                                {new Date(event.date).toLocaleDateString()}
                            </p>
                        )}
                        {event.location && (
                            <p className="text-gray-500 text-lg">{event.location}</p>
                        )}
                    </div>
                </div>

                {/* Gallery Stats */}
                <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Photo Gallery</h3>
                            <p className="text-gray-600">{photos.length} photo{photos.length !== 1 ? 's' : ''} uploaded</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Event Code</p>
                            <p className="text-lg font-mono font-semibold text-gray-900">{event.code}</p>
                        </div>
                    </div>
                </div>

                {/* Photo Gallery */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    {photos.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
                            <p className="text-gray-600">Share the QR code with your guests to start collecting photos!</p>
                            <button
                                onClick={() => router.push(`/events/${eventCode}/qr`)}
                                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
                            >
                                Get QR Code & Share
                            </button>
                        </div>
                    ) : (
                        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                            {photos.map((photo) => (
                                <div
                                    key={photo.id}
                                    className="break-inside-avoid group cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                                    onClick={() => openPhotoModal(photo)}
                                >
                                    <div className="relative overflow-hidden rounded-xl shadow-lg bg-white">
                                        <img
                                            src={getPhotoUrl(photo)}
                                            alt={photo.filename}
                                            className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                                            onError={(e) => {
                                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQgMTZMMTAgMTBMMTQgMTRMMTggMTBMMjAgMTJWMjBINEM0IDE4Ljg5NTQgMy4xMDU0NyAxOCAyIDE4VjZDMiA0Ljg5NTQzIDIuODk1NDMgNCA0IDRIMjBWMTRMMTggMTJMMTQgMTZMMTAgMTJMNCAxOFYxNloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'
                                            }}
                                        />

                                        {/* Hover overlay with photo info */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                                            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-sm truncate">{photo.filename}</p>
                                                        {photo.guestName && (
                                                            <p className="text-xs text-gray-200">By {photo.guestName}</p>
                                                        )}
                                                        <p className="text-xs text-gray-300">{new Date(photo.uploadedAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Click hint */}
                                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            Click to view
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Photo Modal */}
            {selectedPhoto && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="relative max-w-4xl max-h-full">
                        <button
                            onClick={closePhotoModal}
                            className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl font-bold z-10"
                        >
                            ×
                        </button>
                        <img
                            src={getPhotoUrl(selectedPhoto)}
                            alt={selectedPhoto.filename}
                            className="max-w-full max-h-full object-contain rounded-lg"
                        />
                        <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{selectedPhoto.filename}</p>
                                    {selectedPhoto.guestName && (
                                        <p className="text-sm">By {selectedPhoto.guestName}</p>
                                    )}
                                    <p className="text-sm">{new Date(selectedPhoto.uploadedAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => downloadPhoto(selectedPhoto)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                                    >
                                        Download
                                    </button>
                                    <button
                                        onClick={() => window.open(getPhotoUrl(selectedPhoto), '_blank')}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                                    >
                                        Open Full Size
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
} 