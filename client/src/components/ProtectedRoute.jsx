import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Spinner from "./ui/Spinner";

export default function ProtectedRoute({ children, roles }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  if (!session) return <Navigate to="/" replace />;
  if (roles && !roles.includes(profile?.role)) return <Navigate to="/dashboard" replace />;
  return children;
}
