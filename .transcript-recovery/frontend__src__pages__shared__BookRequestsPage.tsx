import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Check, Clock, Eye, X, CheckCircle2, XCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  borrowApi,
  getBookTitle,
  getBookAuthor,
  getStudentName,
  BookRequest,
} from '@/api/borrow.api';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

const formatTime = (value?: string) =>
  value ? new Date(value).toLocaleTimeString(undefined, { timeStyle: 'short' }) : '—';

const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

function StatusBadge({ status }: { status: BookRequest['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
        status === 'pending' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
        status === 'approved' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        status === 'rejected' && 'bg-red-500/10 text-red-700 dark:text-red-400'
      )}
    >
      {status === 'pending' && <Clock className="h-3 w-3" />}
      {status === 'approved' && <CheckCircle2 className="h-3 w-3" />}
      {status === 'rejected' && <XCircle className="h-3 w-3" />}
      {status}
    </span>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value}</p>
    </div>
  );
}

function SummaryStatCard({
  title,
  value,
  active,
  onClick,
  accent,
}: {
  title: string;
  value: number;
  active: boolean;
  onClick: () => void;
  accent?: 'amber' | 'green' | 'red' | 'blue';
}) {
  const accentRing = {
    amber: 'ring-amber-500/40 border-amber-500/30',
    green: 'ring-emerald-500/40 border-emerald-500/30',
    red: 'ring-red-500/40 border-red-500/30',
    blue: 'ring-primary/40 border-primary/30',
  };

  return (
    <button type="button" onClick={onClick} className="text-left w-full group">
      <Card
        className={cn(
          'h-full transition-all hover:-translate-y-0.5 hover:shadow-glow cursor-pointer',
          active && `ring-2 ${accent ? accentRing[accent] : accentRing.blue}`
        )}
      >
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-xs font-medium text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            View records →
          </p>
        </CardContent>
      </Card>
    </button>
  );
}

function useRequestCount(status?: string) {
  return useQuery({
    queryKey: ['book-requests', 'stats', status ?? 'all'],
    queryFn: () =>
      borrowApi.listRequests({
        page: 1,
        limit: 1,
        status: status && status !== 'all' ? status : undefined,
      }),
  });
}

