import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppRouter from './routes/AppRouter';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';
import { ProjectProvider } from './contexts/ProjectContext';
import { SocketProvider } from './contexts/SocketContext';

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <ProjectProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <AppRouter />
              <Toaster position="top-right" />
            </ThemeProvider>
          </ProjectProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
