import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/useAuth';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const { login, setAuth } = useAuth();
  const navigate = useNavigate();
  const emailRef = useRef(null);

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize Google Sign-In
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });

      window.google.accounts.id.renderButton(
        document.getElementById('google-login-btn'),
        { theme: 'outline', size: 'large', width: '100%' }
      );
    }
  }, []);

  const handleGoogleResponse = async (response) => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Google login failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setAuth({ token: data.token, user: data.user });

      toast.success('Logged in with Google!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill in all fields');
    setLoading(true);

    try {
      await login(form.email, form.password);
      toast.success('Logged in successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] px-4">
      <section className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-8 rounded-2xl shadow-lg w-full max-w-md space-y-6">
        <h1 className="text-3xl font-extrabold text-center">ProjectMate</h1>
        <p className="text-center text-gray-400 text-sm">Log in to manage your tasks and teams</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block mb-1 text-sm font-medium">
              Email
            </label>
            <input
              ref={emailRef}
              type="email"
              name="email"
              id="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="block mb-1 text-sm font-medium">
              Password
            </label>
            <input
              type="password"
              name="password"
              id="password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-md transition"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="text-center text-sm text-gray-400">or</div>

        {/* ✅ Google Sign-In Button */}
        <div id="google-login-btn" className="w-full flex justify-center"></div>

        <p className="text-center text-sm mt-4">
          Don&apos;t have an account?{' '}
          <a href="/register" className="text-indigo-500 hover:underline">
            Register
          </a>
        </p>
      </section>
    </main>
  );
};

export default Login;
