/**
 * Authenticated fetch wrapper that handles session expiration
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    const headers = {
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    const response = await fetch(url, { ...options, headers });

    // Handle session termination/expiration
    if (response.status === 401) {
        // Check if we're in a browser environment
        if (typeof window !== 'undefined') {
            // Clear token and redirect to login
            localStorage.removeItem('auth_token');
            localStorage.removeItem('admin_token');

            // Only redirect if not already on login page
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login?sessionExpired=true';
            }
        }
    }

    return response;
}

/**
 * Get API base URL
 */
export const getApiUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};
