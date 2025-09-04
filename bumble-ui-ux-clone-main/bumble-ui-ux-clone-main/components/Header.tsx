"use client"

import Link from "next/link"
import { User, MoreHorizontal, LogOut } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface HeaderProps {
  showLoginButton?: boolean
}

export default function Header({ showLoginButton = true }: HeaderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userFirstName, setUserFirstName] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loggedIn = localStorage.getItem("isLoggedIn") === "true"
      const firstName = localStorage.getItem("userFirstName") || ""
      setIsLoggedIn(loggedIn)
      setUserFirstName(firstName)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("userFirstName")
    localStorage.removeItem("userGender")
    localStorage.removeItem("faceVerified")
    localStorage.removeItem("femaleVerified")
    localStorage.removeItem("maleVerified")
    localStorage.removeItem("walletConnected")
    localStorage.removeItem("walletAddress")
    localStorage.removeItem("profileCompleted")
    localStorage.removeItem("userLocation")
    localStorage.removeItem("profileImages")
    setIsLoggedIn(false)
    setUserFirstName("")
    router.push("/login")
  }
  return (
    <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
      <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
        <MoreHorizontal className="w-5 h-5" />
        <span className="text-sm font-medium">Filters</span>
      </button>

      <Link href="/" className="text-2xl font-bold text-yellow-400 hover:text-yellow-500 transition-colors">
        bumble
      </Link>

      {showLoginButton && !isLoggedIn ? (
        <Link href="/login">
          <button className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 transition-colors">
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">Login</span>
          </button>
        </Link>
      ) : isLoggedIn ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            Hello, {userFirstName || "User"}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      ) : (
        <div className="w-20"></div>
      )}
    </div>
  )
}
