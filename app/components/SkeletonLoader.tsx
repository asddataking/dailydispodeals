'use client'

interface SkeletonLoaderProps {
  variant?: 'text' | 'card' | 'table' | 'video' | 'stats' | 'review' | 'custom'
  lines?: number
  className?: string
  width?: string
  height?: string
  count?: number
}

export function SkeletonLoader({
  variant = 'text',
  lines = 1,
  className = '',
  width,
  height,
  count = 1,
}: SkeletonLoaderProps) {
  const shimmer = 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] rounded'

  const baseClasses = `${shimmer} skeleton-shimmer`

  if (variant === 'text') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${className}`}
            style={{
              width: width || '100%',
              height: height || '1rem',
              marginBottom: i < count - 1 ? '0.5rem' : '0',
            }}
          />
        ))}
      </>
    )
  }

  if (variant === 'card') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`bg-white rounded-xl overflow-hidden shadow-lg border border-lake-blue-100 ${className}`}
          >
            <div className={`${baseClasses} h-48 sm:h-64 bg-lake-blue-100`} />
            <div className="p-4 sm:p-6 space-y-3">
              <div className={`${baseClasses} h-4 bg-gray-200 rounded w-24`} />
              <div className={`${baseClasses} h-5 bg-gray-200 rounded w-3/4`} />
              <div className={`${baseClasses} h-4 bg-gray-200 rounded w-full`} />
              <div className={`${baseClasses} h-10 bg-gray-200 rounded w-32`} />
            </div>
          </div>
        ))}
      </>
    )
  }

  if (variant === 'video') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl overflow-hidden shadow-lg border border-lake-blue-100"
          >
            <div className={`${baseClasses} h-48 sm:h-64 bg-lake-blue-100`} />
            <div className="p-4 sm:p-6 space-y-3">
              <div className={`${baseClasses} h-4 bg-gray-200 rounded w-24`} />
              <div className={`${baseClasses} h-5 bg-gray-200 rounded w-3/4`} />
              <div className={`${baseClasses} h-4 bg-gray-200 rounded w-full`} />
              <div className={`${baseClasses} h-10 bg-gray-200 rounded w-32`} />
            </div>
          </div>
        ))}
      </>
    )
  }

  if (variant === 'stats') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className={`${baseClasses} h-8 bg-gray-200 rounded w-32`} />
          <div className={`${baseClasses} h-10 bg-gray-200 rounded w-40`} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className={`${baseClasses} h-4 bg-gray-200 rounded w-24 mb-2`} />
              <div className={`${baseClasses} h-8 bg-gray-200 rounded w-16`} />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className={`${baseClasses} h-6 bg-gray-200 rounded w-40 mb-4`} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className={`${baseClasses} h-4 bg-gray-200 rounded w-20`} />
                <div className={`${baseClasses} h-4 bg-gray-200 rounded w-8`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'review') {
    return (
      <div className="space-y-4">
        <div className={`${baseClasses} h-8 bg-gray-200 rounded w-48 mb-4`} />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className={`${baseClasses} h-6 bg-gray-200 rounded w-3/4 mb-2`} />
                <div className={`${baseClasses} h-4 bg-gray-200 rounded w-1/2`} />
              </div>
              <div className={`${baseClasses} h-6 bg-gray-200 rounded w-20`} />
            </div>
            <div className="space-y-2 mb-4">
              <div className={`${baseClasses} h-4 bg-gray-200 rounded w-full`} />
              <div className={`${baseClasses} h-4 bg-gray-200 rounded w-2/3`} />
              <div className={`${baseClasses} h-4 bg-gray-200 rounded w-1/2`} />
            </div>
            <div className="flex gap-2">
              <div className={`${baseClasses} h-10 bg-gray-200 rounded w-24`} />
              <div className={`${baseClasses} h-10 bg-gray-200 rounded w-24`} />
              <div className={`${baseClasses} h-10 bg-gray-200 rounded w-32`} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className={`${baseClasses} h-6 bg-gray-200 rounded w-32`} />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {Array.from({ length: 5 }).map((_, i) => (
                  <th key={i} className="px-6 py-3">
                    <div className={`${baseClasses} h-4 bg-gray-200 rounded w-20`} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from({ length: count }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {Array.from({ length: 5 }).map((_, colIdx) => (
                    <td key={colIdx} className="px-6 py-4">
                      <div className={`${baseClasses} h-4 bg-gray-200 rounded w-24`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (variant === 'custom') {
    return (
      <div
        className={`${baseClasses} ${className}`}
        style={{
          width: width || '100%',
          height: height || '1rem',
        }}
      />
    )
  }

  return null
}
