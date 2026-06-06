import { Navigate, Outlet } from "react-router-dom";

import { ROUTES } from "../constants/routes";
import useAuthStore from "../store/authStore";

export default function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate replace to={ROUTES.LOGIN} />;
  }

  return children ?? <Outlet />;
}