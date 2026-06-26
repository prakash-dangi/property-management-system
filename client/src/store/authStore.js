import { create } from "zustand";
import api from "../api/axios";
import { refreshAccessToken } from "../api/axios";

const useAuthStore = create((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,

    setUser: (user) => set({ user }),
    setToken: (token) => set({ token, isAuthenticated: true }),

    login: async (credentials) => {
        const res = await api.post("/api/auth/login", credentials);

        set({
            user: res.data.user,
            token: res.data.accessToken,
            isAuthenticated: true
        });
    },

    logout: async () => {
        try {
            await api.post("/api/auth/logout");
        } catch (error) {
            console.error("Logout error:", error);
        }
        
        set({
            user: null,
            token: null,
            isAuthenticated: false
        });
    },

    initializeAuth: async () => {
        try {
            const token =
                await refreshAccessToken();

            set({token});


            const meResponse = await api.get("/api/auth/me");

            set({
                user: meResponse.data,
                isAuthenticated: true,
                loading: false
            });
        } catch {
            set({
                token: null,
                user: null,
                isAuthenticated: false,
                loading: false
            });
        }
    },

    loading: true,
}));


export default useAuthStore;
