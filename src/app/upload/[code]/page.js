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
    const [selectedPhoto, setSelectedPhoto] = useState(null)
    const [uploadProgress, setUploadProgress] = useState({})
    const [totalUploads, setTotalUploads] = useState(0)
    const [completedUploads, setCompletedUploads] = useState(0)
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

        // File validation
        const maxFileSize = 10 * 1024 * 1024 // 10MB
        const maxFiles = 20
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

        // Check file count
        if (files.length > maxFiles) {
            setError(`Maximum ${maxFiles} files allowed at once`)
            return
        }

        // Check file types and sizes
        const validFiles = []
        const invalidFiles = []

        files.forEach(file => {
            if (!allowedTypes.includes(file.type)) {
                invalidFiles.push(`${file.name} (invalid file type)`)
            } else if (file.size > maxFileSize) {
                invalidFiles.push(`${file.name} (file too large - max 10MB)`)
            } else {
                validFiles.push(file)
            }
        })

        if (invalidFiles.length > 0) {
            setError(`Some files were rejected:\n${invalidFiles.join('\n')}`)
        }

        if (validFiles.length > 0) {
            setSelectedFiles(validFiles)
            setError('') // Clear previous errors
        }
    }

    const uploadPhotos = async () => {
        if (selectedFiles.length === 0) return

        setUploading(true)
        setError('')
        setSuccess('')
        setTotalUploads(selectedFiles.length)
        setCompletedUploads(0)
        setUploadProgress({})

        try {
            // Process uploads in batches for better performance
            const batchSize = 3 // Upload 3 files concurrently
            const batches = []

            for (let i = 0; i < selectedFiles.length; i += batchSize) {
                batches.push(selectedFiles.slice(i, i + batchSize))
            }

            const allUploadedPhotos = []

            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex]

                // Upload batch concurrently
                const batchPromises = batch.map(async (file, fileIndex) => {
                    const globalFileIndex = batchIndex * batchSize + fileIndex
                    const fileId = `${Date.now()}-${globalFileIndex}`

                    try {
                        // Create FormData for single file
                        const formData = new FormData()
                        formData.append('files', file)
                        if (guestName) {
                            formData.append('guestName', guestName)
                        }

                        // Update progress
                        setUploadProgress(prev => ({
                            ...prev,
                            [fileId]: { status: 'uploading', progress: 0 }
                        }))

                        // Send to API
                        const response = await fetch(`/api/events/${eventCode}/photos`, {
                            method: 'POST',
                            body: formData
                        })

                        if (!response.ok) {
                            const errorData = await response.json()
                            throw new Error(errorData.error || 'Upload failed')
                        }

                        const result = await response.json()

                        // Update progress to completed
                        setUploadProgress(prev => ({
                            ...prev,
                            [fileId]: { status: 'completed', progress: 100 }
                        }))

                        setCompletedUploads(prev => prev + 1)

                        if (result.photos && result.photos.length > 0) {
                            allUploadedPhotos.push(...result.photos)
                        }

                        return result
                    } catch (error) {
                        // Update progress to failed
                        setUploadProgress(prev => ({
                            ...prev,
                            [fileId]: { status: 'failed', progress: 0, error: error.message }
                        }))

                        setCompletedUploads(prev => prev + 1)
                        throw error
                    }
                })

                // Wait for current batch to complete before starting next
                await Promise.allSettled(batchPromises)

                // Small delay between batches to prevent overwhelming the server
                if (batchIndex < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200))
                }
            }

            // Check if any uploads succeeded
            if (allUploadedPhotos.length > 0) {
                setSuccess(`Successfully uploaded ${allUploadedPhotos.length} photo(s)!`)
                setSelectedFiles([])
                setGuestName('')

                // Refresh photos
                fetchPhotos()
            } else {
                setError('No photos were uploaded successfully')
            }
        } catch (error) {
            setError(`Upload failed: ${error.message}`)
        } finally {
            setUploading(false)
            // Clear progress after a delay
            setTimeout(() => {
                setUploadProgress({})
                setTotalUploads(0)
                setCompletedUploads(0)
            }, 3000)
        }
    }

    const openPhotoModal = (photo) => {
        setSelectedPhoto(photo)
    }

    const closePhotoModal = () => {
        setSelectedPhoto(null)
    }

    const getPhotoUrl = (photo) => {
        // Use the storagePath to construct the proper Supabase URL
        if (photo.storagePath) {
            // Debug: log the photo data
            console.log('Photo data:', photo)
            console.log('Storage path:', photo.storagePath)

            // Use the environment variable for Supabase URL instead of hardcoding
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            const url = `${supabaseUrl}/storage/v1/object/public/photos/${photo.storagePath}`
            console.log('Constructed URL:', url)
            return url
        }
        return ''
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
                            <div className="mt-2 text-xs text-gray-500 space-y-1">
                                <p>• You can select up to 20 photos at once</p>
                                <p>• Maximum file size: 10MB per photo</p>
                                <p>• Supported formats: JPEG, PNG, GIF, WebP</p>
                                <p>• Photos are uploaded in batches for better performance</p>
                            </div>
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

                        {/* Upload Progress */}
                        {uploading && (
                            <div className="mt-4 space-y-3">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Overall Progress</span>
                                    <span>{completedUploads} / {totalUploads}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${totalUploads > 0 ? (completedUploads / totalUploads) * 100 : 0}%` }}
                                    ></div>
                                </div>

                                {/* Individual File Progress */}
                                {Object.entries(uploadProgress).map(([fileId, progress]) => (
                                    <div key={fileId} className="flex items-center space-x-3 text-sm">
                                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full transition-all duration-300 ${progress.status === 'completed' ? 'bg-green-500' :
                                                    progress.status === 'failed' ? 'bg-red-500' :
                                                        'bg-blue-500'
                                                    }`}
                                                style={{ width: `${progress.progress}%` }}
                                            ></div>
                                        </div>
                                        <span className={`text-xs ${progress.status === 'completed' ? 'text-green-600' :
                                            progress.status === 'failed' ? 'text-red-600' :
                                                'text-blue-600'
                                            }`}>
                                            {progress.status === 'completed' ? '✓' :
                                                progress.status === 'failed' ? '✗' :
                                                    '⏳'}
                                        </span>
                                        {progress.status === 'failed' && (
                                            <span className="text-xs text-red-600">{progress.error}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
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
                        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                            {uploadedPhotos.map((photo) => (
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
                                                console.error('Image failed to load:', e.target.src)
                                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQgMTZMMTAgMTBMMTQgMTRMMTggMTBMMjAgMTJWMjBINEM0IDE4Ljg5NTQgMy4xMDU0NyAxOCAyIDE4VjZDMiA0Ljg5NTQzIDIuODk1NDMgNCA0IDRIMjBWMTRMMTggMTJMMTQgMTZMMTAgMTJMNCAxOFYxNloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'
                                            }}
                                            onLoad={(e) => {
                                                console.log('Image loaded successfully:', e.target.src)
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
            )}
        </div>
    )
} 