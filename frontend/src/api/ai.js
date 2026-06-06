import client from "./client";

export const aiApi = {
  generateDescription: (data) => client.post("/ai/generate-description", data),
};

export default aiApi;