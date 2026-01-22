import { NextResponse } from 'next/server'

/**
 * Standardized API response types
 */
export type ApiSuccessResponse<T = unknown> = {
  success: true
  data: T
  message?: string
}

export type ApiErrorResponse = {
  success: false
  error: string
  code?: string
  details?: unknown
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Create a successful API response
 */
export function success<T = unknown>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status }
  )
}

/**
 * Create an error API response
 */
export function error(
  message: string,
  status: number = 500,
  code?: string,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(code && { code }),
      ...(details && { details }),
    },
    { status }
  )
}

/**
 * Create a validation error response (400)
 */
export function validationError(
  message: string = 'Invalid input',
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return error(message, 400, 'VALIDATION_ERROR', details)
}

/**
 * Create an unauthorized error response (401)
 */
export function unauthorized(
  message: string = 'Unauthorized'
): NextResponse<ApiErrorResponse> {
  return error(message, 401, 'UNAUTHORIZED')
}

/**
 * Create a forbidden error response (403)
 */
export function forbidden(
  message: string = 'Forbidden'
): NextResponse<ApiErrorResponse> {
  return error(message, 403, 'FORBIDDEN')
}

/**
 * Create a not found error response (404)
 */
export function notFound(
  message: string = 'Resource not found'
): NextResponse<ApiErrorResponse> {
  return error(message, 404, 'NOT_FOUND')
}

/**
 * Create an internal server error response (500)
 */
export function serverError(
  message: string = 'Internal server error',
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return error(message, 500, 'INTERNAL_ERROR', details)
}

/**
 * Create a rate limit error response (429)
 */
export function rateLimitError(
  message: string = 'Too many requests'
): NextResponse<ApiErrorResponse> {
  return error(message, 429, 'RATE_LIMIT_EXCEEDED')
}

/**
 * Helper to handle API route errors consistently
 */
export function handleApiError(err: unknown): NextResponse<ApiErrorResponse> {
  if (err instanceof Error) {
    // Log error for debugging
    console.error('API Error:', err.message, err.stack)
    return serverError(err.message)
  }

  console.error('Unknown API Error:', err)
  return serverError('An unexpected error occurred')
}
