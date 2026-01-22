'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ErrorBoundary } from '@/app/components/ErrorBoundary'
import { StatsDashboard } from '@/app/components/admin/StatsDashboard'
import { DealReviewPanel } from '@/app/components/admin/DealReviewPanel'
import { DispensaryManager } from '@/app/components/admin/DispensaryManager'
import { LogsViewer } from '@/app/components/admin/LogsViewer'
import { GeminiChat } from '@/app/components/admin/GeminiChat'
import { SkeletonLoader } from '@/app/components/SkeletonLoader'

type Tab = 'overview' | 'deals' | 'dispensaries' | 'logs' | 'chat'

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Check if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user || !user.email) {
          setAuthenticated(false)
          setIsAdmin(false)
          return
        }

        // Check if user is admin
        const checkResponse = await fetch('/api/admin/check-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email }),
        })

        const checkData = await checkResponse.json()
        
        if (checkData.isAdmin) {
          setAuthenticated(true)
          setIsAdmin(true)
          setEmail(user.email)
        } else {
          setAuthenticated(false)
          setIsAdmin(false)
        }
      } catch (err) {
        setAuthenticated(false)
        setIsAdmin(false)
      }
    }
    checkAuth()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // First check if email is admin
      const checkResponse = await fetch('/api/admin/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const checkData = await checkResponse.json()

      if (!checkData.isAdmin) {
        setError('Access denied. This email is not authorized for admin access.')
        setLoading(false)
        return
      }

      // Send magic link using Supabase client (same as preferences modal)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/admin/magic`,
        },
      })

      if (otpError) {
        setError(otpError.message || 'Failed to send magic link')
        setLoading(false)
        return
      }

      setSent(true)
      setLoading(false)
    } catch (err) {
      setError('Failed to send magic link')
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setAuthenticated(false)
      setIsAdmin(false)
      setEmail('')
      setSent(false)
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <SkeletonLoader variant="text" width="150px" height="20px" className="mx-auto mb-4" />
          <SkeletonLoader variant="text" width="200px" height="16px" className="mx-auto" />
        </div>
      </div>
    )
  }

  if (!authenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
          
          {sent ? (
            <div className="space-y-3 text-sm sm:text-base text-gray-700">
              <p>We&apos;ve sent a magic link to:</p>
              <p className="font-semibold break-all">{email}</p>
              <p>Click the link in your email to access the admin dashboard.</p>
              <button
                onClick={() => {
                  setSent(false)
                  setEmail('')
                }}
                className="text-lake-blue-600 hover:text-lake-blue-800 text-sm"
              >
                Use different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lake-blue-500 focus:border-transparent"
                  placeholder="Enter your admin email"
                  required
                  disabled={loading}
                />
              </div>
              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-lake-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-lake-blue-800 transition disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
              {email && (
                <p className="text-xs text-gray-500">{email}</p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview' as Tab, label: 'Overview' },
              { id: 'deals' as Tab, label: 'Deal Review' },
              { id: 'dispensaries' as Tab, label: 'Dispensaries' },
              { id: 'logs' as Tab, label: 'Logs' },
              { id: 'chat' as Tab, label: 'AI Assistant' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-lake-blue-500 text-lake-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorBoundary>
          {activeTab === 'overview' && <StatsDashboard />}
          {activeTab === 'deals' && <DealReviewPanel />}
          {activeTab === 'dispensaries' && <DispensaryManager />}
          {activeTab === 'logs' && <LogsViewer />}
          {activeTab === 'chat' && <GeminiChat />}
        </ErrorBoundary>
      </main>
    </div>
  )
}
