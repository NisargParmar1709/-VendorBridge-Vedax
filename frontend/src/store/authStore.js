import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const AUTH_STORAGE_KEY = "vendorbridge-auth";

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: Boolean(user && token),
        }),
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });

        if (typeof window !== "undefined") {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;