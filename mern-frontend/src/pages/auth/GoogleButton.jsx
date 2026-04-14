import { useEffect } from 'react';
import toast from 'react-hot-toast';
import API from '../services/axiosInstance';
import { useAuth } from '../contexts/AuthContext';

const GoogleButton = () => {
  const { setAuth } = useAuth(); // or your custom auth hook

  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      window.google.accounts.id.renderButton(
        document.getElementById('google-signin'),
        { theme: 'outline', size: 'large' }
      );
    }
  }, []);

  const handleCredentialResponse = async (response) => {
    try {
      const res = await API.post('/auth/google', {
        credential: response.credential,
      });

      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setAuth({ token, user });

      toast.success('Logged in with Google!');
    } catch (err) {
      toast.error('Google login failed');
    }
  };

  return <div id="google-signin"></div>;
};

export default GoogleButton;
