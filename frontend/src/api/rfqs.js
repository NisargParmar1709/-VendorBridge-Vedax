import client from "./client";

export const rfqsApi = {
  list: (params) => client.get("/rfqs", { params }),
  create: (data) => client.post("/rfqs", data),
  get: (id) => client.get(`/rfqs/${id}`),
  update: (id, data) => client.patch(`/rfqs/${id}`, data),
  delete: (id) => client.delete(`/rfqs/${id}`),
  publish: (id) => client.post(`/rfqs/${id}/publish`),
  uploadAttachment: (id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return client.post(`/rfqs/${id}/attachments`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  deleteAttachment: (rfqId, aid) =>
    client.delete(`/rfqs/${rfqId}/attachments/${aid}`),
  getCompare: (id) => client.get(`/rfqs/${id}/compare`),
  selectQuotation: (rfqId, data) =>
    client.post(`/rfqs/${rfqId}/select`, data),
};

export default rfqsApi;