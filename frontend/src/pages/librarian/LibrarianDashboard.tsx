import { useQuery } from '@tanstack/react-query';
import { DashboardLayout, StatCard } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardApi } from '@/api/dashboard.api';

export default function LibrarianDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'librarian'],
    queryFn: () => dashboardApi.librarian(),
  });

  const stats = data?.data;

  if (isLoading) {
    return (
      <DashboardLayout title="Librarian Dashboard">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Librarian Dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Issued Books" value={stats?.issuedBooks ?? 0} />
        <StatCard title="Returned Today" value={stats?.returnedToday ?? 0} />
        <StatCard title="Pending Requests" value={stats?.pendingRequests ?? 0} />
        <StatCard title="Active Reservations" value={stats?.activeReservations ?? 0} />
        <StatCard title="Fine Collections Today" value={`Rs. ${stats?.fineCollectionsToday ?? 0}`} />
        <StatCard title="Active Students" value={stats?.totalStudents ?? 0} />
        <StatCard title="Open Support Tickets" value={stats?.openSupportTickets ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {(stats?.recentActivities?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {stats?.recentActivities?.map((a) => (
                <li key={a.id} className="border-b pb-2">
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
    </DashboardLayout>
  );
}
