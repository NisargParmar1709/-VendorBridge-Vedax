import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";

import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";
import PrivateRoute from "./guards/PrivateRoute";
import RoleRoute from "./guards/RoleRoute";
import ActivityPage from "./pages/activity/ActivityPage";
import ApprovalDetailPage from "./pages/approvals/ApprovalDetailPage";
import ApprovalListPage from "./pages/approvals/ApprovalsPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import InvoiceDetailPage from "./pages/invoices/InvoiceDetailPage";
import InvoiceListPage from "./pages/invoices/InvoicesPage";
import PODetailPage from "./pages/purchase-orders/PurchaseOrderDetailPage";
import POListPage from "./pages/purchase-orders/PurchaseOrdersPage";
import QuotationDetailPage from "./pages/quotations/QuotationDetailPage";
import QuotationFormPage from "./pages/quotations/NewQuotationPage";
import QuotationListPage from "./pages/quotations/QuotationsPage";
import ReportsPage from "./pages/reports/ReportsPage";
import ComparisonPage from "./pages/rfqs/CompareQuotationsPage";
import RFQFormPage from "./pages/rfqs/NewRFQPage";
import RFQDetailPage from "./pages/rfqs/RFQDetailPage";
import RFQListPage from "./pages/rfqs/RFQsPage";
import VendorFormPage from "./pages/vendors/NewVendorPage";
import VendorDetailPage from "./pages/vendors/VendorDetailPage";
import VendorListPage from "./pages/vendors/VendorsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
    mutations: { retry: 0 },
  },
});

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <PrivateRoute>
        <AppLayout />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <Navigate replace to="/dashboard" /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "vendors", element: <VendorListPage /> },
      {
        path: "vendors/new",
        element: (
          <RoleRoute roles={["admin"]}>
            <VendorFormPage />
          </RoleRoute>
        ),
      },
      { path: "vendors/:id", element: <VendorDetailPage /> },
      { path: "rfqs", element: <RFQListPage /> },
      {
        path: "rfqs/new",
        element: (
          <RoleRoute roles={["procurement_officer", "admin"]}>
            <RFQFormPage />
          </RoleRoute>
        ),
      },
      { path: "rfqs/:id", element: <RFQDetailPage /> },
      {
        path: "rfqs/:id/edit",
        element: (
          <RoleRoute roles={["procurement_officer", "admin"]}>
            <RFQFormPage />
          </RoleRoute>
        ),
      },
      { path: "rfqs/:id/compare", element: <ComparisonPage /> },
      { path: "quotations", element: <QuotationListPage /> },
      { path: "quotations/:id", element: <QuotationDetailPage /> },
      {
        path: "rfqs/:rfq_id/quotations/new",
        element: (
          <RoleRoute roles={["vendor"]}>
            <QuotationFormPage />
          </RoleRoute>
        ),
      },
      {
        path: "approvals",
        element: (
          <RoleRoute roles={["manager", "admin"]}>
            <ApprovalListPage />
          </RoleRoute>
        ),
      },
      {
        path: "approvals/:id",
        element: (
          <RoleRoute roles={["manager", "admin"]}>
            <ApprovalDetailPage />
          </RoleRoute>
        ),
      },
      { path: "purchase-orders", element: <POListPage /> },
      { path: "purchase-orders/:id", element: <PODetailPage /> },
      { path: "invoices", element: <InvoiceListPage /> },
      { path: "invoices/:id", element: <InvoiceDetailPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "activity", element: <ActivityPage /> },
    ],
  },
  {
    path: "/",
    element: <AuthLayout />,
    children: [
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
    ],
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </QueryClientProvider>
  );
}