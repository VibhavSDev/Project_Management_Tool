// src/routes/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../shared/useAuth';
import toast from 'react-hot-toast';
import { useEffect, useRef } from 'react';

const ProtectedRoute = ({
  children,
  allowedRoles = null, // null means no role restriction
  showToast = true,     // toggle toast notifications
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();
  const toastShown = useRef(false);

  useEffect(() => {
    if (loading || !showToast) return;

    if (!isAuthenticated && !toastShown.current) {
      toast.error('You must be logged in.');
      toastShown.current = true;
    } else if (
      isAuthenticated &&
      allowedRoles &&
      user &&
      !allowedRoles.includes(user.role) &&
      !toastShown.current
    ) {
      toast.error('Unauthorized: Insufficient permissions.');
      toastShown.current = true;
    }
  }, [loading, isAuthenticated, user, allowedRoles, showToast]);

  if (loading) {
    return <div className="text-white p-10">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
