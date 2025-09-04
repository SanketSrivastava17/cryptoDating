"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Camera, Upload, MapPin, Check, X, AlertCircle, User, Image as ImageIcon } from "lucide-react"
import { authUtils } from "@/lib/auth"

interface ProfileImage {
  id: string
  file: File | null
  preview: string | null
}

interface LocationData {
  latitude: number
  longitude: number
  city?: string
  country?: string
}

export default function CreateProfilePage() {
  const [profileImages, setProfileImages] = useState<ProfileImage[]>([
    { id: '1', file: null, preview: null },
    { id: '2', file: null, preview: null }
  ])
  const [location, setLocation] = useState<LocationData | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [verificationMethod, setVerificationMethod] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  // New profile fields
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    bio: "",
    interests: [] as string[],
    gender: "",
    lookingFor: ""
  })

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const router = useRouter()

  const availableInterests = [
    "Travel", "Photography", "Music", "Movies", "Books", "Sports", "Cooking",
    "Art", "Technology", "Fitness", "Gaming", "Dancing", "Nature", "Fashion"
  ]

  useEffect(() => {
    const initializeProfile = async () => {
      // Check verification status
      const walletConnected = localStorage.getItem("walletConnected")
      const maleVerified = localStorage.getItem("maleVerified")
      const femaleVerified = localStorage.getItem("femaleVerified")
      const userGender = localStorage.getItem("userGender")

      if (userGender === "male" && (walletConnected === "true" && maleVerified === "true")) {
        setVerificationMethod("wallet")
        setFormData(prev => ({ ...prev, gender: "male" }))
      } else if (userGender === "female" && femaleVerified === "true") {
        setVerificationMethod("face")
        setFormData(prev => ({ ...prev, gender: "female" }))
      } else {
        // User hasn't completed verification, redirect to login
        router.push("/login")
        return
      }

      // Try to load existing profile
      try {
        const session = authUtils.getCurrentSession();
        if (session) {
          const response = await fetch('/api/profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'getByUserId',
              userId: session.userId
            })
          });

          const result = await response.json();

          if (result.success && result.profile) {
            // Profile exists, enter edit mode
            setIsEditMode(true);
            const profile = result.profile;

            setFormData({
              name: profile.name || "",
              age: profile.age ? profile.age.toString() : "",
              bio: profile.bio || "",
              interests: Array.isArray(profile.interests) ? profile.interests :
                (typeof profile.interests === 'string' ? JSON.parse(profile.interests) : []),
              gender: profile.gender || userGender || "",
              lookingFor: profile.looking_for || ""
            });

            // Set location if available
            if (profile.location) {
              const userLocation = localStorage.getItem("userLocation");
              if (userLocation) {
                try {
                  setLocation(JSON.parse(userLocation));
                } catch (e) {
                  console.error("Error parsing stored location:", e);
                }
              }
            }

            // Set profile images if available
            if (profile.photos && Array.isArray(profile.photos) && profile.photos.length > 0) {
              const updatedImages = [...profileImages];
              profile.photos.forEach((photoUrl: string, index: number) => {
                if (index < updatedImages.length) {
                  updatedImages[index] = {
                    ...updatedImages[index],
                    preview: photoUrl
                  };
                }
              });
              setProfileImages(updatedImages);
            }
          }
        }
      } catch (error) {
        console.error("Error loading existing profile:", error);
      }

      setIsLoadingProfile(false);
    };

    initializeProfile();
  }, [router])

  const handleImageUpload = (imageId: string, file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileImages(prev => prev.map(img =>
          img.id === imageId
            ? { ...img, file, preview: e.target?.result as string }
            : img
        ))
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = (imageId: string) => {
    setProfileImages(prev => prev.map(img =>
      img.id === imageId
        ? { ...img, file: null, preview: null }
        : img
    ))
  }

  const requestLocation = async () => {
    setIsLoadingLocation(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser")
      setIsLoadingLocation(false)
      return
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        })
      })

      const { latitude, longitude } = position.coords

      // Try to get city/country from reverse geocoding
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        )
        const data = await response.json()

        setLocation({
          latitude,
          longitude,
          city: data.city || data.locality || "Unknown",
          country: data.countryName || "Unknown"
        })
      } catch (geocodingError) {
        // If reverse geocoding fails, still save coordinates
        setLocation({
          latitude,
          longitude,
          city: "Unknown",
          country: "Unknown"
        })
      }
    } catch (error: any) {
      let errorMessage = "Unable to get your location"

      if (error.code === 1) {
        errorMessage = "Location access denied. Please enable location permissions."
      } else if (error.code === 2) {
        errorMessage = "Location information is unavailable."
      } else if (error.code === 3) {
        errorMessage = "Location request timed out."
      }

      setLocationError(errorMessage)
    }

    setIsLoadingLocation(false)
  }

  const canSubmit = () => {
    const hasAllImages = profileImages.every(img => img.file !== null || img.preview !== null)
    const hasLocation = location !== null
    const hasRequiredFields = formData.name.trim() !== "" &&
      formData.age !== "" &&
      parseInt(formData.age) >= 18 &&
      parseInt(formData.age) <= 100 &&
      formData.bio.trim() !== "" &&
      formData.interests.length > 0 &&
      formData.lookingFor !== ""

    // In edit mode, be more lenient - just need required fields filled
    if (isEditMode) {
      return hasRequiredFields
    }

    // In create mode, need everything including photos and location
    return hasAllImages && hasLocation && hasRequiredFields
  }

  const handleSubmit = async () => {
    if (!canSubmit()) return

    setIsSubmitting(true)

    try {
      // Get current session
      const session = authUtils.getCurrentSession();
      if (!session) {
        throw new Error("No valid session found. Please log in again.");
      }

      const userId = session.userId;

      // Convert images to base64 or upload them (for demo, we'll store as data URLs)
      const imageDataUrls = await Promise.all(
        profileImages.map(async (img) => {
          if (!img.file) {
            // If no new file, keep existing preview (for edit mode)
            return img.preview;
          }
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target?.result as string)
            reader.readAsDataURL(img.file!)
          })
        })
      )

      const locationString = location ? `${location.city || 'Unknown'}, ${location.country || 'Unknown'}` : ""

      // Save profile to database (create or update)
      const profileResponse = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isEditMode ? 'update' : 'create',
          ...(isEditMode ? { userId } : { user_id: userId }),
          name: formData.name.trim(),
          age: parseInt(formData.age),
          bio: formData.bio.trim(),
          interests: formData.interests,
          photos: imageDataUrls.filter(url => url !== null && url !== ""),
          location: locationString,
          gender: formData.gender as 'male' | 'female',
          looking_for: formData.lookingFor as 'male' | 'female' | 'both'
        })
      })

      const profileData = await profileResponse.json()
      console.log('Profile operation response:', profileData)

      if (!profileData.success) {
        throw new Error(`Failed to ${isEditMode ? 'update' : 'create'} profile: ${profileData.message}`)
      }

      // Store profile completion status
      localStorage.setItem("profileCompleted", "true")
      localStorage.setItem("userLocation", JSON.stringify(location))

      console.log(`Profile ${isEditMode ? 'updated' : 'created'} successfully in database`)

      // Redirect to main app
      router.push("/")
    } catch (error) {
      console.error(`Profile ${isEditMode ? 'update' : 'creation'} failed:`, error)
      alert(`Failed to ${isEditMode ? 'update' : 'create'} profile. Please try again.`)
    }

    setIsSubmitting(false)
  }

  if (!verificationMethod || isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isLoadingProfile ? "Loading profile..." : "Checking verification status..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isEditMode ? "Edit Your Profile" : "Create Your Profile"}
            </h1>
            <p className="text-gray-600 text-sm">
              {isEditMode
                ? "Update your photos and information to keep your profile fresh"
                : "Add your photos and enable location to start connecting with people nearby"
              }
            </p>
          </div>

          {/* Verification Status */}
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-600" />
              <div>
                <h3 className="text-sm font-medium text-green-900">
                  {verificationMethod === "wallet" ? "Wallet Connected" : "Face Verified"}
                </h3>
                <p className="text-sm text-green-700">
                  {verificationMethod === "wallet"
                    ? "Your identity has been verified via MetaMask"
                    : "Your identity has been verified via face recognition"
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Profile Information Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tell us about yourself</h2>

            {/* Name */}
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your first name"
                maxLength={30}
              />
            </div>

            {/* Age */}
            <div className="mb-4">
              <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                Age <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="age"
                value={formData.age}
                onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your age"
                min="18"
                max="100"
              />
            </div>

            {/* Bio */}
            <div className="mb-4">
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                Bio <span className="text-red-500">*</span>
              </label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                placeholder="Tell others about yourself..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500 characters</p>
            </div>

            {/* Looking for */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I'm looking for <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['male', 'female', 'both'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, lookingFor: option }))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${formData.lookingFor === option
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {option === 'both' ? 'Both' : option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interests <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">Select at least one interest</p>
              <div className="grid grid-cols-2 gap-2">
                {availableInterests.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        interests: prev.interests.includes(interest)
                          ? prev.interests.filter(i => i !== interest)
                          : [...prev.interests, interest]
                      }))
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${formData.interests.includes(interest)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Selected: {formData.interests.length} interest{formData.interests.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Photo Upload Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Add Your Photos</h2>
              <span className="text-sm text-red-500">*</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {profileImages.map((image, index) => (
                <div key={image.id} className="relative">
                  <div className="aspect-square border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                    {image.preview ? (
                      <div className="relative w-full h-full">
                        <img
                          src={image.preview}
                          alt={`Profile ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeImage(image.id)}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRefs.current[image.id]?.click()}
                        className="w-full h-full flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <Camera className="w-8 h-8 mb-2" />
                        <span className="text-sm font-medium">Add Photo {index + 1}</span>
                      </button>
                    )}
                  </div>

                  <input
                    ref={el => {
                      fileInputRefs.current[image.id] = el
                    }}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(image.id, file)
                    }}
                    className="hidden"
                  />
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Upload 2 clear photos of yourself. These will be shown to other users.
            </p>
          </div>

          {/* Location Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Enable Location</h2>
              <span className="text-sm text-red-500">*</span>
            </div>

            {!location && !locationError && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-blue-900 mb-1">Why we need your location</h3>
                    <p className="text-sm text-blue-700 mb-3">
                      We use your location to show you people nearby and help you make meaningful connections.
                    </p>
                    <button
                      onClick={requestLocation}
                      disabled={isLoadingLocation}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isLoadingLocation ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Getting Location...
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4" />
                          Enable Location
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {locationError && (
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-900 mb-1">Location Error</h3>
                    <p className="text-sm text-red-700 mb-3">{locationError}</p>
                    <button
                      onClick={requestLocation}
                      disabled={isLoadingLocation}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {location && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-green-900 mb-1">Location Enabled</h3>
                    <p className="text-sm text-green-700">
                      {location.city}, {location.country}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Coordinates: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit() || isSubmitting}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {isEditMode ? "Updating Profile..." : "Creating Profile..."}
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                {isEditMode ? "Update Profile" : "Complete Profile"}
              </>
            )}
          </button>

          {!canSubmit() && (
            <p className="text-center text-sm text-gray-500 mt-3">
              {isEditMode
                ? "Please fill in all required fields to update your profile"
                : "Please add both photos and enable location to continue"
              }
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
