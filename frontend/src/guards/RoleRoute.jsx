import { Outlet } from "react-router-dom";

import useAuthStore from "../store/authStore";

function AccessDeniedPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
        <p className="mt-3 text-sm text-gray-600">
          You don&apos;t have permission to access this page.
        </p>
      </div>
    </div>
  );
}

export default function RoleRoute({ roles = [], children }) {
  const user = useAuthStore((state) => state.user);

  if (!user || !roles.includes(user.role)) {
    return <AccessDeniedPage />;
  }

  return children ?? <Outlet />;
}