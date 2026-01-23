/**
 * Authenticated fetch wrapper that handles session expiration
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    const headers: Record<string, string> = {
        ...(options.headers as any),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    const baseUrl = getApiUrl();
    // Support partial URLs
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

    const response = await fetch(fullUrl, { ...options, headers });

    // Handle session termination/expiration
    if (response.status === 401) {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('admin_token');

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

/**
 * Exchange OAuth auth code for JWT token
 */
export async function exchangeAuthCode(code: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
        const res = await fetch(`${getApiUrl()}/auth/exchange-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
            credentials: 'include'
        });

        if (res.ok) {
            const data = await res.json();
            if (data.token) {
                localStorage.setItem('auth_token', data.token);
                document.cookie = `auth_token=${data.token}; path=/`;
                return { success: true, token: data.token };
            }
        }

        return { success: false, error: 'Failed to exchange auth code' };
    } catch (err) {
        console.error('Auth code exchange failed:', err);
        return { success: false, error: (err as Error).message };
    }
}

// API Client Wrapper matching axios-like interface
const api = {
    get: async (url: string, config: any = {}) => {
        const res = await authFetch(url, { ...config, method: 'GET' });
        if (!res.ok && res.status !== 400 && res.status !== 401 && res.status !== 403 && res.status !== 404 && res.status !== 409 && res.status !== 422) { // Allow handle logic for business errors
            const error = new Error(`API Error: ${res.statusText}`);
            (error as any).response = res;
            throw error;
        }
        const data = await res.json().catch(() => ({}));
        return { data, status: res.status, ok: res.ok };
    },
    post: async (url: string, data: any, config: any = {}) => {
        const res = await authFetch(url, {
            ...config,
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json', ...config.headers }
        });
        const resData = await res.json().catch(() => ({}));
        if (!res.ok) {
            const error = new Error(resData.message || `API Error: ${res.statusText}`);
            (error as any).response = { data: resData, status: res.status };
            throw error;
        }
        return { data: resData, status: res.status };
    },
    patch: async (url: string, data: any, config: any = {}) => {
        const res = await authFetch(url, {
            ...config,
            method: 'PATCH',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json', ...config.headers }
        });
        const resData = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(resData.message || 'API Error');
        return { data: resData, status: res.status };
    },
    delete: async (url: string, config: any = {}) => {
        const res = await authFetch(url, { ...config, method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'API Error');
        return { data, status: res.status };
    }
};

export default api;
