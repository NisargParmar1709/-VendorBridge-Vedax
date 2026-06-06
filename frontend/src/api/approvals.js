import client from "./client";

export const approvalsApi = {
  list: (params) => client.get("/approvals", { params }),
  get: (id) => client.get(`/approvals/${id}`),
  processL1: (id, data) => client.post(`/approvals/${id}/l1`, data),
  processL2: (id, data) => client.post(`/approvals/${id}/l2`, data),
};

export default approvalsApi;