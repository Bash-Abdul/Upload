'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function UploadPhotos() {
    const [event, setEvent] = useState(null)
    const [guestName, setGuestName] = useState('')
    const [selectedFiles, setSelectedFiles] = useState([])
    const [uploading, setUploading] = useState(false)
    const [uploadedPhotos, setUploadedPhotos] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const params = useParams()
    const eventCode = params.code

    useEffect(() => {
        fetchEvent()
        fetchPhotos()
    }, [eventCode])

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

    const fetchPhotos = async () => {
        try {
            const response = await fetch(`/api/events/${eventCode}/photos`)
            if (response.ok) {
                const photosData = await response.json()
                setUploadedPhotos(photosData.photos)
            }
        } catch (error) {
            console.error('Error fetching photos:', error)
        }
    }

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files)
        setSelectedFiles(files)
    }

    const uploadPhotos = async () => {
        if (selectedFiles.length === 0) return

        setUploading(true)
        setError('')
        setSuccess('')

        try {
            const uploadPromises = selectedFiles.map(async (file) => {
                // Upload to Supabase Storage
                const fileName = `${Date.now()}-${file.name}`
                const filePath = `events/${eventCode}/${fileName}`

                const { data, error: uploadError } = await supabase.storage
                    .from('photos')
                    .upload(filePath, file)

                if (uploadError) throw uploadError

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('photos')
                    .getPublicUrl(filePath)

                // Save photo record to database
                const response = await fetch(`/api/events/${eventCode}/photos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        filename: file.name,
                        storagePath: filePath,
                        mime: file.type,
                        bytes: file.size,
                        guestName: guestName || null,
                    }),
                })

                if (!response.ok) {
                    throw new Error('Failed to save photo record')
                }

                return { filename: file.name, url: publicUrl }
            })

            await Promise.all(uploadPromises)

            setSuccess(`Successfully uploaded ${selectedFiles.length} photo(s)!`)
            setSelectedFiles([])
            setGuestName('')

            // Refresh photos
            fetchPhotos()
        } catch (error) {
            setError(error.message)
        } finally {
            setUploading(false)
        }
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

    if (error && !event) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Event Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">{event.title}</h1>
                    {event.description && (
                        <p className="text-xl text-gray-600 mb-4">{event.description}</p>
                    )}
                    {event.date && (
                        <p className="text-gray-500">
                            {new Date(event.date).toLocaleDateString()}
                        </p>
                    )}
                    {event.location && (
                        <p className="text-gray-500">{event.location}</p>
                    )}
                </div>

                {/* Upload Section */}
                <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Photos</h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                            {success}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-2">
                                Your Name (Optional)
                            </label>
                            <input
                                type="text"
                                id="guestName"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter your name if you'd like to be credited"
                            />
                        </div>

                        <div>
                            <label htmlFor="photos" className="block text-sm font-medium text-gray-700 mb-2">
                                Select Photos
                            </label>
                            <input
                                type="file"
                                id="photos"
                                multiple
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                You can select multiple photos at once
                            </p>
                        </div>

                        {selectedFiles.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                    Selected Files ({selectedFiles.length}):
                                </p>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    {selectedFiles.map((file, index) => (
                                        <li key={index}>{file.name}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <button
                            onClick={uploadPhotos}
                            disabled={uploading || selectedFiles.length === 0}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Photo(s)`}
                        </button>
                    </div>
                </div>

                {/* Photo Gallery */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Event Photos</h2>

                    {uploadedPhotos.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
                            <p className="text-gray-600">Be the first to upload photos to this event!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {uploadedPhotos.map((photo) => (
                                <div key={photo.id} className="relative group">
                                    <img
                                        src={photo.storagePath ? `https://lkcdvhapypmzloeisovc.supabase.co/storage/v1/object/public/photos/${photo.storagePath}` : ''}
                                        alt={photo.filename}
                                        className="w-full h-32 object-cover rounded-lg"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-end">
                                        <div className="p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            {photo.guestName && (
                                                <p className="text-xs">By {photo.guestName}</p>
                                            )}
                                            <p className="text-xs">{new Date(photo.uploadedAt).toLocaleDateString()}</p>
                                        </div>
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