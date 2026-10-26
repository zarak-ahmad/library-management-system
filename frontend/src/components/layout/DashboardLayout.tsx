import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  Users,
  UserCog,
  User,
  Menu,
  X,
  Library,
  Tags,
  ClipboardList,
  ArrowLeftRight,
  Bookmark,
  Receipt,
  Settings,
  LifeBuoy,
  BarChart3,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';
import { NotificationBell } from './NotificationBell';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Books', href: '/admin/books', icon: Library },
  { label: 'Catalog', href: '/admin/catalog', icon: Tags },
  { label: 'Requests', href: '/admin/requests', icon: ClipboardList },
  { label: 'Issue/Return', href: '/admin/issue-return', icon: ArrowLeftRight },
  { label: 'Reservations', href: '/admin/reservations', icon: Bookmark },
  { label: 'Fines', href: '/admin/fines', icon: Receipt },
  { label: 'Support', href: '/admin/support', icon: LifeBuoy },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
  { label: 'Students', href: '/admin/students', icon: Users },
  { label: 'Librarians', href: '/admin/librarians', icon: UserCog },
];

const librarianNav: NavItem[] = [
  { label: 'Dashboard', href: '/librarian/dashboard', icon: LayoutDashboard },
  { label: 'Books', href: '/librarian/books', icon: Library },
  { label: 'Catalog', href: '/librarian/catalog', icon: Tags },
  { label: 'Requests', href: '/librarian/requests', icon: ClipboardList },
  { label: 'Issue/Return', href: '/librarian/issue-return', icon: ArrowLeftRight },
  { label: 'Reservations', href: '/librarian/reservations', icon: Bookmark },
  { label: 'Fines', href: '/librarian/fines', icon: Receipt },
  { label: 'Support', href: '/librarian/support', icon: LifeBuoy },
  { label: 'Reports', href: '/librarian/reports', icon: BarChart3 },
  { label: 'Students', href: '/librarian/students', icon: Users },
];

const studentNav: NavItem[] = [
  { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Browse Books', href: '/student/books', icon: Library },
  { label: 'My Requests', href: '/student/my-library', icon: Bookmark },
  { label: 'My Fines', href: '/student/fines', icon: Receipt },
  { label: 'Support', href: '/student/support', icon: LifeBuoy },
];

const profileNav: NavItem = { label: 'Profile', href: '/profile', icon: User };

const navByRole: Record<UserRole, NavItem[]> = {
  admin: adminNav,
  librarian: librarianNav,
  student: studentNav,
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

function getInitials(name?: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = user ? [...navByRole[user.role], profileNav] : [];
  const mainNav = navItems.slice(0, -1);
  const profileItem = navItems[navItems.length - 1];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-3 px-5 py-6 border-b border-border/60">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shadow-sm">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-bold tracking-tight truncate">Library LMS</p>
          <p className="text-xs text-muted-foreground capitalize">{user?.role} Portal</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-1">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'nav-item-active'
                  : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              {item.label}
            </Link>
          );
        })}

        {profileItem && (
          <>
            <div className="my-3 border-t border-border/60" />
            <Link
              to={profileItem.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                location.pathname === profileItem.href
                  ? 'nav-item-active'
                  : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground'
              )}
            >
              <profileItem.icon className="h-4 w-4 shrink-0" />
              {profileItem.label}
            </Link>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-border/60">
        <div className="flex items-center gap-3 rounded-xl list-surface p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
            {getInitials(user?.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background dark:bg-transparent flex">
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-border/60 bg-card/80 backdrop-blur-md">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 overlay-surface border-r border-border/60 flex flex-col z-50 shadow-2xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 rounded-full"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur-md h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0 rounded-full"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate hidden sm:block">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-full text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto scrollbar-thin page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}

export { StatCard } from './StatCard';
