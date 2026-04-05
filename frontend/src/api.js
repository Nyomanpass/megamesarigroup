import axios from "axios";

const api = axios.create({
   baseURL: "http://localhost:3000/api",
});

// 🔐 REQUEST → kirim access token
api.interceptors.request.use((config) => {
   const accessToken = localStorage.getItem("accessToken");

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
            const refreshToken = localStorage.getItem("refreshToken");

            const res = await axios.post("http://localhost:3000/api/auth/refresh", { refreshToken });

            const newAccessToken = res.data.accessToken;

            // simpan token baru
            localStorage.setItem("accessToken", newAccessToken);

            // ulang request sebelumnya
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
         } catch (err) {
            // kalau refresh gagal → logout
            localStorage.clear();
            window.location.href = "/";
         }
      }

      return Promise.reject(error);
   },
);

export default api;
