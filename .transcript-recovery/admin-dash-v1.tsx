import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout, StatCard } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { dashboardApi } from '@/api/dashboard.api';

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => dashboardApi.admin(),
  });

  const stats = data?.data;

  if (isLoading) {
    return (
      <DashboardLayout title="Admin Dashboard">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Books" value={stats?.totalBooks ?? 0} href="/admin/books" />
        <StatCard title="Available Books" value={stats?.availableBooks ?? 0} href="/admin/books" />
        <StatCard title="Borrowed Books" value={stats?.borrowedBooks ?? 0} href="/admin/issue-return" />
        <StatCard title="Total Students" value={stats?.totalStudents ?? 0} href="/admin/students" />
        <StatCard title="Active Students" value={stats?.activeStudents ?? 0} href="/admin/students" />
        <StatCard title="Blocked Students" value={stats?.blockedStudents ?? 0} href="/admin/students" />
        <StatCard title="Pending Requests" value={stats?.pendingRequests ?? 0} href="/admin/requests" />
        <StatCard title="Outstanding Fines" value={`Rs. ${stats?.outstandingFines ?? 0}`} href="/admin/fines" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/issue-return">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(stats?.recentTransactions?.length || 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No recent transactions</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {stats?.recentTransactions?.map((t) => (
                  <li key={t.id} className="flex justify-between gap-2 border-b pb-2 last:border-0 last:pb-0">
                    <span>{t.book?.title || 'Book'} — {t.student?.fullName}</span>
                    <span className="text-muted-foreground capitalize shrink-0">{t.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activities</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/reports">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(stats?.recentActivities?.length || 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {stats?.recentActivities?.map((a) => (
                  <li key={a.id} className="border-b pb-2 last:border-0 last:pb-0">
                    <p className="font-medium">{a.action}</p>
                    <p className="text-xs text-muted-foreground">
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
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/books">Manage Books</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/students">Manage Students</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/requests">Book Requests</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/issue-return">Issue / Return</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/fines">Fines</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/support">Support</Link>
          </Button>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
