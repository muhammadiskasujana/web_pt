    import axios from 'axios';
    import Cookies from 'js-cookie';

    const hostname = window.location.hostname; // contoh: kasir.garasicetak.id
    const parts = hostname.split('.');

    // Ambil domain utama (bagian kedua dari belakang)
    const tenant = parts.length >= 2 ? parts[parts.length - 2] : hostname;
    console.log(tenant);

    const instance = axios.create({
        baseURL: 'https://api.onestopcheck.id',
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json',
            'X-Tenant': tenant,
        },
    });


    // // Add a request interceptor to handle token refresh if needed
    // instance.interceptors.response.use(
    //     (response) => response,
    //     async (error) => {
    //         const originalRequest = error.config;
    //
    //         if (error.response?.status === 401 && !originalRequest._retry) {
    //             originalRequest._retry = true;
    //
    //             try {
    //                 // Try to refresh the token
    //                 await instance.post('/api/auth/tenant/refresh');
    //
    //                 // Retry the original request
    //                 return instance(originalRequest);
    //             } catch (refreshError) {
    //                 // Refresh failed, clear auth state but don't force redirect here
    //                 // Let the components handle the redirect based on their auth checks
    //                 Cookies.remove("tenant_access_token");
    //                 Cookies.remove("tenant_refresh_token");
    //                 Cookies.remove("device_id");
    //
    //                 // Instead of window.location.href, just reject the promise
    //                 // The components will handle the redirect
    //                 return Promise.reject(refreshError);
    //             }
    //         }
    //
    //         return Promise.reject(error);
    //     }
    // );
    // config/axios.js
    instance.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;
            const status = error.response?.status;
            const code = error.response?.data?.code || error.response?.data?.error;

            // 1) Skip refresh untuk route auth
            const url = originalRequest?.url || "";
            const isAuthRoute =
                url.includes("/api/auth/tenant/login") ||
                url.includes("/api/auth/tenant/refresh") ||
                url.includes("/api/auth/tenant/logout");

            // 2) Skip refresh untuk error yang tidak perlu refresh
            const nonRefreshableCodes = new Set([
                "INVALID_CREDENTIALS",
                "USER_NOT_ACTIVE",
                "TENANT_REQUIRED",
                "AUTH_REQUIRED"
            ]);

            if (
                status === 401 &&
                !originalRequest._retry &&
                !isAuthRoute &&
                !nonRefreshableCodes.has(code)
            ) {
                originalRequest._retry = true;
                try {
                    await instance.post("/api/auth/tenant/refresh");
                    return instance(originalRequest);
                } catch (refreshError) {
                    Cookies.remove("tenant_access_token");
                    Cookies.remove("tenant_refresh_token");
                    Cookies.remove("device_id");
                    return Promise.reject(refreshError);
                }
            }

            return Promise.reject(error);
        }
    );

    export default instance;