import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import { PageLoader } from './components/ui/LoadingSpinner';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import DashboardPage from './pages/Dashboard';
import SubjectsPage from './pages/Subjects';
import SubjectDetailPage from './pages/SubjectDetail';
import NotesPage from './pages/Notes';
import ChatPage from './pages/Chat';
import QuizPage from './pages/Quiz';
import QuizAttemptPage from './pages/QuizAttempt';
import QuizResultPage from './pages/QuizResult';
import ProgressPage from './pages/Progress';
import RecommendationsPage from './pages/Recommendations';
import ProfilePage from './pages/Profile';
import NotFoundPage from './pages/NotFound';

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoader label="Restoring your session…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoader label="Loading…" />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route
        element={
          <PublicOnly>
            <AuthLayout />
          </PublicOnly>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/subjects" element={<SubjectsPage />} />
        <Route path="/subjects/:id" element={<SubjectDetailPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:conversationId" element={<ChatPage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/quiz/:quizId" element={<QuizAttemptPage />} />
        <Route path="/quiz/results/:resultId" element={<QuizResultPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
