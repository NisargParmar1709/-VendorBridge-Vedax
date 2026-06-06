import client from "./client";

export const authApi = {
	login: (email, password) => client.post("/auth/login", { email, password }),
	register: (data) => client.post("/auth/register", data),
	logout: () => {},
	me: () => client.get("/auth/me"),
	updateProfile: (data) => client.patch("/auth/me", data),
	forgotPassword: (email) => client.post("/auth/forgot-password", { email }),
	resetPassword: (token, new_password) =>
		client.post("/auth/reset-password", { token, new_password }),
};

export default authApi;