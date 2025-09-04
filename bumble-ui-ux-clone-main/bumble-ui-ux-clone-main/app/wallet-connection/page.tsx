"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Wallet, AlertCircle, CheckCircle, ExternalLink, Loader2 } from "lucide-react"
import detectEthereumProvider from '@metamask/detect-provider'
import { ethers } from 'ethers'
import { authUtils } from "@/lib/auth"

// Fix TypeScript types for MetaMask provider
interface MetaMaskProvider extends ethers.Eip1193Provider {
  isMetaMask: boolean
  request: (args: { method: string; params?: any[] }) => Promise<any>
}

interface WalletState {
  isConnected: boolean
  address: string | null
  balance: string | null
  balanceUSD: string | null
  error: string | null
  isLoading: boolean
}

export default function WalletConnectionPage() {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: null,
    balanceUSD: null,
    error: null,
    isLoading: false
  })
  const [ethPrice, setEthPrice] = useState<number>(0)
  const router = useRouter()

  // Function to save user data to database
  const saveUserToDatabase = async (walletAddress: string, ethBalance: string) => {
    try {
      // Get current user session
      const session = authUtils.getCurrentSession();
      if (!session || !session.userId) {
        console.error('No valid session found for wallet verification');
        return;
      }

      const userId = session.userId;

      // Update existing user with wallet information
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateWalletInfo',
          id: userId,
          wallet_address: walletAddress,
          verification_status: 'verified'
        })
      });

      // Save wallet verification data
      await fetch('/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createWalletVerification',
          user_id: userId,
          wallet_address: walletAddress,
          eth_balance: ethBalance,
          verification_data: {
            timestamp: new Date().toISOString(),
            eth_price_usd: ethPrice
          }
        })
      });

      console.log('Wallet verification data saved successfully');
    } catch (error) {
      console.error('Error saving wallet verification data:', error);
      // Don't throw error here to avoid disrupting the wallet connection flow
    }
  }

  useEffect(() => {
    // Check if user has selected male gender
    const userGender = localStorage.getItem("userGender")
    if (userGender !== "male") {
      router.push("/login")
      return
    }

    // For wallet verification flow, always start fresh - don't auto-connect
    // Clear any existing wallet connection to force fresh permission request
    localStorage.removeItem("walletConnected")
    localStorage.removeItem("walletAddress")
    
    // Reset wallet state to ensure clean start
    setWalletState({
      isConnected: false,
      address: null,
      balance: null,
      balanceUSD: null,
      error: null,
      isLoading: false
    })
    
    // Force disconnect any existing MetaMask connection for fresh start
    disconnectWallet()
    
    // Fetch current ETH price
    fetchEthPrice()
  }, [router])

  const fetchEthPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
      const data = await response.json()
      setEthPrice(data.ethereum.usd)
    } catch (error) {
      console.error('Error fetching ETH price:', error)
      setEthPrice(2000) // Fallback price
    }
  }

  const connectWallet = async () => {
    setWalletState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Check if MetaMask is installed
      const provider = await detectEthereumProvider() as MetaMaskProvider
      
      if (!provider) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.')
      }

      if (!provider.isMetaMask) {
        throw new Error('Please use MetaMask wallet')
      }

      console.log('Requesting account access from MetaMask...')
      
      // ALWAYS request account access - this should show the permission popup
      // Use eth_requestAccounts which forces user interaction
      const accounts = await provider.request({
        method: 'eth_requestAccounts'
      })

      console.log('MetaMask returned accounts:', accounts)

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please check your MetaMask.')
      }

      const address = accounts[0]
      
      // Get wallet balance
      const ethersProvider = new ethers.BrowserProvider(provider as ethers.Eip1193Provider)
      const balance = await ethersProvider.getBalance(address)
      const balanceInEth = ethers.formatEther(balance)
      const balanceUSD = (parseFloat(balanceInEth) * ethPrice).toFixed(2)

      setWalletState({
        isConnected: true,
        address,
        balance: balanceInEth,
        balanceUSD,
        error: null,
        isLoading: false
      })

      // Store wallet connection status
      localStorage.setItem("walletConnected", "true")
      localStorage.setItem("walletAddress", address)

      // Save user and wallet verification data to database
      await saveUserToDatabase(address, balanceInEth)

    } catch (error: any) {
      console.error('Wallet connection error:', error)
      
      // Check if user rejected the request
      if (error.code === 4001) {
        setWalletState(prev => ({
          ...prev,
          error: 'Connection request was rejected. Please try again and approve the connection.',
          isLoading: false
        }))
      } else {
        setWalletState(prev => ({
          ...prev,
          error: error.message || 'Failed to connect wallet',
          isLoading: false
        }))
      }
    }
  }

  const disconnectWallet = () => {
    setWalletState({
      isConnected: false,
      address: null,
      balance: null,
      balanceUSD: null,
      error: null,
      isLoading: false
    })
    localStorage.removeItem("walletConnected")
    localStorage.removeItem("walletAddress")
  }

  const openMetaMaskInstall = () => {
    window.open('https://metamask.io/download/', '_blank')
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const proceedToApp = () => {
    localStorage.setItem("maleVerified", "true")
    router.push("/create-profile")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
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
            <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h1>
            <p className="text-gray-600 text-sm">
              Connect your MetaMask wallet to verify your identity and access the platform
            </p>
          </div>

          {/* Debug Section - Remove in production */}
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="text-sm font-medium text-yellow-900 mb-2">Debug Info:</h3>
            <p className="text-xs text-yellow-700">
              Wallet Connected: {walletState.isConnected ? 'Yes' : 'No'}<br/>
              localStorage walletConnected: {typeof window !== 'undefined' ? localStorage.getItem("walletConnected") : 'N/A'}<br/>
              If MetaMask doesn't ask for permission, try disconnecting this site from MetaMask settings first.
            </p>
            <button
              onClick={async () => {
                try {
                  const provider = await detectEthereumProvider() as MetaMaskProvider
                  if (provider) {
                    console.log('Attempting to check MetaMask permissions...')
                    const permissions = await provider.request({
                      method: 'wallet_getPermissions'
                    })
                    console.log('Current permissions:', permissions)
                  }
                } catch (error) {
                  console.log('Error checking permissions:', error)
                }
              }}
              className="mt-2 text-xs text-yellow-600 hover:text-yellow-800 underline"
            >
              Check MetaMask Permissions (Console)
            </button>
          </div>

          {/* Wallet Connection Status */}
          {!walletState.isConnected && !walletState.error && (
            <div className="mb-6">
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Wallet className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-900 mb-1">Why connect your wallet?</h3>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Verify your identity on the blockchain</li>
                      <li>• Enable secure transactions</li>
                      <li>• Access premium features</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {walletState.error && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-900 mb-1">Connection Failed</h3>
                  <p className="text-sm text-red-700">{walletState.error}</p>
                  {walletState.error.includes('MetaMask is not installed') && (
                    <button
                      onClick={openMetaMaskInstall}
                      className="mt-2 text-sm text-red-600 hover:text-red-800 underline flex items-center gap-1"
                    >
                      Install MetaMask <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Wallet Details */}
          {walletState.isConnected && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-green-900 mb-1">Wallet Connected Successfully!</h3>
                  <p className="text-sm text-green-700">Your MetaMask wallet is now connected</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Wallet Address</div>
                  <div className="text-sm font-mono text-gray-900">{formatAddress(walletState.address!)}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">ETH Balance</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {parseFloat(walletState.balance!).toFixed(4)} ETH
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">USD Value</div>
                    <div className="text-sm font-semibold text-green-600">
                      ${walletState.balanceUSD}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Current ETH Price</div>
                  <div className="text-sm font-medium text-gray-900">
                    ${ethPrice.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!walletState.isConnected ? (
              <button
                onClick={connectWallet}
                disabled={walletState.isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {walletState.isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5" />
                    Connect MetaMask
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={proceedToApp}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 transition-all"
                >
                  Proceed to App
                </button>
                
                <button
                  onClick={disconnectWallet}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all"
                >
                  Disconnect Wallet
                </button>
              </div>
            )}
          </div>

          {/* MetaMask Info */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2">
                Don't have MetaMask?
              </p>
              <button
                onClick={openMetaMaskInstall}
                className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center justify-center gap-1"
              >
                Download MetaMask <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
