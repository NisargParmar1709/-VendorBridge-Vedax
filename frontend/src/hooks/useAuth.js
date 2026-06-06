import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { authApi } from "../api/auth";
import useAuthStore from "../store/authStore";

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: ({ email, password }) => authApi.login(email, password),
    onSuccess: (data) => {
      setAuth(data.data.user, data.data.access_token);
      toast.success("Welcome back!");
    },
    onError: (err) => {
      const status = err.response?.status;
      if (status === 401) toast.error("Invalid email or password");
      else if (status === 403) toast.error("Your account is not active");
      else toast.error("Login failed");
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data) => authApi.register(data),
    onSuccess: () => {
      toast.success("Registration successful!");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Registration failed");
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email) => authApi.forgotPassword(email),
    onSuccess: () => {
      toast.success("If an account exists, reset instructions were sent.");
    },
    onError: () => {
      toast.success("If an account exists, reset instructions were sent.");
    },
  });
}

export function useMe(enabled = true) {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me().then((response) => response.data),
    enabled,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => authApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Profile updated");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Profile update failed");
    },
  });
}