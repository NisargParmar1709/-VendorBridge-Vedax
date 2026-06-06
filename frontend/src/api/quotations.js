import client from "./client";

export const quotationsApi = {
  getAll: (params) => client.get("/quotations", { params }),
  getForRFQ: (rfqId) => client.get(`/rfqs/${rfqId}/quotations`),
  create: (rfqId, data) => client.post(`/rfqs/${rfqId}/quotations`, data),
  get: (id) => client.get(`/quotations/${id}`),
  update: (id, data) => client.patch(`/quotations/${id}`, data),
  submit: (id) => client.post(`/quotations/${id}/submit`),
  compare: (rfqId) => client.get(`/rfqs/${rfqId}/compare`),
  select: (rfqId, data) => client.post(`/rfqs/${rfqId}/select`, data),
};

export default quotationsApi;