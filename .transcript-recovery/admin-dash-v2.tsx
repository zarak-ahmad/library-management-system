import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  BookOpen,
  ClipboardList,
  Library,
  Receipt,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { DashboardLayout, StatCard } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi } from '@/api/dashboard.api';

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => dashboardApi.admin(),
  });

  const stats = data?.data;
  const firstName = user?.fullName?.split(' ')[0] ?? 'Admin';

  if (isLoading) {
    return (
      <DashboardLayout title="Admin Dashboard" subtitle="Overview of your library operations">
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Admin Dashboard" subtitle="Overview of your library operations">
      <Card className="mb-8 overflow-hidden border-primary/10 bg-gradient-to-r from-primary/5 via-transparent to-violet-500/5">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Welcome back</p>
            <h2 className="text-2xl font-bold tracking-tight mt-1">Hello, {firstName}</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Here&apos;s what&apos;s happening in your library today.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/admin/books">Add Book</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/students">Manage Students</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Books"
          value={stats?.totalBooks ?? 0}
          href="/admin/books"
          icon={Library}
          accent="blue"
        />
        <StatCard
          title="Available Books"
          value={stats?.availableBooks ?? 0}
          href="/admin/books"
          icon={BookOpen}
          accent="green"
        />
        <StatCard
          title="Borrowed Books"
          value={stats?.borrowedBooks ?? 0}
          href="/admin/issue-return"
          icon={ArrowLeftRight}
          accent="indigo"
        />
        <StatCard
          title="Total Students"
          value={stats?.totalStudents ?? 0}
          href="/admin/students"
          icon={Users}
          accent="purple"
        />
        <StatCard
          title="Active Students"
          value={stats?.activeStudents ?? 0}
          href="/admin/students"
          icon={UserCheck}
          accent="green"
        />
        <StatCard
          title="Blocked Students"
          value={stats?.blockedStudents ?? 0}
          href="/admin/students"
          icon={UserX}
          accent="rose"
        />
        <StatCard
          title="Pending Requests"
          value={stats?.pendingRequests ?? 0}
          href="/admin/requests"
          icon={ClipboardList}
          accent="amber"
        />
        <StatCard
          title="Outstanding Fines"
          value={`Rs. ${stats?.outstandingFines ?? 0}`}
          href="/admin/fines"
          icon={Receipt}
          accent="cyan"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to="/admin/issue-return">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(stats?.recentTransactions?.length || 0) === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ArrowLeftRight className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No recent transactions</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {stats?.recentTransactions?.map((t) => (
                  <li
                    key={t.id}
                    className="flex justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="truncate">
                      {t.book?.title || 'Book'} — {t.student?.fullName}
                    </span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                      {t.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">Recent Activities</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to="/admin/reports">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(stats?.recentActivities?.length || 0) === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClipboardList className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {stats?.recentActivities?.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <p className="text-sm font-medium">{a.action}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.user?.fullName} · {new Date(a.timestamp).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[
            { to: '/admin/books', label: 'Manage Books' },
            { to: '/admin/students', label: 'Manage Students' },
            { to: '/admin/requests', label: 'Book Requests' },
            { to: '/admin/issue-return', label: 'Issue / Return' },
            { to: '/admin/fines', label: 'Fines' },
            { to: '/admin/support', label: 'Support' },
          ].map(({ to, label }) => (
            <Button key={to} asChild variant="outline" size="sm">
              <Link to={to}>{label}</Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
