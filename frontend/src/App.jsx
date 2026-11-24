/** Register the completed public discovery route without placeholder pages. */
import { Route, Routes } from 'react-router-dom';
import { PublicNavbar } from './components/PublicNavbar';
import LandingPage from './pages/LandingPage';

/** Render the standalone landing route and its public header.
 * Returns:
 *   The currently implemented application surface.
 */
export default function App() {
  return (
    <div className="min-h-[100dvh] bg-white font-sans text-slate-800">
      <a href="#main-content" className="sr-only rounded-lg bg-white p-3 text-orange-800 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-30 focus:ring-2 focus:ring-orange-700">Skip to content</a>
      <Routes>
        <Route path="/" element={
          <>
            <PublicNavbar />
            <LandingPage />
          </>
        } />
      </Routes>
    </div>
  );
}
