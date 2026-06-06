import axios from "axios";
import toast from "react-hot-toast";

import { ROUTES } from "../constants/routes";
import useAuthStore from "../store/authStore";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      useAuthStore.getState().logout();
      toast.error("Session expired. Please log in again.");

      if (
        typeof window !== "undefined" &&
        window.location.pathname !== ROUTES.LOGIN
      ) {
        window.location.assign(ROUTES.LOGIN);
      }
    }

    return Promise.reject(error);
  }
);

export default client;