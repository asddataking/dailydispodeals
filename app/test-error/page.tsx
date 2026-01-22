'use client'

import { useState } from 'react'
import { ErrorBoundary } from '../components/ErrorBoundary'

/**
 * Test component that throws an error when button is clicked
 */
function ErrorThrower({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error: This is a simulated error for testing ErrorBoundary!')
  }
  return <div className="text-green-600 font-semibold">✓ Component rendered successfully</div>
}

/**
 * Test component that throws async error
 */
function AsyncErrorThrower() {
  const [hasError, setHasError] = useState(false)

  const triggerAsyncError = async () => {
    // Simulate async operation that fails
    await new Promise(resolve => setTimeout(resolve, 100))
    setHasError(true)
  }

  if (hasError) {
    throw new Error('Test async error: This error was triggered asynchronously!')
  }

  return (
    <button
      onClick={triggerAsyncError}
      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
    >
      Trigger Async Error
    </button>
  )
}

/**
 * Test page for ErrorBoundary
 * 
 * This page demonstrates different error scenarios:
 * 1. Synchronous error on render
 * 2. Error triggered by user interaction
 * 3. Async error
 */
export default function TestErrorPage() {
  const [throwError, setThrowError] = useState(false)
  const [renderErrorComponent, setRenderErrorComponent] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">ErrorBoundary Test Page</h1>
        
        <div className="space-y-8">
          {/* Test 1: Error in wrapped component */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test 1: Component Error (Wrapped in ErrorBoundary)</h2>
            <p className="text-gray-600 mb-4">
              This component is wrapped in its own ErrorBoundary. Click the button to trigger an error.
            </p>
            <ErrorBoundary>
              <div className="space-y-4">
                <button
                  onClick={() => setThrowError(true)}
                  disabled={throwError}
                  className="bg-lake-blue-700 text-white px-4 py-2 rounded-lg hover:bg-lake-blue-800 transition disabled:opacity-50"
                >
                  Trigger Error in Component
                </button>
                <ErrorThrower shouldThrow={throwError} />
              </div>
            </ErrorBoundary>
          </div>

          {/* Test 2: Error on initial render */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test 2: Error on Initial Render</h2>
            <p className="text-gray-600 mb-4">
              This component will throw an error immediately when rendered.
            </p>
            <button
              onClick={() => setRenderErrorComponent(true)}
              disabled={renderErrorComponent}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50 mb-4"
            >
              Render Error Component
            </button>
            {renderErrorComponent && (
              <ErrorBoundary>
                <ErrorThrower shouldThrow={true} />
              </ErrorBoundary>
            )}
          </div>

          {/* Test 3: Async error */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test 3: Async Error</h2>
            <p className="text-gray-600 mb-4">
              This component throws an error after an async operation completes.
            </p>
            <ErrorBoundary>
              <AsyncErrorThrower />
            </ErrorBoundary>
          </div>

          {/* Test 4: Nested ErrorBoundaries */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test 4: Nested ErrorBoundaries</h2>
            <p className="text-gray-600 mb-4">
              This demonstrates nested ErrorBoundaries - the inner one catches the error, preventing it from bubbling up.
            </p>
            <ErrorBoundary>
              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="mb-2 text-sm text-gray-700">Outer ErrorBoundary</p>
                <ErrorBoundary>
                  <div className="p-4 bg-gray-200 rounded-lg">
                    <p className="mb-2 text-sm text-gray-700">Inner ErrorBoundary</p>
                    <button
                      onClick={() => {
                        throw new Error('Error caught by inner ErrorBoundary!')
                      }}
                      className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
                    >
                      Trigger Error (Caught by Inner)
                    </button>
                  </div>
                </ErrorBoundary>
              </div>
            </ErrorBoundary>
          </div>

          {/* Info section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">About ErrorBoundaries</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• ErrorBoundaries catch errors in React component trees</li>
              <li>• They do NOT catch errors in event handlers, async code, or during SSR</li>
              <li>• Each ErrorBoundary only catches errors in its children</li>
              <li>• Errors are logged to console in development mode</li>
              <li>• If Sentry is configured, errors will be automatically reported</li>
            </ul>
          </div>

          {/* Navigation */}
          <div className="text-center">
            <a
              href="/"
              className="text-lake-blue-700 hover:text-lake-blue-800 underline"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
