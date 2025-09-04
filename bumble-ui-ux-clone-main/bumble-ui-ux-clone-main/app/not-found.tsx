'use client'

import { useRouter } from 'next/navigation'

export default function NotFound() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-purple-600 mb-4">404</h1>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h2>
                <p className="text-gray-600 mb-6">
                    The page you're looking for doesn't exist.
                </p>
                <button
                    onClick={() => router.push('/')}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                >
                    Go home
                </button>
            </div>
        </div>
    )
}
