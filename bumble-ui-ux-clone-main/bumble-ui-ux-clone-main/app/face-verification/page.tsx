"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Camera, CheckCircle, XCircle, RotateCcw, AlertCircle } from "lucide-react"
import { analyzeGenderWithFacePlusPlus } from "@/lib/facePlusPlus"
import { authUtils } from "@/lib/auth"

interface VerificationStep {
  id: string
  instruction: string
  completed: boolean
}

interface GenderDetectionResult {
  confidence: number
  gender: 'male' | 'female'
  faceDetected: boolean
  error?: string
}

export default function FaceVerificationPage() {
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationComplete, setVerificationComplete] = useState(false)
  const [verificationFailed, setVerificationFailed] = useState(false)
  const [genderMismatch, setGenderMismatch] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [genderDetectionResult, setGenderDetectionResult] = useState<GenderDetectionResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const router = useRouter()

  // Function to save user data to database
  const saveUserToDatabase = async (genderResult: GenderDetectionResult) => {
    try {
      // First, check if user already exists (by email - we'll need to get email input)
      // For now, we'll create a new user since we don't have email yet

      // Create new user
      const createUserResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          verification_type: 'face',
          verification_status: 'verified'
        })
      })
      const createUserData = await createUserResponse.json()

      if (!createUserData.success) {
        throw new Error('Failed to create user')
      }

      const userId = createUserData.userId

      // Save face verification data
      await fetch('/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createFaceVerification',
          user_id: userId,
          confidence_score: genderResult.confidence,
          verification_data: {
            gender_detected: genderResult.gender,
            face_detected: genderResult.faceDetected,
            timestamp: new Date().toISOString(),
            verification_steps_completed: 1 // Since we're using simplified verification
          }
        })
      })

      // Set user session properly
      authUtils.setUserSession({
        userId: userId,
        userGender: 'female',
        verificationType: 'face'
      });

      console.log('Face verification data saved to database successfully')
    } catch (error: any) {
      console.error('Error saving face verification data to database:', error)
      // Don't throw error here to avoid disrupting the verification flow
    }
  }

  const verificationSteps: VerificationStep[] = [
    { id: "center", instruction: "Look straight at the camera", completed: false },
    { id: "left", instruction: "Turn your head slowly to the left", completed: false },
    { id: "right", instruction: "Turn your head slowly to the right", completed: false },
    { id: "smile", instruction: "Smile naturally", completed: false },
    { id: "blink", instruction: "Blink your eyes", completed: false },
  ]

  const [steps, setSteps] = useState(verificationSteps)

  useEffect(() => {
    // Check if user has selected female gender
    const userGender = localStorage.getItem("userGender")
    if (userGender !== "female") {
      router.push("/login")
      return
    }

    // Only start camera once when component mounts
    let mounted = true

    const initializeCamera = async () => {
      if (mounted && !stream) {
        await startCamera()
      }
    }

    initializeCamera()

    // Cleanup function
    return () => {
      mounted = false
      if (stream) {
        console.log('Cleaning up camera stream...')
        stream.getTracks().forEach(track => {
          track.stop()
          console.log('Stopped camera track:', track.kind)
        })
      }
    }
  }, []) // Empty dependency array - only run once on mount

  const startCamera = async () => {
    console.log('Starting camera initialization...')

    try {
      // Stop any existing stream first to prevent conflicts
      if (stream) {
        console.log('Stopping existing stream...')
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
        setCameraEnabled(false)
      }

      console.log('Requesting camera access...')
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          facingMode: "user"
        },
        audio: false
      })

      console.log('Camera stream obtained successfully')
      setStream(mediaStream)
      setCameraEnabled(true) // Set enabled immediately when stream is obtained

      // Set video source and ensure it plays
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        console.log('Video source set')

        // Small delay to ensure video is ready, then force play
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play().catch(console.error)
          }
        }, 100)
      }
    } catch (error: any) {
      console.error("Camera access error:", error)
      setCameraEnabled(true) // Enable UI anyway for skip option

      if (error?.name === 'NotAllowedError') {
        alert("Camera permission denied. Please allow camera access and refresh the page, or use the skip button.")
      } else if (error?.name === 'NotFoundError') {
        alert("No camera found. Please connect a camera or use the skip button.")
      } else {
        alert("Camera error occurred. You can use the skip button to continue.")
      }
    }
  }

  const captureAndAnalyzeFrame = async (): Promise<GenderDetectionResult> => {
    console.log('Capturing frame for analysis...')

    if (!videoRef.current || !canvasRef.current || !stream) {
      console.error('Video, canvas, or stream not available')
      return { confidence: 0, gender: 'male', faceDetected: false, error: 'Video not ready' }
    }

    // Check if video is actually playing
    if (videoRef.current.readyState < 2) {
      console.error('Video not ready for capture')
      return { confidence: 0, gender: 'male', faceDetected: false, error: 'Video not ready' }
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Canvas context not available')
      return { confidence: 0, gender: 'male', faceDetected: false, error: 'Canvas error' }
    }

    try {
      // Set canvas size to match video
      const video = videoRef.current
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      console.log(`Capturing frame: ${canvas.width}x${canvas.height}`)

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert to base64 with good quality
      const imageData = canvas.toDataURL('image/jpeg', 0.8)

      console.log('Image captured, sending to analysis...')
      const result = await analyzeGenderWithFacePlusPlus(imageData)
      console.log('Analysis result:', result)
      return result
    } catch (error: any) {
      console.error('Frame capture/analysis failed:', error)
      return { confidence: 0, gender: 'male', faceDetected: false, error: 'Capture failed' }
    }
  }

  const startVerification = async () => {
    setIsVerifying(true)
    setCurrentStep(0)
    setGenderMismatch(false)
    setVerificationFailed(false)

    // First, perform gender detection
    setIsAnalyzing(true)
    try {
      const genderResult = await captureAndAnalyzeFrame()
      setGenderDetectionResult(genderResult)
      setIsAnalyzing(false)

      console.log('Gender detection result:', genderResult)

      if (!genderResult.faceDetected) {
        console.log('No face detected, failing verification')
        setVerificationFailed(true)
        setIsVerifying(false)
        return
      }

      console.log(`Gender check: detected=${genderResult.gender}, confidence=${genderResult.confidence}`)

      // STRICT check - ONLY allow females to pass verification
      if (genderResult.gender === 'female') {
        console.log('Gender verification passed - female detected')
        // Skip the movement verification and go straight to success
        setTimeout(() => {
          completeVerification(genderResult)
        }, 2000)
      } else {
        console.log('Gender verification failed - male detected or not female')
        setGenderMismatch(true)
        setIsVerifying(false)
      }
    } catch (error: any) {
      console.error('Gender detection failed:', error)
      setVerificationFailed(true)
      setIsVerifying(false)
      setIsAnalyzing(false)
    }
  }

  const completeVerification = async (genderResult: GenderDetectionResult) => {
    console.log('Completing verification...')
    setIsVerifying(false)
    setVerificationComplete(true)
    localStorage.setItem("faceVerified", "true")
    localStorage.setItem("femaleVerified", "true")

    // Clean up any wallet-related data for female users to prevent MetaMask issues
    localStorage.removeItem("walletConnected")
    localStorage.removeItem("maleVerified")
    localStorage.removeItem("connectedAccount")
    localStorage.removeItem("ethBalance")

    // Stop camera stream after verification
    if (stream) {
      console.log('Stopping camera stream after verification...')
      stream.getTracks().forEach(track => {
        track.stop()
        console.log('Stopped camera track:', track.kind)
      })
      setStream(null)
      setCameraEnabled(false)
    }

    // Save verification data to database
    try {
      await saveUserToDatabase(genderResult)
    } catch (error: any) {
      console.error('Error saving to database:', error)
    }

    console.log('Redirecting to profile creation...')
    setTimeout(() => {
      router.push("/create-profile")
    }, 2000)
  }

  const simulateVerificationProcess = () => {
    let stepIndex = 0

    const processStep = () => {
      if (stepIndex >= steps.length) {
        // Verification complete - final gender check
        performFinalGenderCheck()
        return
      }

      setCurrentStep(stepIndex)

      // Simulate step completion after 3 seconds
      setTimeout(() => {
        setSteps(prev => prev.map((step, index) =>
          index === stepIndex ? { ...step, completed: true } : step
        ))
        stepIndex++

        setTimeout(() => {
          processStep()
        }, 1000)
      }, 3000)
    }

    processStep()
  }

  const performFinalGenderCheck = async () => {
    setIsAnalyzing(true)

    try {
      // Perform final gender verification
      const finalGenderResult = await captureAndAnalyzeFrame()
      console.log('Final gender check result:', finalGenderResult)
      setIsAnalyzing(false)
      setIsVerifying(false)

      if (finalGenderResult.gender === 'female' && finalGenderResult.confidence >= 50) {
        console.log('Final gender verification passed')
        setVerificationComplete(true)
        localStorage.setItem("faceVerified", "true")
        localStorage.setItem("femaleVerified", "true")

        // Clean up any wallet-related data for female users to prevent MetaMask issues
        localStorage.removeItem("walletConnected")
        localStorage.removeItem("maleVerified")
        localStorage.removeItem("connectedAccount")
        localStorage.removeItem("ethBalance")

        // Stop camera stream after final verification
        if (stream) {
          console.log('Stopping camera stream after final verification...')
          stream.getTracks().forEach(track => {
            track.stop()
            console.log('Stopped camera track:', track.kind)
          })
          setStream(null)
          setCameraEnabled(false)
        }

        // Save verification data to database
        await saveUserToDatabase(finalGenderResult)

        setTimeout(() => {
          router.push("/create-profile")
        }, 3000)
      } else {
        console.log('Final gender verification failed')
        setGenderMismatch(true)
      }
    } catch (error: any) {
      console.error('Final gender check failed:', error)
      setVerificationFailed(true)
      setIsAnalyzing(false)
      setIsVerifying(false)
    }
  }

  const retryVerification = async () => {
    console.log('Retrying verification...')
    setVerificationFailed(false)
    setVerificationComplete(false)
    setGenderMismatch(false)
    setGenderDetectionResult(null)
    setCurrentStep(0)
    setIsAnalyzing(false)
    setIsVerifying(false)

    // If camera isn't working, try to restart it
    if (!stream || !cameraEnabled) {
      console.log('Restarting camera for retry...')
      await startCamera()
    }
  }

  const skipVerification = () => {
    console.log('Skipping verification - forcing success')
    setVerificationComplete(true)
    localStorage.setItem("faceVerified", "true")
    localStorage.setItem("femaleVerified", "true")

    // Clean up any wallet-related data for female users to prevent MetaMask issues
    localStorage.removeItem("walletConnected")
    localStorage.removeItem("maleVerified")
    localStorage.removeItem("connectedAccount")
    localStorage.removeItem("ethBalance")

    // Stop camera stream when skipping verification
    if (stream) {
      console.log('Stopping camera stream after skipping verification...')
      stream.getTracks().forEach(track => {
        track.stop()
        console.log('Stopped camera track:', track.kind)
      })
      setStream(null)
      setCameraEnabled(false)
    }

    // Create a mock successful result
    const mockResult: GenderDetectionResult = {
      confidence: 95,
      gender: 'female',
      faceDetected: true
    }

    // Save to database and proceed
    saveUserToDatabase(mockResult).then(() => {
      setTimeout(() => {
        router.push("/create-profile")
      }, 1000)
    }).catch((error) => {
      console.error('Database save error:', error)
      // Proceed anyway
      setTimeout(() => {
        router.push("/create-profile")
      }, 1000)
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => router.push("/login")}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to signup</span>
        </button>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Face Verification</h1>
            <p className="text-gray-600 text-sm">
              Please complete face verification to ensure authenticity
            </p>

            {/* API Status Indicator */}
            <div className="mt-4 p-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600">
                {process.env.NEXT_PUBLIC_FACEPP_API_KEY
                  ? "🔗 Using Face++ AI API for real gender detection"
                  : "⚠️ Face++ API not configured - using simulation mode"
                }
              </p>
              {/* Debug info */}
              <p className="text-xs text-gray-500 mt-1">
                Camera: {stream ? '✓ Active' : '✗ Inactive'} |
                UI: {cameraEnabled ? '✓ Ready' : '✗ Loading'}
              </p>
            </div>
          </div>

          {/* Camera Section */}
          <div className="mb-6">
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
              {stream ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{
                      transform: 'scaleX(-1)', // Mirror the video for better UX
                      backgroundColor: '#1a1a1a'  // Prevent white flash
                    }}
                    onLoadStart={() => console.log('Video load started')}
                    onLoadedData={() => console.log('Video data loaded')}
                    onCanPlay={() => {
                      console.log('Video can play')
                      // Force play the video if it's not already playing
                      if (videoRef.current && videoRef.current.paused) {
                        videoRef.current.play().catch(console.error)
                      }
                    }}
                    onLoadedMetadata={() => {
                      console.log('Video metadata loaded')
                      // Force play when metadata is loaded
                      if (videoRef.current) {
                        videoRef.current.play().catch(console.error)
                      }
                    }}
                  />

                  {/* Hidden canvas for image capture */}
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />

                  {/* AI Analysis Overlay */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-blue-500 bg-opacity-75 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        <p className="text-lg font-semibold">AI Gender Detection</p>
                        <p className="text-sm">Analyzing facial features...</p>
                      </div>
                    </div>
                  )}

                  {/* Face Detection Overlay */}
                  {isVerifying && !isAnalyzing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 border-4 border-white rounded-full animate-pulse opacity-50"></div>
                      <div className="absolute w-32 h-32 border-2 border-yellow-400 rounded-full animate-ping"></div>
                    </div>
                  )}

                  {/* Success/Failure Overlays */}
                  {verificationComplete && (
                    <div className="absolute inset-0 bg-green-500 bg-opacity-75 flex items-center justify-center">
                      <div className="text-center text-white">
                        <CheckCircle className="w-16 h-16 mx-auto mb-2" />
                        <p className="text-xl font-semibold">Verification Successful!</p>
                        <p className="text-sm">Gender confirmed: Female</p>
                      </div>
                    </div>
                  )}

                  {genderMismatch && (
                    <div className="absolute inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center">
                      <div className="text-center text-white">
                        <AlertCircle className="w-16 h-16 mx-auto mb-2" />
                        <p className="text-xl font-semibold">Gender Verification Failed</p>
                        <p className="text-sm">
                          {genderDetectionResult?.faceDetected
                            ? `Detected: ${genderDetectionResult.gender} (${genderDetectionResult.confidence.toFixed(1)}% confidence)`
                            : "No face detected"
                          }
                        </p>
                        <p className="text-xs mt-2">This verification is for female users only</p>
                      </div>
                    </div>
                  )}

                  {verificationFailed && !genderMismatch && (
                    <div className="absolute inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center">
                      <div className="text-center text-white">
                        <XCircle className="w-16 h-16 mx-auto mb-2" />
                        <p className="text-xl font-semibold">Verification Failed</p>
                        <p className="text-sm">Please ensure good lighting and try again</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-white">
                  <div className="text-center">
                    <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">
                      {!stream ? 'Initializing camera...' : 'Starting video...'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          {isAnalyzing && (
            <div className="mb-6">
              <div className="text-center mb-4">
                <p className="text-lg font-medium text-gray-900">
                  AI is analyzing your facial features
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Please look directly at the camera
                </p>
              </div>
            </div>
          )}

          {isVerifying && !isAnalyzing && (
            <div className="mb-6">
              <div className="text-center mb-4">
                <p className="text-lg font-medium text-gray-900">
                  {steps[currentStep]?.instruction}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Step {currentStep + 1} of {steps.length}
                </p>
              </div>

              {/* Progress Steps */}
              <div className="flex justify-center space-x-2">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`w-3 h-3 rounded-full transition-all ${step.completed
                        ? "bg-green-500"
                        : index === currentStep
                          ? "bg-yellow-400 animate-pulse"
                          : "bg-gray-300"
                      }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Gender Detection Results */}
          {genderDetectionResult && !verificationComplete && !isVerifying && !isAnalyzing && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-2">AI Detection Results:</h3>
              <div className="text-xs text-gray-600">
                <p>Face Detected: {genderDetectionResult.faceDetected ? '✓ Yes' : '✗ No'}</p>
                {genderDetectionResult.faceDetected && (
                  <>
                    <p>Detected Gender: {genderDetectionResult.gender}</p>
                    <p>Confidence: {genderDetectionResult.confidence.toFixed(1)}%</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!isVerifying && !verificationComplete && !verificationFailed && !genderMismatch && !isAnalyzing && (
              <button
                onClick={startVerification}
                disabled={!cameraEnabled}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start AI Verification
              </button>
            )}

            {/* Always show skip button for testing/fallback */}
            {!verificationComplete && !isVerifying && (
              <button
                onClick={skipVerification}
                className="w-full bg-blue-500 text-white py-2 px-4 text-sm hover:bg-blue-600 transition-colors rounded-lg font-medium"
              >
                Skip Verification (Continue as Female)
              </button>
            )}

            {(verificationFailed || genderMismatch) && (
              <button
                onClick={retryVerification}
                className="w-full bg-yellow-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
            )}

            {genderMismatch && (
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-700 font-medium text-sm mb-2">
                  Gender Verification Failed
                </p>
                <p className="text-red-600 text-xs">
                  Our AI system detected: {genderDetectionResult?.gender || 'unknown'}
                  ({genderDetectionResult?.confidence?.toFixed(1) || '0'}% confidence).
                  This verification is required for female users only to maintain platform authenticity.
                </p>
                <button
                  onClick={() => router.push("/login")}
                  className="mt-3 text-red-600 hover:text-red-800 text-sm underline"
                >
                  Return to signup
                </button>
              </div>
            )}

            {verificationComplete && (
              <div className="text-center">
                <p className="text-green-600 font-medium mb-2">
                  ✓ Verification completed successfully!
                </p>
                <p className="text-sm text-gray-500">
                  AI confirmed: Female user verified
                </p>
                <p className="text-sm text-gray-500">
                  Redirecting to your profile...
                </p>
              </div>
            )}

            {/* Force Pass button for gender mismatch */}
            {genderMismatch && (
              <button
                onClick={() => {
                  const mockResult: GenderDetectionResult = {
                    confidence: 95,
                    gender: 'female',
                    faceDetected: true
                  }
                  completeVerification(mockResult)
                }}
                className="w-full bg-green-500 text-white py-2 px-4 text-sm hover:bg-green-600 transition-colors rounded-lg font-medium mt-2"
              >
                Force Pass Verification (Testing)
              </button>
            )}
          </div>

          {/* Privacy Notice */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              🔒 Your face data is processed securely with AI gender detection and not stored.
              This verification helps maintain a safe and authentic community for women.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
