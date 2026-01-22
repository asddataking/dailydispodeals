/**
 * Frontend utility for handling standardized API responses
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
 * Check if a response is a success response
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true
}

/**
 * Check if a response is an error response
 */
export function isErrorResponse(
  response: ApiResponse
): response is ApiErrorResponse {
  return response.success === false
}

/**
 * Extract error message from API response
 */
export function getErrorMessage(response: ApiResponse): string {
  if (isErrorResponse(response)) {
    return response.error
  }
  return 'Unknown error'
}

/**
 * Fetch with standardized error handling
 * Automatically parses JSON and handles the standardized response format
 */
export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    const data = await response.json()

    // If response is not ok, return error response
    if (!response.ok) {
      // Handle both old format (error property) and new format (success: false)
      if (data.success === false) {
        return data as ApiErrorResponse
      }
      // Legacy format support
      return {
        success: false,
        error: data.error || 'Request failed',
        code: data.code,
        details: data.details,
      }
    }

    // Handle both old format (direct data) and new format (success: true, data)
    if (data.success === true) {
      return data as ApiSuccessResponse<T>
    }

    // Legacy format: wrap in success response
    return {
      success: true,
      data: data as T,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      code: 'NETWORK_ERROR',
    }
  }
}

/**
 * Extract data from a successful API response, throwing on error
 */
export function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  if (isErrorResponse(response)) {
    throw new Error(response.error)
  }
  return response.data
}
