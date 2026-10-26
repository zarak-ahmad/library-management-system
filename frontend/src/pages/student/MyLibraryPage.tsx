import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { borrowApi, getBookTitle } from '@/api/borrow.api';
import { useToast } from '@/components/ui/use-toast';
import { studentLabels as L } from '@/constants/studentLabels';

type Tab = 'borrowed' | 'requests' | 'reservations';

const isTab = (value: string | null): value is Tab =>
  value === 'borrowed' || value === 'requests' || value === 'reservations';

const ACTIVE_REQUEST_STATUSES = [
  'pending',
  'pending_confirm',
  'confirmed',
  'awaiting_confirmation',
] as const;

const isActiveRequest = (status: string) =>
  (ACTIVE_REQUEST_STATUSES as readonly string[]).includes(status);

const requestStatusLabel = (status: string) => {
  if (status === 'pending' || status === 'pending_confirm') return L.myLibrary.status.pendingConfirm;
  if (status === 'awaiting_confirmation') return L.myLibrary.status.awaitingPickup;
  if (status === 'confirmed') return L.myLibrary.status.pendingApproval;
  if (status === 'canceled') return 'Canceled';
  return status.replace(/_/g, ' ');
};

const tabLabels: Record<Tab, string> = {
  borrowed: L.myLibrary.tabs.borrowed,
  requests: L.myLibrary.tabs.requests,
  reservations: L.myLibrary.tabs.reservations,
};

