import client from "./client";

export const reportsApi = {
  getDashboardStats: () => client.get("/reports/dashboard-stats"),
  getSpendingTrends: (start, end) =>
    client.get(
      `/reports/spending-trends?start_date=${start}&end_date=${end}`
    ),
  getVendorPerformance: () => client.get("/reports/vendor-performance"),
  getProcurementSummary: () => client.get("/reports/procurement-summary"),
  exportCSV: (type) =>
    client.get(`/reports/export?type=${type}&format=csv`, {
      responseType: "blob",
    }),
};

export default reportsApi;