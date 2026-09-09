import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Loading from "./Loading";

export function RequireAuth() {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading teks="Memeriksa sesi login..." />;

  if (!session || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export function RequireAdmin() {
  const { profile, loading } = useAuth();

  if (loading) return <Loading teks="Memeriksa akses..." />;

  if (profile?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
