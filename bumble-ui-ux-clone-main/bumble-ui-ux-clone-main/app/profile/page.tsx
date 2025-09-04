"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, User, MapPin, Calendar, Heart, Star, Edit3, Camera } from "lucide-react"
import { authUtils } from "@/lib/auth"

interface UserProfile {
  id: number;
  name: string;
  age?: number;
  bio?: string;
  interests?: string[];
  photos?: string[];
  location?: string;
  gender?: 'male' | 'female' | 'other';
  looking_for?: 'male' | 'female' | 'both';
  verification_type: 'wallet' | 'face';
  verification_status: 'pending' | 'verified' | 'failed';
  created_at: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      // Get current session using auth utility
      const session = authUtils.getCurrentSession();
      
      console.log("Current session:", session);
      
      if (!session) {
        console.log("No valid session found, redirecting to login");
        router.push("/login");
        return;
      }

      const { userId, userEmail, userFirstName, userGender } = session;
      
      // Validate session with database
      const isValidSession = await authUtils.validateSession(userId);
      if (!isValidSession) {
        console.log("Session validation failed, clearing session and redirecting");
        authUtils.clearUserSession();
        router.push("/login");
        return;
      }

      console.log("Fetching profile for validated userId:", userId);

      // Debug: Check what's in the database
      const debugResponse = await fetch('/api/debug');
      const debugData = await debugResponse.json();
      console.log("Database contents:", debugData.data);

      // Fetch user data
      const userResponse = await fetch(`/api/users?id=${userId}`);
      const userData = await userResponse.json();
      console.log("User data response:", userData);
      console.log("User data success:", userData.success);
      console.log("User data user object:", userData.user);

      if (!userData.success || !userData.user) {
        console.log("User not found in database, clearing session and redirecting");
        authUtils.clearUserSession();
        router.push("/login");
        return;
      }

      console.log("User found in database, proceeding to fetch profile...");

      // Fetch profile data
      const profileResponse = await fetch(`/api/profiles?userId=${userId}`);
      const profileData = await profileResponse.json();
      console.log("Profile data response:", profileData);
      console.log("Profile data success:", profileData.success);
      console.log("Profile data profile:", profileData.profile);

      // Check if profile was found and has data
      if (profileData.success && profileData.profile && profileData.profile !== null) {
        console.log("Profile found! Creating combined profile...");
        // Combine user and profile data
        const combinedProfile: UserProfile = {
          id: userData.user.id,
          name: profileData.profile.name || userFirstName || "Unknown",
          age: profileData.profile.age,
          bio: profileData.profile.bio,
          interests: profileData.profile.interests || [],
          photos: profileData.profile.photos || [],
          location: profileData.profile.location,
          gender: profileData.profile.gender,
          looking_for: profileData.profile.looking_for,
          verification_type: userData.user.verification_type,
          verification_status: userData.user.verification_status,
          created_at: userData.user.created_at
        };
        console.log("Combined profile:", combinedProfile);
        setProfile(combinedProfile);
      } else {
        console.log("No profile found in database, creating user-only profile");
        // User exists but no profile created yet
        const userOnlyProfile: UserProfile = {
          id: userData.user.id,
          name: userFirstName || "Profile Incomplete",
          verification_type: userData.user.verification_type,
          verification_status: userData.user.verification_status,
          created_at: userData.user.created_at,
          gender: userGender as 'male' | 'female' | 'other',
          bio: "Please complete your profile information"
        };
        console.log("User-only profile:", userOnlyProfile);
        setProfile(userOnlyProfile);
      }
    } catch (err) {
      console.error("Error fetching profile:", err)
      setError("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getVerificationBadge = () => {
    if (profile?.verification_status === 'verified') {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
          <Star className="w-3 h-3" />
          {profile.verification_type === 'wallet' ? 'Wallet Verified' : 'Face Verified'}
        </div>
      )
    }
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
        Verification Pending
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    // Get localStorage data for debugging
    const debugData = typeof window !== 'undefined' ? {
      isLoggedIn: localStorage.getItem("isLoggedIn"),
      userId: localStorage.getItem("userId"),
      userEmail: localStorage.getItem("userEmail"),
      userFirstName: localStorage.getItem("userFirstName"),
      userGender: localStorage.getItem("userGender"),
      profileCompleted: localStorage.getItem("profileCompleted"),
      faceVerified: localStorage.getItem("faceVerified"),
      maleVerified: localStorage.getItem("maleVerified"),
      walletConnected: localStorage.getItem("walletConnected")
    } : {}

    const clearDataAndRestart = () => {
      if (typeof window !== 'undefined') {
        localStorage.clear()
        window.location.href = "/login"
      }
    }

    const retryFetch = () => {
      setError(null)
      setLoading(true)
      fetchUserProfile()
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">Database was reset. Please re-register to restore your profile.</p>
          
          {/* Debug Info */}
          <div className="mb-6 text-left">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Debug Info:</h3>
            <div className="bg-gray-100 p-3 rounded text-xs text-gray-600 font-mono">
              {JSON.stringify(debugData, null, 2)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push("/login")}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Back to Login
            </button>
            <button
              onClick={clearDataAndRestart}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Clear Data & Re-register
            </button>
            <button
              onClick={retryFetch}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to App</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                authUtils.clearUserSession();
                router.push("/login");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <span>Logout</span>
            </button>
            <button
              onClick={() => router.push("/create-profile")}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-purple-400 to-pink-400 px-6 py-8 text-white text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{profile.name}</h1>
            {getVerificationBadge()}
          </div>

          {/* Profile Details */}
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.age && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Age</p>
                    <p className="font-medium">{profile.age} years old</p>
                  </div>
                </div>
              )}

              {profile.location && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium">{profile.location}</p>
                  </div>
                </div>
              )}

              {profile.gender && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Gender</p>
                    <p className="font-medium capitalize">{profile.gender}</p>
                  </div>
                </div>
              )}

              {profile.looking_for && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Heart className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Looking for</p>
                    <p className="font-medium capitalize">{profile.looking_for}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">About Me</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                </div>
              </div>
            )}

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Photos */}
            {profile.photos && profile.photos.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Photos</h3>
                <div className="grid grid-cols-2 gap-4">
                  {profile.photos.map((photo, index) => (
                    <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // If image fails to load, show placeholder
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                      <div className="hidden w-full h-full flex items-center justify-center">
                        <Camera className="w-8 h-8 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Account Info */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Account Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">User ID:</span>
                  <span className="font-medium">#{profile.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Verification Method:</span>
                  <span className="font-medium capitalize">{profile.verification_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Member Since:</span>
                  <span className="font-medium">{formatDate(profile.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
