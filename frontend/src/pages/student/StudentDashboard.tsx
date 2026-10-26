import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Bookmark,
  BookOpen,
  ClipboardList,
  LifeBuoy,
  Receipt,
} from 'lucide-react';
import { DashboardLayout, StatCard } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { dashboardApi } from '@/api/dashboard.api';
import { borrowApi, getBookTitle } from '@/api/borrow.api';
import { studentLabels as L } from '@/constants/studentLabels';

const formatDate = (value: string) => new Date(value).toLocaleDateString();

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
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

export default function StudentDashboard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'student'],
    queryFn: () => dashboardApi.student(),
  });

  const { data: borrowedData } = useQuery({
    queryKey: ['transactions', 'mine', 'dashboard'],
    queryFn: () => borrowApi.listTransactions({ limit: 5, status: 'borrowed' }),
  });

  const { data: overdueData } = useQuery({
    queryKey: ['transactions', 'overdue', 'dashboard'],
    queryFn: () => borrowApi.listTransactions({ limit: 5, status: 'overdue' }),
  });

  const { data: pendingRequestsData } = useQuery({
    queryKey: ['book-requests', 'mine', 'pending', 'dashboard'],
    queryFn: () => borrowApi.listRequests({ limit: 5, status: 'confirmed' }),
  });

  const stats = data?.data;
  const borrowedBooks = [...(borrowedData?.data || []), ...(overdueData?.data || [])];
  const pendingRequests = pendingRequestsData?.data || [];
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';

  if (isLoading) {
    return (
      <DashboardLayout title={L.dashboard.title} subtitle={L.dashboard.subtitle}>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={L.dashboard.title} subtitle={L.dashboard.subtitle}>
      <Card className="mb-8 overflow-hidden border-primary/10 bg-gradient-to-r from-primary/5 via-transparent to-violet-500/5">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">{L.dashboard.welcome}</p>
            <h2 className="text-2xl font-bold tracking-tight mt-1">Hello, {firstName}</h2>
            <p className="text-muted-foreground text-sm mt-1">{L.dashboard.welcomeDescription}</p>
            {user?.studentProfile && (
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                {user.studentProfile.registrationNumber}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/student/books">{L.dashboard.actions.browseBooks}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/student/my-library">{L.dashboard.actions.myLibrary}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
        <StatCard
          title={L.dashboard.statCards.borrowedBooks}
          value={stats?.borrowedBooks ?? 0}
          href="/student/my-library"
          icon={BookOpen}
          accent="blue"
          actionLabel={L.common.seeMore}
        />
        <StatCard
          title={L.dashboard.statCards.overdueBooks}
          value={stats?.overdueBooks ?? 0}
          href="/student/my-library"
          icon={AlertTriangle}
          accent="rose"
          actionLabel={L.common.seeMore}
        />
        <StatCard
          title={L.dashboard.statCards.pendingRequests}
          value={stats?.pendingRequests ?? 0}
          href="/student/my-library?tab=requests"
          icon={ClipboardList}
          accent="amber"
          actionLabel={L.common.seeMore}
        />
        <StatCard
          title={L.dashboard.statCards.activeReservations}
          value={stats?.activeReservations ?? 0}
          href="/student/my-library?tab=reservations"
          icon={Bookmark}
          accent="purple"
          actionLabel={L.common.seeMore}
        />
        <StatCard
          title={L.dashboard.statCards.outstandingFines}
          value={`Rs. ${stats?.outstandingFines ?? 0}`}
          href="/student/fines"
          icon={Receipt}
          accent="cyan"
          actionLabel={L.common.seeMore}
        />
        <StatCard
          title={L.dashboard.statCards.openSupport}
          value={stats?.openSupportTickets ?? 0}
          href="/student/support"
          icon={LifeBuoy}
          accent="indigo"
          actionLabel={L.common.seeMore}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">{L.dashboard.sections.borrowedBooks}</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to="/student/my-library">{L.common.viewAll}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {borrowedBooks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{L.dashboard.empty.borrowedBooks}</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {borrowedBooks.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 list-item-hover transition-colors"
                  >
                    <span className="font-medium truncate">{getBookTitle(item.book)}</span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                      {item.status === 'overdue' ? 'past due' : item.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">{L.dashboard.sections.pendingRequests}</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to="/student/my-library?tab=requests">{L.common.viewAll}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">{L.dashboard.empty.pendingRequests}</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {pendingRequests.map((request) => (
                  <li
                    key={request.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 list-item-hover transition-colors"
                  >
                    <span className="font-medium truncate">{getBookTitle(request.book)}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatDate(request.requestDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{L.dashboard.sections.quickActions}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[
            { to: '/student/books', label: L.dashboard.actions.browseBooks },
            { to: '/student/my-library', label: L.dashboard.actions.myLibrary },
            { to: '/student/fines', label: L.dashboard.actions.myFines },
            { to: '/student/support', label: L.dashboard.actions.support },
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
