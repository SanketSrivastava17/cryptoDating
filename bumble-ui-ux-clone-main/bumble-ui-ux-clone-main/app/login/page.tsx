"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"

// Form validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

const signupSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  gender: z.enum(["male", "female"], {
    required_error: "Please select your gender",
  }),
  terms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type LoginFormData = z.infer<typeof loginSchema>
type SignupFormData = z.infer<typeof signupSchema>

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [selectedGender, setSelectedGender] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  // Check if user is already logged in
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true"
      if (isLoggedIn) {
        router.push("/")
        return
      }
      setIsLoading(false)
    }
  }, [router])

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onLoginSubmit = async (data: LoginFormData) => {
    console.log("Login data:", data)
    
    try {
      setIsSubmitting(true)
      
      // Authenticate with database
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: data.email,
          password: data.password
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        // Show error to user
        loginForm.setError('root', { message: result.message })
        setIsSubmitting(false)
        return
      }
      
      // Store user session data
      localStorage.setItem("isLoggedIn", "true")
      localStorage.setItem("userId", result.user.id.toString())
      localStorage.setItem("userEmail", result.user.email)
      localStorage.setItem("userFirstName", result.user.first_name || "User")
      localStorage.setItem("userGender", result.user.gender)
      
      // Set verification status based on user data
      if (result.user.verification_status === 'verified') {
        if (result.user.gender === 'female') {
          localStorage.setItem("faceVerified", "true")
          localStorage.setItem("femaleVerified", "true")
        } else {
          localStorage.setItem("maleVerified", "true")
          localStorage.setItem("walletConnected", "true")
        }
      }
      
      if (result.user.profile_completed) {
        localStorage.setItem("profileCompleted", "true")
      }
      
      // Redirect to appropriate page
      if (result.user.verification_status !== 'verified') {
        // User needs verification
        if (result.user.gender === 'female') {
          router.push("/face-verification")
        } else {
          router.push("/wallet-connection")
        }
      } else if (!result.user.profile_completed) {
        // User needs to complete profile
        router.push("/create-profile")
      } else {
        // User is fully set up
        router.push("/")
      }
      
    } catch (error) {
      console.error('Login error:', error)
      loginForm.setError('root', { message: 'Login failed. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const clearTestData = () => {
    localStorage.clear()
    window.location.reload()
  }

  const onSignupSubmit = async (data: SignupFormData) => {
    console.log("Signup data:", data)
    
    try {
      setIsSubmitting(true)
      
      // Create user in database
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          email: data.email,
          password: data.password,
          first_name: data.firstName,
          gender: data.gender
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        // Show error to user
        signupForm.setError('root', { message: result.message })
        setIsSubmitting(false)
        return
      }
      
      // Store user session data
      localStorage.setItem("isLoggedIn", "true")
      localStorage.setItem("userId", result.userId.toString())
      localStorage.setItem("userEmail", result.user.email)
      localStorage.setItem("userFirstName", result.user.first_name)
      localStorage.setItem("userGender", result.user.gender)
      
      // Redirect based on gender for verification
      if (data.gender === "female") {
        // Female users need face verification
        router.push("/face-verification")
      } else {
        // Male users need to connect their wallet
        router.push("/wallet-connection")
      }
      
    } catch (error) {
      console.error('Signup error:', error)
      signupForm.setError('root', { message: 'Signup failed. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-400 mb-4">bumble</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-yellow-400 mb-2">bumble</h1>
            <p className="text-gray-600">
              {isLogin ? "Welcome back!" : "Make the first move"}
            </p>
            {/* Development helper - remove in production */}
            <button
              onClick={() => {
                localStorage.clear()
                window.location.reload()
              }}
              className="mt-2 text-xs text-gray-400 hover:text-gray-600"
            >
              Clear Session (Dev)
            </button>
          </div>

          {/* Toggle Buttons */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => {
                setIsLogin(true)
                setSelectedGender("")
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                isLogin
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => {
                setIsLogin(false)
                setSelectedGender("")
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                !isLogin
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Login Form */}
          {isLogin && (
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  {...loginForm.register("email")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Enter your email"
                />
                {loginForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...loginForm.register("password")}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-yellow-400 shadow-sm focus:border-yellow-400 focus:ring focus:ring-yellow-200 focus:ring-opacity-50" />
                  <span className="ml-2 text-gray-600">Remember me</span>
                </label>
                <Link href="#" className="text-yellow-500 hover:text-yellow-600">
                  Forgot password?
                </Link>
              </div>

              {/* Form-level error display */}
              {loginForm.formState.errors.root && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">
                    {loginForm.formState.errors.root.message}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-yellow-400 text-white py-2 px-4 rounded-lg font-medium hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Logging in...' : 'Log In'}
              </button>
            </form>
          )}

          {/* Signup Form */}
          {!isLogin && (
            <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  {...signupForm.register("firstName")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Enter your first name"
                />
                {signupForm.formState.errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">
                    {signupForm.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="signupEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="signupEmail"
                  type="email"
                  {...signupForm.register("email")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Enter your email"
                />
                {signupForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {signupForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  I am a
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGender("male")
                      signupForm.setValue("gender", "male")
                    }}
                    className={`border-2 rounded-lg p-4 text-center cursor-pointer transition-all ${
                      selectedGender === "male"
                        ? "border-yellow-400 bg-yellow-50"
                        : "border-gray-300 hover:border-yellow-400"
                    }`}
                  >
                    <div className="text-2xl mb-2">♂️</div>
                    <span className="text-sm font-medium text-gray-700">Man</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGender("female")
                      signupForm.setValue("gender", "female")
                    }}
                    className={`border-2 rounded-lg p-4 text-center cursor-pointer transition-all ${
                      selectedGender === "female"
                        ? "border-yellow-400 bg-yellow-50"
                        : "border-gray-300 hover:border-yellow-400"
                    }`}
                  >
                    <div className="text-2xl mb-2">♀️</div>
                    <span className="text-sm font-medium text-gray-700">Woman</span>
                  </button>
                </div>
                <input
                  type="hidden"
                  {...signupForm.register("gender")}
                />
                {signupForm.formState.errors.gender && (
                  <p className="mt-2 text-sm text-red-600">
                    {signupForm.formState.errors.gender.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="signupPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signupPassword"
                    type={showPassword ? "text" : "password"}
                    {...signupForm.register("password")}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {signupForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {signupForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    {...signupForm.register("confirmPassword")}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {signupForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {signupForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex items-start">
                <input
                  id="terms"
                  type="checkbox"
                  {...signupForm.register("terms")}
                  className="mt-1 rounded border-gray-300 text-yellow-400 shadow-sm focus:border-yellow-400 focus:ring focus:ring-yellow-200 focus:ring-opacity-50"
                />
                <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                  I agree to the{" "}
                  <Link href="#" className="text-yellow-500 hover:text-yellow-600">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="#" className="text-yellow-500 hover:text-yellow-600">
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {signupForm.formState.errors.terms && (
                <p className="text-sm text-red-600">
                  {signupForm.formState.errors.terms.message}
                </p>
              )}

              {/* Form-level error display */}
              {signupForm.formState.errors.root && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">
                    {signupForm.formState.errors.root.message}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-yellow-400 text-white py-2 px-4 rounded-lg font-medium hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>
          )}

          {/* Social Login */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="ml-2">Google</span>
              </button>

              <button className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="ml-2">Facebook</span>
              </button>
            </div>
          </div>
          
          {/* Test/Debug Section */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-center">
              <button
                onClick={clearTestData}
                className="text-xs text-red-600 hover:text-red-800 underline"
              >
                Clear Test Data (Reset Everything)
              </button>
              <p className="text-xs text-gray-500 mt-1">
                Use this if you get stuck in loops during testing
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
