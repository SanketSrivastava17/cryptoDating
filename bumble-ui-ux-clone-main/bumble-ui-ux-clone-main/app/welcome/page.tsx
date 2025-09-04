'use client'

import { useRouter } from 'next/navigation'
import { Heart, Shield, Camera, Wallet } from 'lucide-react'

export default function WelcomePage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Heart className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Welcome to Crypto Dating
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        A secure, Web3-enabled dating platform where authenticity meets innovation.
                        Connect with verified users through blockchain technology and AI verification.
                    </p>
                </div>

                {/* Features */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                    <div className="bg-white rounded-xl p-6 shadow-lg">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                            <Shield className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Verified Profiles
                        </h3>
                        <p className="text-gray-600">
                            All users are verified through either Web3 wallet connection or AI face verification
                        </p>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-lg">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                            <Wallet className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Web3 Integration
                        </h3>
                        <p className="text-gray-600">
                            Connect your MetaMask wallet for secure, decentralized identity verification
                        </p>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-lg">
                        <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                            <Camera className="w-6 h-6 text-pink-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            AI Verification
                        </h3>
                        <p className="text-gray-600">
                            Advanced AI technology ensures authentic profiles and enhanced safety
                        </p>
                    </div>
                </div>

                {/* Call to Action */}
                <div className="text-center">
                    <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md mx-auto">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            Ready to Get Started?
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Join our community and start making meaningful connections
                        </p>
                        <button
                            onClick={() => router.push('/login')}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
                        >
                            Sign Up / Login
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-12 text-gray-500 text-sm">
                    <p>Secure • Verified • Decentralized</p>
                </div>
            </div>
        </div>
    )
}
