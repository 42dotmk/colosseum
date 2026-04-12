import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import EventsPage from '@/pages/EventsPage';
import EventDetailPage from '@/pages/EventDetailPage';
import CompetePage from '@/pages/CompetePage/CompetePage';
import ProfilePage from '@/pages/ProfilePage';
import TrainingPage from '@/pages/TrainingPage';
import TrainingLeaderboardPage from '@/pages/TrainingLeaderboardPage';
import TutorialsPage from '@/pages/TutorialsPage/TutorialsPage';
import TutorialDetailPage from '@/pages/TutorialDetailPage';

function App() {
  useEffect(() => {
    // Force dark mode
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <EventsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/event/:eventId"
            element={
              <ProtectedRoute>
                <Layout>
                  <EventDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/compete/:problemId"
            element={
              <ProtectedRoute>
                <Layout>
                  <CompetePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/training"
            element={
              <ProtectedRoute>
                <Layout>
                  <TrainingPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/training/leaderboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <TrainingLeaderboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tutorials"
            element={
              <ProtectedRoute>
                <Layout>
                  <TutorialsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tutorials/:tutorialId"
            element={
              <ProtectedRoute>
                <Layout>
                  <TutorialDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
