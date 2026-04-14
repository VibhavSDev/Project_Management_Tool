import { Navigate } from 'react-router-dom';
import { useAuth } from '../shared/useAuth';

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" replace />;
};

export default AdminRoute;