export default function BookRequestsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [selectedRequest, setSelectedRequest] = useState<BookRequest | null>(null);
  const [actionRequest, setActionRequest] = useState<{
    request: BookRequest;
    action: 'approve' | 'reject';
  } | null>(null);
  const [remarks, setRemarks] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingStats } = useRequestCount('pending');
  const { data: approvedStats } = useRequestCount('approved');
  const { data: rejectedStats } = useRequestCount('rejected');
  const { data: allStats } = useRequestCount();

  const pendingCount = pendingStats?.meta?.total ?? 0;
  const approvedCount = approvedStats?.meta?.total ?? 0;
  const rejectedCount = rejectedStats?.meta?.total ?? 0;
  const allCount = allStats?.meta?.total ?? 0;

  const { data, isLoading } = useQuery({
    queryKey: ['book-requests', page, statusFilter],
    queryFn: () =>
      borrowApi.listRequests({
        page,
        limit: 10,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const requests = data?.data || [];
  const meta = data?.meta;

  const approveMutation = useMutation({
    mutationFn: ({ id, remarks: r }: { id: string; remarks?: string }) =>
      borrowApi.approveRequest(id, r),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book-requests'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setActionRequest(null);
      setSelectedRequest(null);
      setRemarks('');
      toast({ title: 'Approved', description: 'Book issued to student.' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, remarks: r }: { id: string; remarks?: string }) =>
      borrowApi.rejectRequest(id, r),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book-requests'] });
      setActionRequest(null);
      setSelectedRequest(null);
      setRemarks('');
      toast({ title: 'Rejected', description: 'Request rejected.' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  const handleConfirm = () => {
    if (!actionRequest) return;
    if (actionRequest.action === 'approve') {
      approveMutation.mutate({ id: actionRequest.request.id, remarks });
    } else {
      rejectMutation.mutate({ id: actionRequest.request.id, remarks });
    }
  };

  const setFilter = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setPage(1);
  };

  const openAction = (request: BookRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(null);
    setActionRequest({ request, action });
    setRemarks('');
  };

  const filterLabel: Record<StatusFilter, string> = {
    pending: 'Pending Requests',
    approved: 'Approved Requests',
    rejected: 'Rejected Requests',
    all: 'All Requests',
  };

  return (
    <DashboardLayout title="Book Requests" subtitle="Review and manage student book requests">
      <p className="text-sm text-muted-foreground mb-4">
        Click a summary card to filter requests, or click any row to view full details and take
        action on pending items.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <SummaryStatCard
          title="Pending"
          value={pendingCount}
          active={statusFilter === 'pending'}
          accent="amber"
          onClick={() => setFilter('pending')}
        />
        <SummaryStatCard
          title="Approved"
          value={approvedCount}
          active={statusFilter === 'approved'}
          accent="green"
          onClick={() => setFilter('approved')}
        />
        <SummaryStatCard
          title="Rejected"
          value={rejectedCount}
          active={statusFilter === 'rejected'}
          accent="red"
          onClick={() => setFilter('rejected')}
        />
        <SummaryStatCard
          title="All Requests"
          value={allCount}
          active={statusFilter === 'all'}
          accent="blue"
          onClick={() => setFilter('all')}
        />
      </div>

      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-base font-semibold">{filterLabel[statusFilter]}</h2>
        <p className="text-sm text-muted-foreground">
          {meta?.total ?? 0} record{(meta?.total ?? 0) !== 1 ? 's' : ''}
        </p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4">Request ID</th>
                <th className="text-left p-4">Student</th>
                <th className="text-left p-4">Book</th>
                <th className="text-left p-4 hidden md:table-cell">Requested</th>
                <th className="text-left p-4 hidden lg:table-cell">Processed</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Details</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8">
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <p className="text-muted-foreground">No {statusFilter} requests found.</p>
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedRequest(r)}
                  >
                    <td className="p-4 font-mono text-xs text-primary">{r.requestId}</td>
                    <td className="p-4">{getStudentName(r.student)}</td>
                    <td className="p-4 max-w-[200px] truncate">{getBookTitle(r.book)}</td>
                    <td className="p-4 hidden md:table-cell text-muted-foreground">
                      {formatDate(r.requestDate)}
                    </td>
                    <td className="p-4 hidden lg:table-cell text-muted-foreground">
                      {r.processedAt ? formatDate(r.processedAt) : '—'}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="p-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1.5 text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequest(r);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {r.status === 'pending' && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10"
                            onClick={() => openAction(r, 'approve')}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => openAction(r, 'reject')}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {meta && <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />}

      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 pr-6">
              <div>
                <DialogTitle>Request Details</DialogTitle>
                <DialogDescription className="mt-1 font-mono text-xs">
                  {selectedRequest?.requestId}
                </DialogDescription>
              </div>
              {selectedRequest && <StatusBadge status={selectedRequest.status} />}
            </div>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-3">Student</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailItem label="Name" value={getStudentName(selectedRequest.student)} />
                  <DetailItem
                    label="Registration No."
                    value={selectedRequest.student?.studentProfile?.registrationNumber || '—'}
                  />
                  <DetailItem label="Email" value={selectedRequest.student?.email || '—'} />
                  <DetailItem
                    label="Account Status"
                    value={
                      <span className="capitalize">{selectedRequest.student?.status || '—'}</span>
                    }
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3">Book</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailItem label="Title" value={getBookTitle(selectedRequest.book)} />
                  <DetailItem label="Author" value={getBookAuthor(selectedRequest.book)} />
                  <DetailItem
                    label="Book ID"
                    value={
                      <span className="font-mono text-xs">
                        {'bookId' in selectedRequest.book
                          ? selectedRequest.book.bookId || '—'
                          : '—'}
                      </span>
                    }
                  />
                  <DetailItem
                    label="Available Copies"
                    value={
                      'availableCopies' in selectedRequest.book
                        ? selectedRequest.book.availableCopies ?? '—'
                        : '—'
                    }
                  />
                  <DetailItem
                    label="ISBN"
                    value={
                      'isbn' in selectedRequest.book ? selectedRequest.book.isbn || '—' : '—'
                    }
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3">Request Timeline</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailItem label="Requested Date" value={formatDate(selectedRequest.requestDate)} />
                  <DetailItem label="Requested Time" value={formatTime(selectedRequest.requestDate)} />
                  <DetailItem
                    label="Processed Date"
                    value={formatDate(selectedRequest.processedAt)}
                  />
                  <DetailItem
                    label="Processed Time"
                    value={formatTime(selectedRequest.processedAt)}
                  />
                  {selectedRequest.status === 'approved' && (
                    <DetailItem
                      label="Approved By"
                      value={selectedRequest.approvedBy?.fullName || '—'}
                    />
                  )}
                  {selectedRequest.status === 'rejected' && (
                    <DetailItem
                      label="Rejected By"
                      value={selectedRequest.rejectedBy?.fullName || '—'}
                    />
                  )}
                  {selectedRequest.remarks && (
                    <div className="sm:col-span-2">
                      <DetailItem label="Remarks" value={selectedRequest.remarks} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedRequest?.status === 'pending' && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => openAction(selectedRequest, 'reject')}>
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button onClick={() => openAction(selectedRequest, 'approve')}>
                <Check className="h-4 w-4 mr-1" />
                Approve & Issue Book
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionRequest} onOpenChange={() => setActionRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionRequest?.action === 'approve' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogDescription>
              {actionRequest &&
                `${getStudentName(actionRequest.request.student)} — ${getBookTitle(actionRequest.request.book)}`}
            </DialogDescription>
          </DialogHeader>

          {actionRequest?.action === 'approve' && (
            <p className="text-sm text-muted-foreground rounded-lg border bg-muted/30 p-3">
              Approving will issue this book to the student immediately.
            </p>
          )}

          <Textarea
            placeholder="Remarks (optional)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionRequest(null)}>
              Cancel
            </Button>
            <Button
              variant={actionRequest?.action === 'reject' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            >
              {approveMutation.isPending || rejectMutation.isPending
                ? 'Processing...'
                : actionRequest?.action === 'approve'
                  ? 'Confirm Approval'
                  : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
