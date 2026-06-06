import client from "./client";

export const invoicesApi = {
  list: (params) => client.get("/invoices", { params }),
  createForPO: (poId, data) => client.post(`/purchase-orders/${poId}/invoices`, data),
  get: (id) => client.get(`/invoices/${id}`),
  updateStatus: (id, data) => client.patch(`/invoices/${id}/status`, data),
  getPdf: (id) => client.get(`/invoices/${id}/pdf`, { responseType: "blob" }),
  sendEmail: (id) => client.post(`/invoices/${id}/send-email`),
  markPaid: (id) => client.post(`/invoices/${id}/mark-paid`),
};

export default invoicesApi;