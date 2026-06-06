import client from "./client";

export const activityApi = {
  list: (params) => client.get("/activity", { params }),
};

export default activityApi;