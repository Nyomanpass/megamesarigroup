import axios from "axios";
import {
   getAccessToken,
   getRefreshToken,
   logoutToLogin,
   ACCESS_TOKEN_KEY,
} from "./utils/auth";

export const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
export const UPLOADS_BASE_URL = (import.meta.env.VITE_UPLOADS_URL || "/uploads").replace(/\/$/, "");

const api = axios.create({
   baseURL: API_BASE_URL,
});

// 🔐 REQUEST → kirim access token
api.interceptors.request.use((config) => {
   const accessToken = getAccessToken();

   if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
   }

   return config;
});

// 🔄 RESPONSE → auto refresh kalau token expired
api.interceptors.response.use(
   (response) => response,
   async (error) => {
      const originalRequest = error.config;

      // kalau token expired (401)
      if (error.response?.status === 401 && !originalRequest._retry) {
         originalRequest._retry = true;

         try {
            const refreshToken = getRefreshToken();

            const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });

            const newAccessToken = res.data.accessToken;

            // simpan token baru
            localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);

            // ulang request sebelumnya
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
         } catch {
            // kalau refresh gagal → logout
            logoutToLogin();
         }
      }

      return Promise.reject(error);
   },
);

export default api;
