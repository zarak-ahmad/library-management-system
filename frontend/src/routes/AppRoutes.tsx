import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, RoleRoute, GuestRoute } from './ProtectedRoute';

import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import FirstLoginPage from '@/pages/auth/FirstLoginPage';
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';
import RequestConfirmationPage from '@/pages/public/RequestConfirmationPage';

import AdminDashboard from '@/pages/admin/AdminDashboard';
import StudentsPage from '@/pages/admin/StudentsPage';
import LibrariansPage from '@/pages/admin/LibrariansPage';
import LibrarianDashboard from '@/pages/librarian/LibrarianDashboard';
import StudentDashboard from '@/pages/student/StudentDashboard';
import BrowseBooksPage from '@/pages/student/BrowseBooksPage';
import MyLibraryPage from '@/pages/student/MyLibraryPage';
import ProfilePage from '@/pages/shared/ProfilePage';
import BooksPage from '@/pages/shared/BooksPage';
import CatalogPage from '@/pages/shared/CatalogPage';
import BookRequestsPage from '@/pages/shared/BookRequestsPage';
import IssueReturnPage from '@/pages/shared/IssueReturnPage';
import ReservationsPage from '@/pages/shared/ReservationsPage';
import FinesPage from '@/pages/shared/FinesPage';
import SupportPage from '@/pages/shared/SupportPage';
import ReportsPage from '@/pages/shared/ReportsPage';
import NotificationsPage from '@/pages/shared/NotificationsPage';
import SettingsPage from '@/pages/admin/SettingsPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
      </Route>

      <Route path="/request-confirmation/:token" element={<RequestConfirmationPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/auth/first-login" element={<FirstLoginPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        <Route element={<RoleRoute allowedRoles={['admin']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/books" element={<BooksPage />} />
          <Route path="/admin/catalog" element={<CatalogPage />} />
          <Route path="/admin/requests" element={<BookRequestsPage />} />
          <Route path="/admin/issue-return" element={<IssueReturnPage />} />
          <Route path="/admin/reservations" element={<ReservationsPage />} />
          <Route path="/admin/fines" element={<FinesPage />} />
          <Route path="/admin/support" element={<SupportPage />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
          <Route path="/admin/students" element={<StudentsPage />} />
          <Route path="/admin/librarians" element={<LibrariansPage />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={['librarian']} />}>
          <Route path="/librarian/dashboard" element={<LibrarianDashboard />} />
          <Route path="/librarian/books" element={<BooksPage />} />
          <Route path="/librarian/catalog" element={<CatalogPage />} />
          <Route path="/librarian/requests" element={<BookRequestsPage />} />
          <Route path="/librarian/issue-return" element={<IssueReturnPage />} />
          <Route path="/librarian/reservations" element={<ReservationsPage />} />
          <Route path="/librarian/fines" element={<FinesPage />} />
          <Route path="/librarian/support" element={<SupportPage />} />
          <Route path="/librarian/reports" element={<ReportsPage />} />
          <Route path="/librarian/students" element={<StudentsPage />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={['student']} />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/books" element={<BrowseBooksPage />} />
          <Route path="/student/my-library" element={<MyLibraryPage />} />
          <Route path="/student/fines" element={<FinesPage />} />
          <Route path="/student/support" element={<SupportPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
