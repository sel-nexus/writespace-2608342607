/** Express demonstration route boundaries, not server-enforced security. */
import PropTypes from 'prop-types';
import { Navigate, Outlet } from 'react-router-dom';
import { getSession } from '../utils/auth';

/** Recheck the actual stored account before rendering protected content.
 * Args:
 *   adminOnly: Require administrator privileges when true.
 *   children: Optional protected content; otherwise render nested routes.
 * Returns:
 *   Protected content or a fail-closed redirect.
 */
export function ProtectedRoute({ adminOnly = false, children }) {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  if (adminOnly && session.role !== 'admin') return <Navigate to="/blogs" replace />;
  return children ?? <Outlet />;
}

ProtectedRoute.propTypes = { adminOnly: PropTypes.bool, children: PropTypes.node };
