'use client'

import { useState, useEffect } from 'react'
import { StatsDashboard } from '@/app/components/admin/StatsDashboard'
import { DealReviewPanel } from '@/app/components/admin/DealReviewPanel'
import { DispensaryManager } from '@/app/components/admin/DispensaryManager'
import { LogsViewer } from '@/app/components/admin/LogsViewer'
import { GeminiChat } from '@/app/components/admin/GeminiChat'

type Tab = 'overview' | 'deals' | 'dispensaries' | 'logs' | 'chat'

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Check if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/auth')
        const data = await res.json()
        setAuthenticated(data.authenticated === true)
      } catch (err) {
        setAuthenticated(false)
      }
    }
    checkAuth()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: apiKey }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Authentication failed')
        return
      }

      setAuthenticated(true)
      setApiKey('')
    } catch (err) {
      setError('Failed to authenticate')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' })
      setAuthenticated(false)
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                Admin API Key
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lake-blue-500 focus:border-transparent"
                placeholder="Enter admin secret"
                required
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            <button
              type="submit"
              className="w-full bg-lake-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-lake-blue-800 transition"
            >
              Login
            </button>
          </form>
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
            <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
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
        {activeTab === 'overview' && <StatsDashboard />}
        {activeTab === 'deals' && <DealReviewPanel />}
        {activeTab === 'dispensaries' && <DispensaryManager />}
        {activeTab === 'logs' && <LogsViewer />}
        {activeTab === 'chat' && <GeminiChat />}
      </main>
    </div>
  )
}
