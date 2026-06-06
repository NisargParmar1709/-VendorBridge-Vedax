import client from "./client";

export const vendorsApi = {
  list: (params) => client.get("/vendors", { params }),
  create: (data) => client.post("/vendors", data),
  get: (id) => client.get(`/vendors/${id}`),
  update: (id, data) => client.patch(`/vendors/${id}`, data),
  delete: (id) => client.delete(`/vendors/${id}`),
  updateStatus: (id, status) =>
    client.patch(`/vendors/${id}/status`, { status }),
  getPerformance: (id) => client.get(`/vendors/${id}/performance`),
  rate: (id, rating) => client.post(`/vendors/${id}/rate`, { rating }),
};

export default vendorsApi;