'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const router = useRouter()

    useEffect(() => {
        console.error('Application error:', error)
    }, [error])

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong!</h1>
                <p className="text-gray-600 mb-6">
                    We're sorry, but something unexpected happened.
                </p>
                <div className="space-x-4">
                    <button
                        onClick={() => reset()}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        Try again
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        Go home
                    </button>
                </div>
            </div>
        </div>
    )
}
