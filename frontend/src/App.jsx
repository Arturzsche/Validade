import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ScanPage from './pages/ScanPage.jsx';

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
            <ScanPage />
          </RequireAuth>
        }
      />
      {/* /dashboard entra no próximo passo */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
