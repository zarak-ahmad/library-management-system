import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout, StatCard } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { dashboardApi } from '@/api/dashboard.api';

const PREVIEW_COUNT = 2;

function ExpandableList<T>({
  items,
  emptyMessage,
  showAll,
  onToggle,
  getKey,
  renderItem,
}: {
  items: T[];
  emptyMessage: string;
  showAll: boolean;
  onToggle: () => void;
  getKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const visibleItems = showAll ? items : items.slice(0, PREVIEW_COUNT);
  const hasMore = items.length > PREVIEW_COUNT;

  return (
    <div className="space-y-3">
      <ul className={showAll && items.length > PREVIEW_COUNT ? 'space-y-2 text-sm max-h-96 overflow-y-auto pr-1' : 'space-y-2 text-sm'}>
        {visibleItems.map((item) => (
          <li key={getKey(item)}>{renderItem(item)}</li>
        ))}
      </ul>
      {hasMore && (
        <Button variant="link" className="h-auto p-0 text-sm" onClick={onToggle}>
          {showAll ? 'Show less' : `View all (${items.length})`}
        </Button>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);

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

  const transactions = stats?.recentTransactions || [];
  const activities = stats?.recentActivities || [];

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Books" value={stats?.totalBooks ?? 0} />
        <StatCard title="Total Copies of All Books" value={stats?.totalCopiesOfAllBooks ?? 0} />
        <StatCard title="Borrowed Books" value={stats?.borrowedBooks ?? 0} />
        <StatCard title="Total Students" value={stats?.totalStudents ?? 0} />
        <StatCard title="Active Students" value={stats?.activeStudents ?? 0} />
        <StatCard title="Blocked Students" value={stats?.blockedStudents ?? 0} />
        <StatCard title="Pending Requests" value={stats?.pendingRequests ?? 0} />
        <StatCard title="Outstanding Fines" value={`Rs. ${stats?.outstandingFines ?? 0}`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpandableList
              items={transactions}
              emptyMessage="No recent transactions"
              showAll={showAllTransactions}
              onToggle={() => setShowAllTransactions((prev) => !prev)}
              getKey={(t) => t.id}
              renderItem={(t) => (
                <div className="flex justify-between gap-2 border-b pb-2">
                  <span>
                    {t.book?.title || 'Book'} — {t.student?.fullName}
                  </span>
                  <span className="text-muted-foreground capitalize">{t.status}</span>
                </div>
              )}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpandableList
              items={activities}
              emptyMessage="No recent activity"
              showAll={showAllActivities}
              onToggle={() => setShowAllActivities((prev) => !prev)}
              getKey={(a) => a.id}
              renderItem={(a) => (
                <div className="border-b pb-2">
                  <p className="font-medium">{a.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.user?.fullName} · {new Date(a.timestamp).toLocaleString()}
                  </p>
                </div>
              )}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
