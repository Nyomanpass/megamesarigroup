import { jwtDecode } from "jwt-decode";

export const ACCESS_TOKEN_KEY = "accessToken";
export const REFRESH_TOKEN_KEY = "refreshToken";

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const clearAuthStorage = () => {
  localStorage.clear();
};

export const redirectToLogin = () => {
  window.location.href = "/";
};

export const logoutToLogin = () => {
  clearAuthStorage();
  redirectToLogin();
};

export const getCurrentUser = () => {
  const token = getAccessToken();

  if (!token) {
    return null;
  }

  try {
    return jwtDecode(token);
  } catch {
    clearAuthStorage();
    return null;
  }
};
