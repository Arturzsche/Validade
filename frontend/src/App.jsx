import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NewQuotePage from './pages/NewQuotePage.jsx';
import QuoteViewPage from './pages/QuoteViewPage.jsx';

function RequireAuth({ children }) {
  const { session } = useAuth();
  return session ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { session } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/orcamentos/novo"
        element={
          <RequireAuth>
            <NewQuotePage />
          </RequireAuth>
        }
      />
      <Route
        path="/orcamentos/:id"
        element={
          <RequireAuth>
            <QuoteViewPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
