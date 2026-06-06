import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">VendorBridge</h1>
          <p className="text-sm text-gray-500">Procurement & Vendor ERP</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}