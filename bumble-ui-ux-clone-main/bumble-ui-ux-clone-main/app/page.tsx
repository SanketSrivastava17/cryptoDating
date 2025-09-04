"use client"

import { Heart, X, Star, ArrowLeft, Check, MoreHorizontal } from "lucide-react"
import Header from "../components/Header"
import ChatInterface from "../components/ChatInterface"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authUtils } from "@/lib/auth"

interface Profile {
  id: number;
  user_id: number;
  name: string;
  age?: number;
  bio?: string;
  interests?: string[];
  photos?: string[];
  location?: string;
  gender?: 'male' | 'female' | 'other';
  looking_for?: 'male' | 'female' | 'both';
}

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  message_type: 'text' | 'image' | 'sticker';
  created_at: string;
  is_read: boolean;
}

interface Conversation {
  id: number;
  match_id: number;
  participants: number[];
  otherUser: {
    id: number;
    name: string;
    photos?: string[];
  };
  lastMessage?: Message;
  last_message_at?: string;
}

interface MatchQueueItem {
  id: number;
  user1_id: number;
  user2_id: number;
  created_at: string;
  is_active: boolean;
  otherUser: {
    id: number;
    name: string;
    photos?: string[];
  };
  status: 'no_conversation' | 'no_messages';
}

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0)
  const [isSwipeLoading, setIsSwipeLoading] = useState(false)
  const [matchModal, setMatchModal] = useState<{ show: boolean; profile?: Profile }>({ show: false })
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [matchQueue, setMatchQueue] = useState<MatchQueueItem[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)
  const router = useRouter()

  // Fetch profiles for swiping
  const fetchProfiles = async () => {
    try {
      const session = authUtils.getCurrentSession()
      if (!session) return
      
      const response = await fetch(`/api/discover?userId=${session.userId}`)
      const data = await response.json()
      
      if (data.success && data.profiles) {
        setProfiles(data.profiles)
        setCurrentProfileIndex(0)
      }
    } catch (error) {
      console.error('Error fetching profiles:', error)
    }
  }

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const session = authUtils.getCurrentSession()
      if (!session) return
      
      const response = await fetch(`/api/conversations?userId=${session.userId}`)
      const data = await response.json()
      
      if (data.conversations) {
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    }
  }

  // Fetch match queue
  const fetchMatchQueue = async () => {
    try {
      const session = authUtils.getCurrentSession()
      if (!session) return
      
      const response = await fetch(`/api/match-queue?userId=${session.userId}`)
      const data = await response.json()
      
      if (data.success && data.matchQueue) {
        setMatchQueue(data.matchQueue)
      }
    } catch (error) {
      console.error('Error fetching match queue:', error)
    }
  }

  // Fetch current user profile
  const fetchCurrentUserProfile = async () => {
    try {
      const session = authUtils.getCurrentSession()
      if (!session) return
      
      const response = await fetch(`/api/users?id=${session.userId}`)
      const data = await response.json()
      
      if (data.profile) {
        setCurrentUserProfile(data.profile)
      }
    } catch (error) {
      console.error('Error fetching current user profile:', error)
    }
  }

  // Handle swipe actions
  const handleSwipeAction = async (actionType: 'like' | 'pass' | 'super_like') => {
    if (isSwipeLoading || currentProfileIndex >= profiles.length) return
    
    const currentProfile = profiles[currentProfileIndex]
    const session = authUtils.getCurrentSession()
    if (!session || !currentProfile) return
    
    setIsSwipeLoading(true)
    
    try {
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'swipe',
          userId: session.userId,
          targetUserId: currentProfile.user_id,
          actionType
        })
      })
      
      const data = await response.json()
      
      if (data.success && data.isMatch && actionType !== 'pass') {
        // Show match modal
        setMatchModal({ show: true, profile: currentProfile })
        // Refresh conversations and match queue to show new match
        fetchConversations()
        fetchMatchQueue()
      }
      
      // Move to next profile
      setCurrentProfileIndex(prev => prev + 1)
      
    } catch (error) {
      console.error('Error handling swipe:', error)
    } finally {
      setIsSwipeLoading(false)
    }
  }

  // Close match modal
  const closeMatchModal = () => {
    setMatchModal({ show: false })
  }

  // Handle conversation selection
  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
  }

  // Start new conversation from match modal
  const startConversation = async (profile: Profile) => {
    try {
      const session = authUtils.getCurrentSession()
      if (!session) return
      
      // Find the match for this profile by getting all matches and finding the one with this user
      const matchesResponse = await fetch(`/api/matches?userId=${session.userId}`)
      const matchesData = await matchesResponse.json()
      
      // Find the match between current user and the profile user
      const match = matchesData.matches?.find((m: any) => 
        (m.user1_id === session.userId && m.user2_id === profile.user_id) ||
        (m.user2_id === session.userId && m.user1_id === profile.user_id)
      )
      
      if (!match) {
        console.error('No match found for this profile')
        return
      }
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.userId,
          matchId: match.id, // Now using the correct match ID
          content: `Hey ${profile.name}! 👋`
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        closeMatchModal()
        fetchConversations() // Refresh conversations
        fetchMatchQueue() // Refresh match queue to remove this match
        
        // Find and select the new conversation
        setTimeout(() => {
          const newConv = conversations.find(c => c.otherUser.id === profile.user_id)
          if (newConv) {
            setSelectedConversation(newConv)
          }
        }, 500)
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
    }
  }

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      if (typeof window !== 'undefined') {
        // Clear any conflicting localStorage state first
        const isLoggedIn = localStorage.getItem("isLoggedIn");
        const userId = localStorage.getItem("userId");
        
        console.log("Auth check - isLoggedIn:", isLoggedIn, "userId:", userId);
        
        // If we have conflicting state (logged in but no userId), clear everything
        if (isLoggedIn === "true" && !userId) {
          console.log("Conflicting auth state detected, clearing localStorage");
          authUtils.clearUserSession();
          setIsAuthenticated(false);
          setIsLoading(false);
          router.push("/login");
          return;
        }
        
        const session = authUtils.getCurrentSession();
        console.log("Current session from authUtils:", session);
        
        if (!session) {
          console.log("No valid session found, redirecting to login");
          setIsAuthenticated(false);
          setIsLoading(false);
          router.push("/login");
          return;
        }

        // Validate session with database
        const isValidSession = await authUtils.validateSession(session.userId);
        if (!isValidSession) {
          console.log("Session validation failed, clearing session and redirecting");
          authUtils.clearUserSession();
          setIsAuthenticated(false);
          setIsLoading(false);
          router.push("/login");
          return;
        }
        
        console.log("Session validated successfully");
        setIsAuthenticated(true);
        setCurrentUserId(session.userId);
        setIsLoading(false);
        
        // Fetch profiles for swiping and conversations
        fetchProfiles();
        fetchConversations();
        fetchMatchQueue();
        fetchCurrentUserProfile();
        
        // Check verification and profile status from localStorage
        const userGender = localStorage.getItem("userGender");
        const faceVerified = localStorage.getItem("faceVerified") === "true";
        const maleVerified = localStorage.getItem("maleVerified") === "true";
        const walletConnected = localStorage.getItem("walletConnected") === "true";
        const profileCompleted = localStorage.getItem("profileCompleted") === "true";
        
        // If no gender is set, redirect back to login (incomplete registration)
        if (!userGender) {
          console.log("No gender set, clearing session and redirecting to login");
          authUtils.clearUserSession();
          router.push("/login");
          return;
        }
        
        // Check if female user needs face verification
        if (userGender === "female" && !faceVerified) {
          console.log("Female user needs face verification");
          router.push("/face-verification");
          return;
        }
        
        // Check if male user needs wallet connection
        if (userGender === "male" && (!maleVerified || !walletConnected)) {
          console.log("Male user needs wallet connection");
          router.push("/wallet-connection");
          return;
        }
        
        // Check if user needs to complete profile
        if (!profileCompleted) {
          router.push("/create-profile")
          return
        }
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-400 mb-4">bumble</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect to login
  }
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* User Profile Header */}
        <div className="p-4 border-b border-gray-200">
          <button 
            onClick={() => router.push('/profile')}
            className="flex items-center gap-3 w-full hover:bg-gray-50 rounded-lg p-2 transition-colors"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-300 flex items-center justify-center">
              {currentUserProfile?.photos?.[0] ? (
                <img
                  src={currentUserProfile.photos[0]}
                  alt={currentUserProfile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold text-lg">
                  {currentUserProfile?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {currentUserProfile?.name || 'User'}
            </div>
          </button>
        </div>

        {/* Match Queue Section */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Your matches ({matchQueue.length})</h3>
          {matchQueue.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {matchQueue.map((match) => (
                <div 
                  key={match.id}
                  onClick={async () => {
                    // Start conversation with this match
                    try {
                      const session = authUtils.getCurrentSession()
                      if (!session) return
                      
                      const response = await fetch('/api/conversations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId: session.userId,
                          matchId: match.id,
                          content: `Hey ${match.otherUser.name}! 👋`
                        })
                      })
                      
                      if (response.ok) {
                        const data = await response.json()
                        fetchConversations() // Refresh conversations
                        fetchMatchQueue() // Refresh match queue
                        
                        // Find and select the new conversation
                        setTimeout(() => {
                          const newConv = conversations.find(c => c.otherUser.id === match.otherUser.id)
                          if (newConv) {
                            setSelectedConversation(newConv)
                          }
                        }, 500)
                      }
                    } catch (error) {
                      console.error('Error starting conversation from match queue:', error)
                    }
                  }}
                  className="flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-yellow-400 bg-white">
                      {match.otherUser.photos?.[0] ? (
                        <img
                          src={match.otherUser.photos[0]}
                          alt={match.otherUser.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
                          {match.otherUser.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-center mt-1 text-gray-600 w-16 truncate">
                    {match.otherUser.name}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <div className="w-8 h-8 bg-gray-400 rounded-full"></div>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                <strong>No new matches yet</strong>
              </p>
              <p className="text-xs text-gray-500">Keep swiping to find matches!</p>
            </div>
          )}
        </div>

        {/* Conversations Section */}
        <div className="flex-1 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Conversations</h3>
            <span className="text-sm text-gray-500">(Recent)</span>
          </div>

          <div className="space-y-3">
            {conversations.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Start swiping to find matches!</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div 
                  key={conversation.id}
                  onClick={() => selectConversation(conversation)}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer relative"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400">
                    {conversation.otherUser.photos?.[0] ? (
                      <img
                        src={conversation.otherUser.photos[0]}
                        alt={conversation.otherUser.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                        {conversation.otherUser.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{conversation.otherUser.name}</div>
                    <div className="text-sm text-gray-500 truncate">
                      {conversation.lastMessage?.content || "Start the conversation!"}
                    </div>
                  </div>
                  {conversation.lastMessage && conversation.lastMessage.sender_id !== currentUserId && (
                    <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-medium">
                      New
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation && currentUserId ? (
          /* Chat Interface */
          <ChatInterface 
            conversation={selectedConversation}
            currentUserId={currentUserId}
            onBack={() => setSelectedConversation(null)}
          />
        ) : (
          <>
            {/* Top Header */}
            <Header />

            {/* Card Area */}
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="relative">
                {profiles.length > 0 && currentProfileIndex < profiles.length ? (
              /* Profile Card */
              <div className="w-96 h-[600px] bg-white rounded-2xl shadow-2xl overflow-hidden relative">
                {/* Profile Image */}
                <div className="h-4/5 bg-gradient-to-br from-blue-200 via-green-200 to-yellow-200 relative">
                  {profiles[currentProfileIndex].photos && profiles[currentProfileIndex].photos!.length > 0 ? (
                    <img 
                      src={profiles[currentProfileIndex].photos![0]} 
                      alt="Profile" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-6xl font-bold">
                      {profiles[currentProfileIndex].name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}

                  {/* Expand Icon */}
                  <button className="absolute top-4 right-4 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-4-4m4 4v-4m0 4h-4"
                      />
                    </svg>
                  </button>

                  {/* Profile info overlay */}
                  {profiles[currentProfileIndex].bio && (
                    <div className="absolute bottom-4 left-4 right-4 bg-black/50 text-white p-3 rounded-lg">
                      <p className="text-sm">{profiles[currentProfileIndex].bio}</p>
                      {profiles[currentProfileIndex].interests && profiles[currentProfileIndex].interests!.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {profiles[currentProfileIndex].interests!.slice(0, 3).map((interest, idx) => (
                            <span key={idx} className="bg-white/20 px-2 py-1 rounded-full text-xs">
                              {interest}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Profile Info */}
                <div className="h-1/5 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {profiles[currentProfileIndex].name}
                      {profiles[currentProfileIndex].age && `, ${profiles[currentProfileIndex].age}`}
                    </h2>
                    <div className="flex items-center gap-1 bg-blue-500 text-white px-2 py-1 rounded-full text-xs">
                      <Check className="w-3 h-3" />
                      <span>Verified</span>
                    </div>
                  </div>
                  <button className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                    <MoreHorizontal className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            ) : (
              /* No more profiles card */
              <div className="w-96 h-[600px] bg-white rounded-2xl shadow-2xl overflow-hidden relative flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all caught up!</h2>
                  <p className="text-gray-600 mb-4">Check back later for new profiles, or try expanding your search preferences.</p>
                  <button 
                    onClick={fetchProfiles}
                    className="bg-yellow-400 text-black px-6 py-2 rounded-full font-medium hover:bg-yellow-500 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
              <button 
                onClick={() => setCurrentProfileIndex(Math.max(0, currentProfileIndex - 1))}
                disabled={currentProfileIndex === 0 || isSwipeLoading}
                className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>

              <button 
                onClick={() => handleSwipeAction('pass')}
                disabled={currentProfileIndex >= profiles.length || isSwipeLoading}
                className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>

              <button 
                onClick={() => handleSwipeAction('super_like')}
                disabled={currentProfileIndex >= profiles.length || isSwipeLoading}
                className="w-16 h-16 bg-yellow-400 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Star className="w-7 h-7 text-white fill-current" />
              </button>

              <button 
                onClick={() => handleSwipeAction('like')}
                disabled={currentProfileIndex >= profiles.length || isSwipeLoading}
                className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Heart className="w-6 h-6 text-green-500 fill-current" />
              </button>

              <button 
                onClick={() => handleSwipeAction('like')}
                disabled={currentProfileIndex >= profiles.length || isSwipeLoading}
                className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Block and Report */}
            <button className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 hover:text-gray-700">
              🚫 Block and report
            </button>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Right Sidebar - Feedback */}
      <div className="w-12 bg-white border-l border-gray-200 flex flex-col items-center justify-center">
        <button className="transform -rotate-90 text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap">
          Feedback
        </button>
      </div>

      {/* Match Modal */}
      {matchModal.show && matchModal.profile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">It's a Match!</h2>
            <p className="text-gray-600 mb-6">
              You and {matchModal.profile.name} liked each other
            </p>
            <div className="flex gap-3">
              <button 
                onClick={closeMatchModal}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-full font-medium hover:bg-gray-300 transition-colors"
              >
                Keep Swiping
              </button>
              <button 
                onClick={() => startConversation(matchModal.profile!)}
                className="flex-1 bg-yellow-400 text-black py-3 px-4 rounded-full font-medium hover:bg-yellow-500 transition-colors"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
