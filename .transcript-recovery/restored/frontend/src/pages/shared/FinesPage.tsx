import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Eye } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fineApi,
  Fine,
  Payment,
  FinanceDetails,
  FineWithPayment,
  getFineBookTitle,
  getFineStudentName,
  settingsApi,
} from '@/api/fine.api';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

const formatTime = (value?: string) =>
  value ? new Date(value).toLocaleTimeString(undefined, { timeStyle: 'short' }) : '—';

const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toTimeInputValue = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

function StatusBadge({ status }: { status: Fine['paymentStatus'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
        status === 'pending' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
        status === 'paid' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        status === 'waived' && 'bg-muted text-muted-foreground'
      )}
    >
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

type SummaryView = 'outstanding' | 'pending' | 'paid' | 'waived';

function SummaryStatCard({
  title,
  value,
  onClick,
}: {
  title: string;
  value: string | number;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left w-full group">
      <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-glow hover:border-primary/30 cursor-pointer">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-xs font-medium text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            View details →
          </p>
        </CardContent>
      </Card>
    </button>
  );
}

export default function FinesPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'librarian';
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [detailsFineId, setDetailsFineId] = useState<string | null>(null);
  const [selectedFine, setSelectedFine] = useState<Fine | null>(null);
  const [action, setAction] = useState<'pay' | 'waive' | 'edit' | null>(null);
  const [payMethod, setPayMethod] = useState<'cash' | 'online'>('cash');
  const [payDiscount, setPayDiscount] = useState('0');
  const [payDate, setPayDate] = useState(() => toDateInputValue(new Date()));
  const [payTime, setPayTime] = useState(() => toTimeInputValue(new Date()));
  const [payNotes, setPayNotes] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [waiveReason, setWaiveReason] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [summaryView, setSummaryView] = useState<SummaryView | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: summary } = useQuery({
    queryKey: ['fines', 'summary'],
    queryFn: () => fineApi.getSummary(),
  });

  const { data: financeResponse, isLoading: financeLoading } = useQuery({
    queryKey: ['fines', 'finance-details'],
    queryFn: () => fineApi.getFinanceDetails(),
    enabled: !!summaryView,
  });

  const finance = financeResponse?.data;

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const ratePerDay = settingsData?.data?.fineRules.ratePerDay ?? 50;

  const { data, isLoading } = useQuery({
    queryKey: ['fines', page, statusFilter],
    queryFn: () =>
      fineApi.list({
        page,
        limit: 10,
        paymentStatus: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const { data: fineDetailsResponse, isLoading: detailsLoading } = useQuery({
    queryKey: ['fines', detailsFineId],
    queryFn: () => fineApi.getById(detailsFineId!),
    enabled: !!detailsFineId,
  });

  const { data: paymentsResponse, isLoading: paymentsLoading } = useQuery({
    queryKey: ['fines', detailsFineId, 'payments'],
    queryFn: () => fineApi.listPayments(detailsFineId!),
    enabled: !!detailsFineId,
  });

  const detailsFine = fineDetailsResponse?.data;
  const payments = paymentsResponse?.data || [];

  const payMutation = useMutation({
    mutationFn: ({
      id,
      method,
      receipt,
      discount,
      amountPaid,
      paymentDate,
      paymentTime,
      notes,
    }: {
      id: string;
      method: 'cash' | 'online';
      receipt?: string;
      discount: number;
      amountPaid: number;
      paymentDate: string;
      paymentTime: string;
      notes?: string;
    }) =>
      fineApi.pay(id, {
        paymentMethod: method,
        receiptNumber: receipt,
        discount,
        amountPaid,
        paymentDate,
        paymentTime,
        notes,
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['fines'] });
      closeActionDialog();
      const paid = response.data?.payment?.amount;
      const discount = response.data?.payment?.discount ?? 0;
      toast({
        title: 'Payment recorded',
        description:
          discount > 0
            ? `Rs. ${paid} collected (Rs. ${discount} discount applied).`
            : `Rs. ${paid} collected successfully.`,
      });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  const waiveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => fineApi.waive(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fines'] });
      closeActionDialog();
      toast({ title: 'Fine waived' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, amount, notes }: { id: string; amount: number; notes?: string }) =>
      fineApi.edit(id, { amount, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fines'] });
      closeActionDialog();
      toast({ title: 'Fine updated' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  const closeDetailsDialog = () => setDetailsFineId(null);

  const closeActionDialog = () => {
    setSelectedFine(null);
    setAction(null);
    setPayMethod('cash');
    setPayDiscount('0');
    setPayDate(toDateInputValue(new Date()));
    setPayTime(toTimeInputValue(new Date()));
    setPayNotes('');
    setReceiptNumber('');
    setWaiveReason('');
    setEditAmount('');
    setEditNotes('');
  };

  const openDetails = (fine: Fine) => setDetailsFineId(fine.id);

  const openAction = (fine: Fine, act: 'pay' | 'waive' | 'edit') => {
    closeDetailsDialog();
    setSelectedFine(fine);
    setAction(act);
    if (act === 'edit') {
      setEditAmount(String(fine.amount));
      setEditNotes(fine.notes || '');
    }
    if (act === 'pay') {
      const now = new Date();
      setPayDiscount('0');
      setPayDate(toDateInputValue(now));
      setPayTime(toTimeInputValue(now));
      setPayNotes('');
      setReceiptNumber('');
      setPayMethod('cash');
    }
  };

  const openSummaryView = (view: SummaryView) => {
    setSummaryView(view);
    if (view === 'pending' || view === 'paid' || view === 'waived') {
      setStatusFilter(view);
      setPage(1);
    }
  };

  const openFineFromSummary = (fine: Fine) => {
    setSummaryView(null);
    openDetails(fine);
  };

  const renderFinanceOverview = (data: FinanceDetails) => (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-amber-500/5 border-amber-500/20 p-4">
          <p className="text-xs text-muted-foreground">Outstanding (Pending)</p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
            Rs. {data.outstandingTotal}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{data.pendingCount} fine(s)</p>
        </div>
        <div className="rounded-xl border bg-emerald-500/5 border-emerald-500/20 p-4">
          <p className="text-xs text-muted-foreground">Total Collected</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
            Rs. {data.paidTotalCollected}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{data.paidCount} paid fine(s)</p>
        </div>
        <div className="rounded-xl border bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">Total Waived</p>
          <p className="text-xl font-bold">Rs. {data.waivedTotalAmount}</p>
          <p className="text-xs text-muted-foreground mt-1">{data.waivedCount} waived fine(s)</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Total Discounts Given</p>
          <p className="text-xl font-bold">Rs. {data.totalDiscount}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Total Fines Recorded</p>
          <p className="text-xl font-bold">{data.totalFinesCount}</p>
        </div>
      </div>

      {data.pending.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Pending Fines</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
            {data.pending.map((fine) => (
              <button
                key={fine.id}
                type="button"
                onClick={() => openFineFromSummary(fine)}
                className="w-full text-left rounded-lg border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-mono text-xs">{fine.fineId}</span>
                  <span className="font-semibold">Rs. {fine.amount}</span>
                </div>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {getFineStudentName(fine.student)} · {getFineBookTitle(fine)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {data.paid.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Recent Paid Fines</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
            {data.paid.slice(0, 10).map((fine) => (
              <button
                key={fine.id}
                type="button"
                onClick={() => openFineFromSummary(fine)}
                className="w-full text-left rounded-lg border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-mono text-xs">{fine.fineId}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Rs. {fine.payment?.amount ?? fine.amount}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {getFineStudentName(fine.student)} ·{' '}
                  {formatDateTime(fine.payment?.paidAt || fine.paymentDate)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderPendingList = (items: Fine[]) => (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No pending fines.</p>
      ) : (
        items.map((fine) => (
          <div key={fine.id} className="rounded-xl border p-4 text-sm space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-primary">{fine.fineId}</p>
                <p className="font-medium mt-1">{getFineBookTitle(fine)}</p>
              </div>
              <StatusBadge status="pending" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Student" value={getFineStudentName(fine.student)} />
              <DetailItem label="Amount Due" value={`Rs. ${fine.amount}`} />
              <DetailItem label="Overdue Days" value={fine.overdueDays} />
              <DetailItem label="Rate / Day" value={`Rs. ${fine.ratePerDay}`} />
              <DetailItem label="Due Date" value={formatDate(fine.transaction?.dueDate)} />
              <DetailItem label="Fine Created" value={formatDateTime(fine.createdAt)} />
            </div>
            <Button size="sm" variant="outline" onClick={() => openFineFromSummary(fine)}>
              View Full Details
            </Button>
          </div>
        ))
      )}
    </div>
  );

  const renderPaidList = (items: FineWithPayment[]) => (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No paid fines.</p>
      ) : (
        items.map((fine) => (
          <div key={fine.id} className="rounded-xl border p-4 text-sm space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-primary">{fine.fineId}</p>
                <p className="font-medium mt-1">{getFineBookTitle(fine)}</p>
              </div>
              <StatusBadge status="paid" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Paid By (Student)" value={getFineStudentName(fine.student)} />
              <DetailItem
                label="Received By"
                value={
                  fine.payment?.collectedBy
                    ? `${fine.payment.collectedBy.fullName} (${fine.payment.collectedBy.role})`
                    : '—'
                }
              />
              <DetailItem
                label="Payment Date"
                value={formatDate(fine.payment?.paidAt || fine.paymentDate)}
              />
              <DetailItem
                label="Payment Time"
                value={formatTime(fine.payment?.paidAt || fine.paymentDate)}
              />
              <DetailItem label="Original Amount" value={`Rs. ${fine.payment?.originalAmount ?? fine.amount}`} />
              <DetailItem label="Discount" value={`Rs. ${fine.payment?.discount ?? 0}`} />
              <DetailItem label="Total Paid" value={`Rs. ${fine.payment?.amount ?? fine.amount}`} />
              <DetailItem
                label="Payment Method"
                value={<span className="capitalize">{fine.payment?.paymentMethod || '—'}</span>}
              />
              <DetailItem label="Receipt No." value={fine.payment?.receiptNumber || '—'} />
            </div>
            <Button size="sm" variant="outline" onClick={() => openFineFromSummary(fine)}>
              View Full Details
            </Button>
          </div>
        ))
      )}
    </div>
  );

  const renderWaivedList = (items: FineWithPayment[]) => (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No waived fines.</p>
      ) : (
        items.map((fine) => (
          <div key={fine.id} className="rounded-xl border p-4 text-sm space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-primary">{fine.fineId}</p>
                <p className="font-medium mt-1">{getFineBookTitle(fine)}</p>
              </div>
              <StatusBadge status="waived" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Student" value={getFineStudentName(fine.student)} />
              <DetailItem label="Waived Amount" value={`Rs. ${fine.amount}`} />
              <DetailItem label="Waived By" value={fine.waivedBy?.fullName || '—'} />
              <DetailItem label="Waive Date" value={formatDate(fine.paymentDate)} />
              <DetailItem label="Waive Time" value={formatTime(fine.paymentDate)} />
              <DetailItem label="Reason" value={fine.waivedReason || '—'} />
              <DetailItem
                label="Processed By"
                value={
                  fine.payment?.collectedBy
                    ? `${fine.payment.collectedBy.fullName} (${fine.payment.collectedBy.role})`
                    : fine.waivedBy?.fullName || '—'
                }
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => openFineFromSummary(fine)}>
              View Full Details
            </Button>
          </div>
        ))
      )}
    </div>
  );

  const summaryDialogTitle: Record<SummaryView, string> = {
    outstanding: 'Financial Overview',
    pending: 'Pending Fines',
    paid: 'Paid Fines',
    waived: 'Waived Fines',
  };

  const summaryDialogDescription: Record<SummaryView, string> = {
    outstanding: 'Complete breakdown of all fine finances',
    pending: 'All fines awaiting payment',
    paid: 'Payment history with dates, amounts, and staff details',
    waived: 'All waived fines with reasons and dates',
  };

  const fines = data?.data || [];
  const meta = data?.meta;
  const fineOriginalAmount = selectedFine?.amount ?? 0;
  const payDiscountNum = Math.max(0, Number(payDiscount) || 0);
  const payTotal = Math.max(0, fineOriginalAmount - payDiscountNum);
  const payDiscountInvalid = payDiscountNum > fineOriginalAmount;

  return (
    <DashboardLayout title="Fines" subtitle="Track overdue fines and payments">
      <p className="text-sm text-muted-foreground mb-4">
        Overdue books are fined at Rs. {ratePerDay} per day. Pending fines accrue daily until the
        book is returned or paid. Click a summary card or table row to view details.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <SummaryStatCard
          title="Outstanding Pending"
          value={`Rs. ${summary?.data?.outstandingTotal || 0}`}
          onClick={() => openSummaryView('outstanding')}
        />
        <SummaryStatCard
          title="Pending"
          value={summary?.data?.pendingCount || 0}
          onClick={() => openSummaryView('pending')}
        />
        <SummaryStatCard
          title="Paid"
          value={summary?.data?.paidCount || 0}
          onClick={() => openSummaryView('paid')}
        />
        <SummaryStatCard
          title="Waived"
          value={summary?.data?.waivedCount || 0}
          onClick={() => openSummaryView('waived')}
        />
      </div>

      <div className="mb-6 w-full sm:w-[200px]">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="waived">Waived</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4">Fine ID</th>
                {isStaff && <th className="text-left p-4">Student</th>}
                <th className="text-left p-4">Book</th>
                <th className="text-left p-4 hidden md:table-cell">Overdue Days</th>
                <th className="text-left p-4 hidden lg:table-cell">Rate/Day</th>
                <th className="text-left p-4">Amount</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Details</th>
                {isStaff && <th className="text-left p-4">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={isStaff ? 9 : 7}
                    className="p-8 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : fines.length === 0 ? (
                <tr>
                  <td
                    colSpan={isStaff ? 9 : 7}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No fines found
                  </td>
                </tr>
              ) : (
                fines.map((fine) => (
                  <tr
                    key={fine.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => openDetails(fine)}
                  >
                    <td className="p-4 font-mono text-xs text-primary">{fine.fineId}</td>
                    {isStaff && <td className="p-4">{getFineStudentName(fine.student)}</td>}
                    <td className="p-4">{getFineBookTitle(fine)}</td>
                    <td className="p-4 hidden md:table-cell">{fine.overdueDays}</td>
                    <td className="p-4 hidden lg:table-cell">Rs. {fine.ratePerDay}</td>
                    <td className="p-4 font-semibold">Rs. {fine.amount}</td>
                    <td className="p-4">
                      <StatusBadge status={fine.paymentStatus} />
                    </td>
                    <td className="p-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1.5 text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetails(fine);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </td>
                    {isStaff && (
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        {fine.paymentStatus === 'pending' && (
                          <div className="flex flex-wrap gap-1">
                            <Button size="sm" variant="outline" onClick={() => openAction(fine, 'pay')}>
                              Pay
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openAction(fine, 'waive')}>
                              Waive
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openAction(fine, 'edit')}>
                              Edit
                            </Button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {meta && <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />}

      <Dialog open={!!detailsFineId} onOpenChange={(open) => !open && closeDetailsDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 pr-6">
              <div>
                <DialogTitle>Fine Details</DialogTitle>
                <DialogDescription className="mt-1">
                  {detailsFine?.fineId || 'Loading fine information...'}
                </DialogDescription>
              </div>
              {detailsFine && <StatusBadge status={detailsFine.paymentStatus} />}
            </div>
          </DialogHeader>

          {detailsLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : detailsFine ? (
            <div className="space-y-6">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-3xl font-bold tracking-tight mt-1">Rs. {detailsFine.amount}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {detailsFine.overdueDays} day{detailsFine.overdueDays !== 1 ? 's' : ''} overdue ×
                  Rs. {detailsFine.ratePerDay}/day
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3">Student & Book</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  {isStaff && (
                    <>
                      <DetailItem label="Student" value={getFineStudentName(detailsFine.student)} />
                      <DetailItem
                        label="Registration No."
                        value={detailsFine.student?.studentProfile?.registrationNumber || '—'}
                      />
                      <DetailItem label="Email" value={detailsFine.student?.email || '—'} />
                    </>
                  )}
                  <DetailItem label="Book" value={getFineBookTitle(detailsFine)} />
                  <DetailItem
                    label="Author"
                    value={detailsFine.transaction?.book?.author || '—'}
                  />
                  <DetailItem
                    label="Transaction ID"
                    value={
                      <span className="font-mono text-xs">
                        {detailsFine.transaction?.transactionId || '—'}
                      </span>
                    }
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3">Borrowing Timeline</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailItem label="Issue Date" value={formatDate(detailsFine.transaction?.issueDate)} />
                  <DetailItem label="Due Date" value={formatDate(detailsFine.transaction?.dueDate)} />
                  <DetailItem
                    label="Return Date"
                    value={formatDate(detailsFine.transaction?.returnDate)}
                  />
                  <DetailItem label="Fine Created" value={formatDateTime(detailsFine.createdAt)} />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3">Payment Information</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailItem label="Status" value={<StatusBadge status={detailsFine.paymentStatus} />} />
                  <DetailItem label="Payment Date" value={formatDateTime(detailsFine.paymentDate)} />
                  {detailsFine.paymentStatus === 'waived' && (
                    <>
                      <DetailItem
                        label="Waived By"
                        value={detailsFine.waivedBy?.fullName || '—'}
                      />
                      <DetailItem label="Waive Reason" value={detailsFine.waivedReason || '—'} />
                    </>
                  )}
                  {detailsFine.notes && (
                    <div className="sm:col-span-2">
                      <DetailItem label="Notes" value={detailsFine.notes} />
                    </div>
                  )}
                </div>
              </div>

              {(paymentsLoading || payments.length > 0) && (
                <div>
                  <h4 className="text-sm font-semibold mb-3">Payment History</h4>
                  {paymentsLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <ul className="space-y-2">
                      {payments.map((payment: Payment) => (
                        <li
                          key={payment.id}
                          className="rounded-lg border px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2"
                        >
                          <div>
                            <p className="font-medium font-mono text-xs">{payment.paymentId}</p>
                            <p className="text-muted-foreground text-xs mt-0.5">
                              {formatDate(payment.paidAt || payment.createdAt)} at{' '}
                              {formatTime(payment.paidAt || payment.createdAt)} ·{' '}
                              <span className="capitalize">{payment.paymentMethod}</span>
                              {payment.receiptNumber && ` · Receipt ${payment.receiptNumber}`}
                              {(payment.discount ?? 0) > 0 &&
                                ` · Discount Rs. ${payment.discount}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">Rs. {payment.amount}</p>
                            {payment.originalAmount != null &&
                              payment.originalAmount !== payment.amount && (
                                <p className="text-xs text-muted-foreground line-through">
                                  Rs. {payment.originalAmount}
                                </p>
                              )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">Fine not found.</p>
          )}

          {detailsFine && isStaff && detailsFine.paymentStatus === 'pending' && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => openAction(detailsFine, 'edit')}>
                Edit Amount
              </Button>
              <Button variant="outline" onClick={() => openAction(detailsFine, 'waive')}>
                Waive
              </Button>
              <Button onClick={() => openAction(detailsFine, 'pay')}>Record Payment</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedFine && !!action} onOpenChange={(open) => !open && closeActionDialog()}>
        <DialogContent className={action === 'pay' ? 'max-w-lg' : undefined}>
          <DialogHeader>
            <DialogTitle>
              {action === 'pay' && 'Record Fine Payment'}
              {action === 'waive' && 'Waive Fine'}
              {action === 'edit' && 'Edit Fine Amount'}
            </DialogTitle>
            {selectedFine && (
              <DialogDescription>
                {selectedFine.fineId} · {getFineBookTitle(selectedFine)} ·{' '}
                {getFineStudentName(selectedFine.student)}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedFine && action === 'pay' && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Original Fine Amount</span>
                  <span className="font-semibold">Rs. {fineOriginalAmount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    − Rs. {payDiscountNum}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-medium">Total Paid</span>
                  <span className="text-xl font-bold text-primary">Rs. {payTotal}</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="payDiscount">Discount (Rs.)</Label>
                  <Input
                    id="payDiscount"
                    type="number"
                    min={0}
                    max={fineOriginalAmount}
                    value={payDiscount}
                    onChange={(e) => setPayDiscount(e.target.value)}
                  />
                  {payDiscountInvalid && (
                    <p className="text-xs text-destructive">Discount cannot exceed fine amount</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Total Paid (Rs.)</Label>
                  <Input value={payTotal} readOnly disabled className="bg-muted font-semibold" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="payDate">Payment Date</Label>
                  <Input
                    id="payDate"
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payTime">Payment Time</Label>
                  <Input
                    id="payTime"
                    type="time"
                    value={payTime}
                    onChange={(e) => setPayTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={payMethod} onValueChange={(v) => setPayMethod(v as 'cash' | 'online')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiptNumber">Receipt Number (optional)</Label>
                <Input
                  id="receiptNumber"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payNotes">Notes (optional)</Label>
                <Textarea
                  id="payNotes"
                  placeholder="Payment notes"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          {selectedFine && action === 'waive' && (
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                placeholder="Reason for waiving this fine"
              />
            </div>
          )}

          {selectedFine && action === 'edit' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Amount (Rs.)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeActionDialog}>
              Cancel
            </Button>
            {action === 'pay' && selectedFine && (
              <Button
                onClick={() =>
                  payMutation.mutate({
                    id: selectedFine.id,
                    method: payMethod,
                    receipt: receiptNumber || undefined,
                    discount: payDiscountNum,
                    amountPaid: payTotal,
                    paymentDate: payDate,
                    paymentTime: payTime,
                    notes: payNotes || undefined,
                  })
                }
                disabled={payMutation.isPending || payDiscountInvalid || !payDate || !payTime}
              >
                {payMutation.isPending ? 'Processing...' : `Confirm Payment · Rs. ${payTotal}`}
              </Button>
            )}
            {action === 'waive' && selectedFine && (
              <Button
                onClick={() => waiveMutation.mutate({ id: selectedFine.id, reason: waiveReason })}
                disabled={waiveReason.length < 3 || waiveMutation.isPending}
              >
                Waive Fine
              </Button>
            )}
            {action === 'edit' && selectedFine && (
              <Button
                onClick={() =>
                  editMutation.mutate({
                    id: selectedFine.id,
                    amount: Number(editAmount),
                    notes: editNotes || undefined,
                  })
                }
                disabled={editMutation.isPending}
              >
                Save Changes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!summaryView} onOpenChange={(open) => !open && setSummaryView(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{summaryView ? summaryDialogTitle[summaryView] : ''}</DialogTitle>
            <DialogDescription>
              {summaryView ? summaryDialogDescription[summaryView] : ''}
            </DialogDescription>
          </DialogHeader>

          {financeLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : finance && summaryView ? (
            <>
              {summaryView === 'outstanding' && renderFinanceOverview(finance)}
              {summaryView === 'pending' && renderPendingList(finance.pending)}
              {summaryView === 'paid' && renderPaidList(finance.paid)}
              {summaryView === 'waived' && renderWaivedList(finance.waived)}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-4">Unable to load finance details.</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSummaryView(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
