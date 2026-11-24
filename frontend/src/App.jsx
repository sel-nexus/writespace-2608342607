/** Register completed discovery and identity routes without placeholder content pages. */
import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { getSession } from './utils/auth';
import { PublicNavbar } from './components/PublicNavbar';
import LandingPage from './pages/LandingPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import Home from './pages/Home';
import ReadBlog from './pages/ReadBlog';
import WriteBlog from './pages/WriteBlog';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';

/** Render completed routes and choose their session-aware header.
 * Returns:
 *   The currently implemented application surface.
 */
export default function App() {
  const [session, setSession] = useState(getSession);
  const location = useLocation();

  /** Reread persistent identity after login, registration, logout or external changes. */
  function refreshSession() {
    setSession(getSession());
  }

  useEffect(() => {
    refreshSession();
  }, [location.pathname]);
  useEffect(() => {
    window.addEventListener('storage', refreshSession);
    return () => window.removeEventListener('storage', refreshSession);
  }, []);
  const authPage = ['/login', '/register'].includes(location.pathname);

  return (
    <div className="min-h-[100dvh] bg-white font-sans text-slate-800">
      <a
        href="#main-content"
        className={'sr-only rounded-lg bg-white p-3 text-orange-800 focus:not-sr-only focus:fixed '
          + 'focus:left-4 focus:top-4 focus:z-30 focus:ring-2 focus:ring-orange-700'}
      >
        Skip to content
      </a>
      {!authPage && location.pathname !== '/' && session && (
        <Navbar session={session} onSessionChange={refreshSession} />
      )}
      <Routes>
        <Route
          path="/"
          element={
            <>
              <PublicNavbar session={session} />
              <LandingPage session={session} />
            </>
          }
        />
        <Route path="/login" element={<LoginPage onSessionChange={refreshSession} />} />
        <Route path="/register" element={<RegisterPage onSessionChange={refreshSession} />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/blogs" element={<Home />} />
          <Route path="/blog/:id" element={<ReadBlog />} />
          <Route path="/write" element={<WriteBlog />} />
          <Route path="/edit/:id" element={<WriteBlog />} />
        </Route>
        <Route element={<ProtectedRoute adminOnly />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/users" element={<UserManagement />} />
        </Route>
      </Routes>
    </div>
  );
}
