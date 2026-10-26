import { BookOpen, Bookmark, Moon, Receipt, Shield, Sun, Users } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const features = [
  { icon: BookOpen, label: 'Catalog & inventory management' },
  { icon: Users, label: 'Student & staff accounts' },
  { icon: Bookmark, label: 'Borrowing & reservations' },
  { icon: Receipt, label: 'Fines & reporting' },
];

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex dark:bg-transparent">
      <div className="relative hidden lg:flex lg:w-[46%] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-indigo-600 to-violet-700 dark:from-[#0a1025] dark:via-[#121a35] dark:to-[#1a1040]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_40%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.25),transparent_45%)]" />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl dark:bg-indigo-500/20" />
        <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl dark:bg-violet-500/15" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm shadow-lg">
                <BookOpen className="h-7 w-7" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">Library LMS</p>
                <p className="text-sm text-white/70">Smart campus library platform</p>
              </div>
            </div>

            <h2 className="text-3xl font-bold leading-tight mb-4 max-w-sm">
              Manage your library with clarity and control
            </h2>
            <p className="text-white/80 leading-relaxed max-w-md text-[15px]">
              A comprehensive system for educational institutions — track books, manage
              borrowing, handle fines, and serve your community effortlessly.
            </p>
          </div>

          <div className="space-y-3">
            {features.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm border border-white/10"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-white/90">{label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-white/50">
            <Shield className="h-3.5 w-3.5" />
            <span>Secure, role-based access for admins, librarians & students</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col dark:bg-transparent">
        <div className="flex justify-end p-4 lg:p-6">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full bg-background/80 backdrop-blur-sm"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-10">
          <div className="w-full max-w-md page-enter">
            <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <span className="text-2xl font-bold tracking-tight">Library LMS</span>
            </div>

            <div className="mb-8 text-center lg:text-left">
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              {subtitle && (
                <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed">{subtitle}</p>
              )}
            </div>

            <div className={cn('glass-panel p-1')}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