export default function MyLibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState<Tab>(isTab(tabParam) ? tabParam : 'borrowed');
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: borrowedData, isLoading: borrowedLoading } = useQuery({
    queryKey: ['transactions', 'mine', page],
    queryFn: () => borrowApi.listTransactions({ page, limit: 10, status: 'borrowed' }),
    enabled: tab === 'borrowed',
  });

  const { data: overdueData } = useQuery({
    queryKey: ['transactions', 'overdue', page],
    queryFn: () => borrowApi.listTransactions({ page, limit: 10, status: 'overdue' }),
    enabled: tab === 'borrowed',
  });

  const { data: pendingRequestsData, isLoading: pendingRequestsLoading } = useQuery({
    queryKey: ['book-requests', 'mine', 'active', page],
    queryFn: () => borrowApi.listRequests({ page, limit: 20, status: 'active' }),
    enabled: tab === 'borrowed',
  });

  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['book-requests', 'mine', page],
    queryFn: () => borrowApi.listRequests({ page, limit: 10 }),
    enabled: tab === 'requests',
  });

  const { data: reservationsData, isLoading: reservationsLoading } = useQuery({
    queryKey: ['reservations', 'mine', page],
    queryFn: () => borrowApi.listReservations({ page, limit: 10 }),
    enabled: tab === 'reservations',
  });

  const cancelReservation = useMutation({
    mutationFn: borrowApi.cancelReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'student'] });
      toast({ title: 'Hold cancelled', description: 'Your reservation was removed.' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  const cancelRequest = useMutation({
    mutationFn: borrowApi.cancelRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book-requests'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'student'] });
      toast({ title: 'Request cancelled', description: 'You can request this book again anytime.' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  const borrowed = [...(borrowedData?.data || []), ...(overdueData?.data || [])];
  const pendingRequests = pendingRequestsData?.data || [];
  const requests = requestsData?.data || [];
  const reservations = reservationsData?.data || [];
  const meta =
    tab === 'borrowed'
      ? borrowedData?.meta
      : tab === 'requests'
        ? requestsData?.meta
        : reservationsData?.meta;

  const formatDate = (d: string) => new Date(d).toLocaleDateString();
  const borrowedTabLoading = borrowedLoading || pendingRequestsLoading;
  const borrowedTabEmpty = borrowed.length === 0 && pendingRequests.length === 0;

  const formatBorrowStatus = (status: string) =>
    status === 'overdue' ? L.myLibrary.status.pastDue : status;

  return (
    <DashboardLayout title={L.myLibrary.title}>
      <div className="flex flex-wrap gap-2 mb-6">
        {(['borrowed', 'requests', 'reservations'] as Tab[]).map((t) => (
          <Button
            key={t}
            variant={tab === t ? 'default' : 'outline'}
            onClick={() => {
              setTab(t);
              setPage(1);
              setSearchParams(t === 'borrowed' ? {} : { tab: t });
            }}
          >
            {tabLabels[t]}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {tab === 'borrowed' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="list-header">
                  <th className="text-left p-4">Book</th>
                  <th className="text-left p-4 hidden md:table-cell">{L.myLibrary.columns.borrowedOn}</th>
                  <th className="text-left p-4">{L.myLibrary.columns.dueDate}</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {borrowedTabLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      {L.common.loading}
                    </td>
                  </tr>
                ) : borrowedTabEmpty ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      {L.myLibrary.empty.borrowed}
                    </td>
                  </tr>
                ) : (
                  <>
                    {pendingRequests.map((request) => (
                      <tr key={`req-${request.id}`} className="list-highlight-row">
                        <td className="p-4 font-medium">{getBookTitle(request.book)}</td>
                        <td className="p-4 hidden md:table-cell">{formatDate(request.requestDate)}</td>
                        <td className="p-4 text-muted-foreground">—</td>
                        <td className="p-4">
                          <span className="text-amber-700 dark:text-amber-400 font-medium">
                            {requestStatusLabel(request.status)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelRequest.mutate(request.id)}
                            disabled={cancelRequest.isPending}
                          >
                            {L.myLibrary.cancelRequest}
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {borrowed.map((t) => (
                      <tr key={t.id} className="border-b">
                        <td className="p-4 font-medium">{getBookTitle(t.book)}</td>
                        <td className="p-4 hidden md:table-cell">{formatDate(t.issueDate)}</td>
                        <td className="p-4">{formatDate(t.dueDate)}</td>
                        <td className="p-4 capitalize">{formatBorrowStatus(t.status)}</td>
                        <td className="p-4" />
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          )}

          {tab === 'requests' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="list-header">
                  <th className="text-left p-4">Book</th>
                  <th className="text-left p-4 hidden md:table-cell">{L.myLibrary.columns.requestDate}</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requestsLoading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      {L.common.loading}
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      {L.myLibrary.empty.requests}
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="p-4 font-medium">{getBookTitle(r.book)}</td>
                      <td className="p-4 hidden md:table-cell">{formatDate(r.requestDate)}</td>
                      <td className="p-4">{requestStatusLabel(r.status)}</td>
                      <td className="p-4 text-right">
                        {isActiveRequest(r.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelRequest.mutate(r.id)}
                            disabled={cancelRequest.isPending}
                          >
                            {L.myLibrary.cancelRequest}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {tab === 'reservations' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="list-header">
                  <th className="text-left p-4">Book</th>
                  <th className="text-left p-4 hidden md:table-cell">{L.myLibrary.columns.reservedOn}</th>
                  <th className="text-left p-4 hidden md:table-cell">{L.myLibrary.columns.expiresOn}</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reservationsLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      {L.common.loading}
                    </td>
                  </tr>
                ) : reservations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      {L.myLibrary.empty.reservations}
                    </td>
                  </tr>
                ) : (
                  reservations.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="p-4 font-medium">{getBookTitle(r.book)}</td>
                      <td className="p-4 hidden md:table-cell">{formatDate(r.reservationDate)}</td>
                      <td className="p-4 hidden md:table-cell">{formatDate(r.expiryDate)}</td>
                      <td className="p-4 capitalize">{r.status}</td>
                      <td className="p-4 text-right">
                        {r.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelReservation.mutate(r.id)}
                          >
                            {L.myLibrary.cancelReservation}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {meta && tab !== 'borrowed' && (
        <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
      )}
    </DashboardLayout>
  );
}
