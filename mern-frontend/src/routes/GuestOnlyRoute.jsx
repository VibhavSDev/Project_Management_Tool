// src/routes/GuestOnlyRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../shared/useAuth';
import toast from 'react-hot-toast';
import { useEffect, useRef } from 'react';

const GuestOnlyRoute = ({ children, showToast = true, redirectTo = '/dashboard' }) => {
  const { isAuthenticated, loading } = useAuth();
  const toastShown = useRef(false);

  useEffect(() => {
    if (!loading && isAuthenticated && showToast && !toastShown.current) {
      toast.error('You are already logged in.');
      toastShown.current = true;
    }
  }, [loading, isAuthenticated, showToast]);

  if (loading) return <div className="text-white p-10">Loading...</div>;

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default GuestOnlyRoute;
