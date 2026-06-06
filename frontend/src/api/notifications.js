import client from "./client";

export const notificationsApi = {
  list: () => client.get("/notifications"),
  markRead: (id) => client.patch(`/notifications/${id}/read`),
  markAllRead: () => client.patch("/notifications/read-all"),
};

export default notificationsApi;
