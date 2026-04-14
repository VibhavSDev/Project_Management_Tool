import { useEffect, useState } from 'react';
import { useAuth } from '../../shared/useAuth';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Register = () => {
  const { register, setAuth } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: '',
    avatar: null,
  });

  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });

      window.google.accounts.id.renderButton(
        document.getElementById('google-register-btn'),
        { theme: 'outline', size: 'large' }
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
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    const { username, email, password } = formData;
    if (!username || !email || !password) {
      return toast.error('Please fill out all fields');
    }
    setStep(2);
  };

  const handleRoleNext = () => {
    if (!formData.role) return toast.error('Please select a role');
    setStep(3);
  };

  const handleBack = () => setStep(step - 1);

  const handleFinalRegister = async () => {
    const { username, email, password, role, avatar } = formData;
    if (!username || !email || !password || !role) {
      return toast.error('Please complete all fields');
    }

    const form = new FormData();
    form.append('username', username);
    form.append('email', email);
    form.append('password', password);
    form.append('role', role);
    if (avatar) form.append('avatar', avatar);

    setLoading(true);
    try {
      const data = await register(form);
      toast.success('Account created successfully');

      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };


  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] px-4">
      <section className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-8 rounded-2xl shadow-lg w-full max-w-md space-y-6">
        <h1 className="text-3xl font-extrabold text-center">ProjectMate</h1>
        <p className="text-center text-gray-400 text-sm">Create your account to get started</p>

        {/* ✅ Google Sign-In */}
        <div id="google-register-btn" className="w-full flex justify-center"></div>

        <div className="text-center text-sm text-gray-400">or continue with email</div>

        {step === 1 && (
          <div className="space-y-4">
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleNext}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-md"
            >
              Next →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">Select your role:</p>
            <div className="flex justify-between">
              {['manager', 'member'].map((role) => (
                <button
                  key={role}
                  onClick={() => setFormData((prev) => ({ ...prev, role }))}
                  className={`w-[48%] py-2 rounded-md border font-semibold transition ${
                    formData.role === role
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white border-gray-300 dark:border-gray-700'
                  }`}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button
                onClick={handleBack}
                className="w-[48%] bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-md"
              >
                ← Back
              </button>
              <button
                onClick={handleRoleNext}
                className="w-[48%] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-md"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1 text-sm text-white dark:text-gray-200">
              <p><strong>Username:</strong> {formData.username}</p>
              <p><strong>Email:</strong> {formData.email}</p>
              <p><strong>Role:</strong> {formData.role}</p>
            </div>

            {/* Avatar Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload an avatar (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setFormData((prev) => ({ ...prev, avatar: file }));
                    const previewURL = URL.createObjectURL(file);
                    setAvatarPreview(previewURL);
                  }
                }}
                className="w-full bg-gray-100 dark:bg-gray-800 p-2 rounded-md text-sm"
              />

              {/* Preview */}
              {avatarPreview && (
                <div className="mt-2 flex justify-center">
                  <img
                    src={avatarPreview}
                    alt="Avatar Preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleFinalRegister}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-md flex justify-center items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Registering...' : 'Register'}
            </button>

            <button
              onClick={handleBack}
              className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-md"
            >
              ← Back
            </button>
          </div>
        )}



        <p className="text-center text-sm mt-4">
          Already have an account?{' '}
          <a href="/login" className="text-indigo-500 hover:underline">
            Log in
          </a>
        </p>
      </section>
    </main>
  );
};

export default Register;
