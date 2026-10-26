import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function RoleRoute({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    const redirectMap: Record<UserRole, string> = {
      admin: '/admin/dashboard',
      librarian: '/librarian/dashboard',
      student: '/student/dashboard',
    };
    return <Navigate to={user ? redirectMap[user.role] : '/login'} replace />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (user.role === 'student' && !user.firstLoginCompleted) {
      return <Navigate to="/auth/first-login" replace />;
    }
    const redirectMap: Record<UserRole, string> = {
      admin: '/admin/dashboard',
      librarian: '/librarian/dashboard',
      student: '/student/dashboard',
    };
    return <Navigate to={redirectMap[user.role]} replace />;
  }

  return <Outlet />;
}
