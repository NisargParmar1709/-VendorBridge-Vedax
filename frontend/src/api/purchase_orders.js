import client from "./client";

export const poApi = {
  list: (params) => client.get("/purchase-orders", { params }),
  get: (id) => client.get(`/purchase-orders/${id}`),
  updateStatus: (id, data) => client.patch(`/purchase-orders/${id}/status`, data),
  getPdf: (id) => client.get(`/purchase-orders/${id}/pdf`, { responseType: "blob" }),
};

export default poApi;