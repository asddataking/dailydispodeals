'use client'

import { useState, useEffect } from 'react'
import { useAdminAuth, getAuthHeaders } from '@/lib/hooks/useAdminAuth'
import { SkeletonLoader } from '@/app/components/SkeletonLoader'

interface EmailLog {
  id: string
  user_id: string
  date: string
  sent_at: string
  status: 'sent' | 'failed'
  error: string | null
}

interface IngestionLog {
  dispensary_name: string
  date: string
  file_path: string
  source_url: string
  deals_extracted: number
  processed_at: string | null
  created_at: string
}

export function LogsViewer() {
  const [type, setType] = useState<'email' | 'ingestion' | 'all'>('all')
  const [days, setDays] = useState(7)
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [ingestionLogs, setIngestionLogs] = useState<IngestionLog[]>([])
  const [ingestionError, setIngestionError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { token } = useAdminAuth()

  useEffect(() => {
    if (token !== null) {
      fetchLogs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, days, token])

  const fetchLogs = async () => {
    setLoading(true)
    setError('')
    setIngestionError('')
    try {
      const { apiFetch, getErrorMessage, isErrorResponse, unwrapApiResponse } = await import('@/lib/api-client')
      const response = await apiFetch<{ email_logs: EmailLog[]; ingestion_logs: IngestionLog[]; ingestion_error?: string }>(`/api/admin/logs?type=${type}&days=${days}`, {
        headers: getAuthHeaders(token),
      })
      
      if (isErrorResponse(response)) {
        throw new Error(getErrorMessage(response))
      }
      
      const data = unwrapApiResponse(response)
      setEmailLogs(data.email_logs || [])
      setIngestionLogs(data.ingestion_logs || [])
      setIngestionError(data.ingestion_error || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <SkeletonLoader variant="text" width="100px" height="32px" />
          <div className="flex gap-4">
            <SkeletonLoader variant="text" width="120px" height="40px" />
            <SkeletonLoader variant="text" width="120px" height="40px" />
          </div>
        </div>
        <SkeletonLoader variant="table" count={5} />
      </div>
    )
  }

  if (error) {
    return <div className="text-red-600">{error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Logs</h2>
        <div className="flex gap-4">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'email' | 'ingestion' | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Logs</option>
            <option value="email">Email Logs</option>
            <option value="ingestion">Ingestion Logs</option>
          </select>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {(type === 'email' || type === 'all') && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Email Logs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {emailLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No email logs found
                    </td>
                  </tr>
                ) : (
                  emailLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(log.sent_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            log.status === 'sent'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{log.error || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(type === 'ingestion' || type === 'all') && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Ingestion Logs</h3>
            {ingestionError && (
              <p className="mt-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-md">
                Ingestion logs could not be loaded: {ingestionError}
              </p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dispensary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deals Extracted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Processed At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ingestionLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No ingestion logs found
                    </td>
                  </tr>
                ) : (
                  ingestionLogs.map((log, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.dispensary_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.deals_extracted || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {log.processed_at ? new Date(log.processed_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {log.source_url ? (
                          <a
                            href={log.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lake-blue-600 hover:underline"
                          >
                            View →
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
