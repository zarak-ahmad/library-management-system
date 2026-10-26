import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Pagination } from '@/components/common/Pagination';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { borrowApi, getBookTitle, getStudentName } from '@/api/borrow.api';

export default function ReservationsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('active');

  const { data, isLoading } = useQuery({
    queryKey: ['reservations', page, statusFilter],
    queryFn: () =>
      borrowApi.listReservations({
        page,
        limit: 10,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const reservations = data?.data || [];
  const meta = data?.meta;

  return (
    <DashboardLayout title="Reservations">
      <div className="mb-6 w-full sm:w-[200px]">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="list-header">
                <th className="text-left p-4">Reservation ID</th>
                <th className="text-left p-4">Student</th>
                <th className="text-left p-4">Book</th>
                <th className="text-left p-4 hidden md:table-cell">Expires</th>
                <th className="text-left p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : reservations.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No reservations</td></tr>
              ) : (
                reservations.map((r) => (
                  <tr key={r.id} className="list-row-hover">
                    <td className="p-4 font-mono text-xs">{r.reservationId}</td>
                    <td className="p-4">{getStudentName(r.student)}</td>
                    <td className="p-4">{getBookTitle(r.book)}</td>
                    <td className="p-4 hidden md:table-cell">
                      {new Date(r.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="p-4 capitalize">{r.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {meta && <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />}
    </DashboardLayout>
  );
}
