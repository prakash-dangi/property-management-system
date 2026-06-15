import axios from "axios";
import useAuthStore from "../store/authStore";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true
});

api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    }
);

api.interceptors.response.use(
    (response) => response, async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {

                const res = await axios.post(
                    `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
                    {},
                    {
                        withCredentials: true
                    }
                );

                const newToken = res.data.accessToken;

                useAuthStore.getState().setToken(newToken);

                originalRequest.headers.Authorization = `Bearer ${newToken}`;

                return api(originalRequest);

            } catch {
                useAuthStore.getState().logout();
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    }
);

export default api;

export const refreshAccessToken =
    async () => {

        const response =
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
                {},
                {
                    withCredentials: true
                }
            );

        return response.data.accessToken;
    };
