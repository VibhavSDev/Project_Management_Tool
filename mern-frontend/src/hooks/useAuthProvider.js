import { useEffect, useMemo, useState } from 'react';
import API from '../services/axiosInstance';
import toast from 'react-hot-toast';
import isEqual from 'lodash/isEqual'; // Run: npm install lodash

export const  useAuthProvider = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);       // Used for async calls like login/register
  const [initializing, setInitializing] = useState(true); // Used on app startup
  const [authError, setAuthError] = useState(null);    // Optional auth error tracking

  const isAuthenticated = !!token;

  // ✅ Handle auth header + localStorage sync
  const setTokenAndSync = (newToken) => {
    setToken(newToken);
    if (newToken) {
      API.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      localStorage.setItem('token', newToken);
    } else {
      delete API.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  };

  // ✅ On mount: validate token and get user
  useEffect(() => {
    const initializeAuth = async () => {
      if (!token) {
        setLoading(false);
        setInitializing(false);
        return;
      }

      try {
        API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const res = await API.get('/auth/me');

        setUser((prev) => (isEqual(prev, res.data.user) ? prev : res.data.user));
        setAuthError(null);
      } catch (err) {
        console.error('Token verification failed', err);
        logout();
        setAuthError('Session expired. Please login again.');
      } finally {
        setLoading(false);
        setInitializing(false);
      }
    };

    initializeAuth();
  }, [token]);

  // ✅ Login
  const login = async (email, password) => {
    try {
      setLoading(true);
      const res = await API.post('/auth/login', { email, password });
      const { token } = res.data;

      setTokenAndSync(token);

      const me = await API.get('/auth/me');
      setUser(me.data.user);
      localStorage.setItem('user', JSON.stringify(me.data.user));
      setAuthError(null);
      toast.success('Login successful!');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Login failed.');
      setAuthError(error?.response?.data?.message || 'Login failed.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ✅ Register
  const register = async (data) => {
    try {
      setLoading(true);
      const isFormData = data instanceof FormData;

      const res = await API.post('/auth/register', data, isFormData ? {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      } : {});

      const { token } = res.data;

      setTokenAndSync(token);

      const me = await API.get('/auth/me');
      setUser(me.data.user);
      localStorage.setItem('user', JSON.stringify(me.data.user));
      setAuthError(null);
      toast.success('Registration successful!');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Registration failed.');
      setAuthError(error?.response?.data?.message || 'Registration failed.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ✅ Logout
  const logout = () => {
    setUser(null);
    setTokenAndSync(null);
    localStorage.removeItem('user');
    setAuthError(null);
  };

  // ✅ Refresh (e.g. after profile update)
  const refreshAuth = async () => {
    try {
      const me = await API.get('/auth/me');
      setUser((prev) => (isEqual(prev, me.data.user) ? prev : me.data.user));
      localStorage.setItem('user', JSON.stringify(me.data.user));
    } catch (error) {
      console.error('Failed to refresh auth:', error);
    }
  };

  // ✅ Memoized auth object to avoid re-renders
  return useMemo(() => ({
    user,
    token,
    isAuthenticated,
    loading,
    initializing,
    authError,
    login,
    register,
    logout,
    refreshAuth,
  }), [user, token, loading, initializing, authError]);
};
