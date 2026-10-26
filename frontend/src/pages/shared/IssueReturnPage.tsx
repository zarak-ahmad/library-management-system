import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { CalendarDays, CheckCircle2, Eye, RotateCcw } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { borrowApi, getBookTitle, getStudentName, BorrowTransaction } from '@/api/borrow.api';
import { userApi } from '@/api/user.api';
import { bookApi } from '@/api/book.api';
import { settingsApi } from '@/api/fine.api';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseInputDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' });

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString(undefined, { timeStyle: 'short' });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const daysBetween = (from: string, to: string) => {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};

const isToday = (value: string) => {
  const date = new Date(value);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const calcReturnMetrics = (txn: BorrowTransaction, gracePeriodDays: number) => {
  if (!txn.returnDate) {
    return { daysBorrowed: 0, overdueDays: 0, wasOnTime: true };
  }
  const daysBorrowed = daysBetween(txn.issueDate, txn.returnDate);
  const overdueDays = Math.max(0, daysBetween(txn.dueDate, txn.returnDate) - gracePeriodDays);
  return { daysBorrowed, overdueDays, wasOnTime: overdueDays === 0 };
};

type ReturnSuccess = {
  transaction: BorrowTransaction;
  overdueDays: number;
  fine?: {
    fineId: string;
    amount: number;
    overdueDays: number;
    paymentStatus: string;
  } | null;
  autoBlock?: { blocked: boolean; reason?: string };
  notes?: string;
};

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
  onClick,
  active,
}: {
  title: string;
  value: string | number;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left w-full group">
      <Card
        className={cn(
          'h-full transition-all hover:-translate-y-0.5 hover:shadow-glow cursor-pointer',
          active ? 'border-primary/50 shadow-glow' : 'hover:border-primary/30'
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

function ReturnDetailsPanel({
  transaction,
  overdueDays,
  gracePeriodDays,
  fine,
  autoBlock,
  notes,
  showReturnHighlight = false,
}: {
  transaction: BorrowTransaction;
  overdueDays?: number;
  gracePeriodDays: number;
  fine?: ReturnSuccess['fine'];
  autoBlock?: ReturnSuccess['autoBlock'];
  notes?: string;
  showReturnHighlight?: boolean;
}) {
  const metrics = calcReturnMetrics(transaction, gracePeriodDays);
  const resolvedOverdueDays = overdueDays ?? metrics.overdueDays;
  const returnDateValue = transaction.returnDate;

  return (
    <div className="space-y-5">
      {showReturnHighlight && (
        <div className="rounded-xl border bg-emerald-500/5 border-emerald-500/20 p-4">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Return recorded</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <DetailItem
              label="Returned Date"
              value={returnDateValue ? formatDate(returnDateValue) : '—'}
            />
            <DetailItem
              label="Returned Time"
              value={returnDateValue ? formatTime(returnDateValue) : '—'}
            />
            <DetailItem
              label="Returned By"
              value={
                transaction.returnedTo
                  ? `${transaction.returnedTo.fullName}${
                      transaction.returnedTo.role ? ` (${transaction.returnedTo.role})` : ''
                    }`
                  : '—'
              }
            />
            <DetailItem
              label="Recorded At"
              value={returnDateValue ? formatDateTime(returnDateValue) : '—'}
            />
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold mb-3">Book & Student</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailItem label="Book" value={getBookTitle(transaction.book)} />
          <DetailItem label="Student" value={getStudentName(transaction.student)} />
          <DetailItem
            label="Registration No."
            value={transaction.student?.studentProfile?.registrationNumber || '—'}
          />
          <DetailItem
            label="Transaction ID"
            value={<span className="font-mono text-xs">{transaction.transactionId}</span>}
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-3">Borrowing Timeline</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailItem label="Issue Date" value={formatDate(transaction.issueDate)} />
          <DetailItem label="Due Date" value={formatDate(transaction.dueDate)} />
          <DetailItem
            label="Return Date"
            value={returnDateValue ? formatDate(returnDateValue) : '—'}
          />
          <DetailItem
            label="Return Time"
            value={returnDateValue ? formatTime(returnDateValue) : '—'}
          />
          <DetailItem label="Issued By" value={transaction.issuedBy?.fullName || '—'} />
          <DetailItem
            label="Returned By"
            value={
              transaction.returnedTo
                ? `${transaction.returnedTo.fullName}${
                    transaction.returnedTo.role ? ` (${transaction.returnedTo.role})` : ''
                  }`
                : '—'
            }
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-3">Calculated Details</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailItem
            label="Days Borrowed"
            value={`${metrics.daysBorrowed} day${metrics.daysBorrowed === 1 ? '' : 's'}`}
          />
          <DetailItem
            label="Overdue Days"
            value={
              <span
                className={cn(resolvedOverdueDays > 0 && 'text-amber-600 dark:text-amber-400')}
              >
                {resolvedOverdueDays} day{resolvedOverdueDays === 1 ? '' : 's'}
              </span>
            }
          />
          <DetailItem
            label="Return Status"
            value={
              <span
                className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                  metrics.wasOnTime
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                )}
              >
                {metrics.wasOnTime ? 'On Time' : 'Late Return'}
              </span>
            }
          />
          <DetailItem label="Grace Period" value={`${gracePeriodDays} day${gracePeriodDays === 1 ? '' : 's'}`} />
        </div>
      </div>

      {(fine || transaction.fineAmount > 0) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3">
            Fine Details
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {fine?.fineId && <DetailItem label="Fine ID" value={fine.fineId} />}
            <DetailItem
              label="Amount"
              value={`Rs. ${fine?.amount ?? transaction.fineAmount}`}
            />
            <DetailItem
              label="Overdue Days (Fine)"
              value={fine?.overdueDays ?? resolvedOverdueDays}
            />
            <DetailItem
              label="Payment Status"
              value={
                <span className="capitalize">
                  {fine?.paymentStatus ?? transaction.finePaidStatus ?? '—'}
                </span>
              }
            />
          </div>
        </div>
      )}

      {autoBlock?.blocked && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive">Student Auto-Blocked</p>
          <p className="text-sm text-muted-foreground mt-1">{autoBlock.reason}</p>
        </div>
      )}

      {notes && <DetailItem label="Return Notes" value={notes} />}
    </div>
  );
}

export default function IssueReturnPage() {
  const [tab, setTab] = useState<'active' | 'issue' | 'returns'>('active');
  const [page, setPage] = useState(1);
  const [returnsPage, setReturnsPage] = useState(1);
  const [returnFilter, setReturnFilter] = useState<'all' | 'today' | 'overdue' | 'on-time'>('all');
  const [studentId, setStudentId] = useState('');
  const [bookId, setBookId] = useState('');
  const [issueDate, setIssueDate] = useState(toDateInputValue(new Date()));
  const [returnTxn, setReturnTxn] = useState<BorrowTransaction | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [returnSuccess, setReturnSuccess] = useState<ReturnSuccess | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<BorrowTransaction | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const borrowDurationDays = settingsData?.data?.borrowRules.borrowDurationDays ?? 14;
  const gracePeriodDays = settingsData?.data?.fineRules.gracePeriodDays ?? 0;
  const returnDueDate = issueDate
    ? toDateInputValue(addDays(parseInputDate(issueDate), borrowDurationDays))
    : '';

  const resetIssueForm = () => {
    setStudentId('');
    setBookId('');
    setIssueDate(toDateInputValue(new Date()));
  };

  const { data: studentsData } = useQuery({
    queryKey: ['students', 'issue'],
    queryFn: () => userApi.listStudents({ limit: 100, status: 'active' }),
  });

  const { data: booksData } = useQuery({
    queryKey: ['books', 'issue'],
    queryFn: () => bookApi.list({ limit: 100 }),
  });

  const { data: activeData, isLoading } = useQuery({
    queryKey: ['transactions', 'active', page],
    queryFn: () => borrowApi.listTransactions({ page, limit: 10, status: 'borrowed' }),
    enabled: tab === 'active',
  });

  const { data: overdueData } = useQuery({
    queryKey: ['transactions', 'active-overdue', page],
    queryFn: () => borrowApi.listTransactions({ page, limit: 10, status: 'overdue' }),
    enabled: tab === 'active',
  });

  const { data: returnsData, isLoading: returnsLoading } = useQuery({
    queryKey: ['transactions', 'returns', returnsPage],
    queryFn: () =>
      borrowApi.listTransactions({ page: returnsPage, limit: 10, status: 'returned', sort: '-returnDate' }),
    enabled: tab === 'returns',
  });

  const { data: returnsStatsData } = useQuery({
    queryKey: ['transactions', 'returns-stats'],
    queryFn: () =>
      borrowApi.listTransactions({ page: 1, limit: 500, status: 'returned', sort: '-returnDate' }),
    enabled: tab === 'returns',
    staleTime: 60_000,
  });

  const issueMutation = useMutation({
    mutationFn: borrowApi.issueBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'returns-stats'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      resetIssueForm();
      toast({ title: 'Issued', description: 'Book issued successfully.' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => borrowApi.returnBook(id, notes),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'returns-stats'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['fines'] });
      setReturnTxn(null);
      setReturnNotes('');

      if (response.data?.transaction) {
        setReturnSuccess({
          transaction: response.data.transaction,
          overdueDays: response.data.overdueDays ?? 0,
          fine: response.data.fine,
          autoBlock: response.data.autoBlock,
          notes: variables.notes,
        });
      } else {
        toast({ title: 'Returned', description: 'Book returned successfully.' });
      }
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  const students = studentsData?.data || [];
  const books = booksData?.data || [];
  const active = [...(activeData?.data || []), ...(overdueData?.data || [])];
  const meta = activeData?.meta;
  const returns = returnsData?.data || [];
  const returnsMeta = returnsData?.meta;
  const returnsStats = returnsStatsData?.data || [];

  const returnStats = {
    total: returnsStatsData?.meta?.total ?? returnsStats.length,
    today: returnsStats.filter((t) => t.returnDate && isToday(t.returnDate)).length,
    overdue: returnsStats.filter(
      (t) => calcReturnMetrics(t, gracePeriodDays).overdueDays > 0 || t.fineAmount > 0
    ).length,
    onTime: returnsStats.filter((t) => calcReturnMetrics(t, gracePeriodDays).wasOnTime).length,
  };

  const matchesReturnFilter = (t: BorrowTransaction) => {
    const metrics = calcReturnMetrics(t, gracePeriodDays);
    if (returnFilter === 'today') return Boolean(t.returnDate && isToday(t.returnDate));
    if (returnFilter === 'overdue') return metrics.overdueDays > 0 || t.fineAmount > 0;
    if (returnFilter === 'on-time') return metrics.wasOnTime;
    return true;
  };

  const filteredFromStats = returnsStats.filter(matchesReturnFilter);
  const filteredReturns =
    returnFilter === 'all' ? returns : filteredFromStats;
  const filteredReturnsMeta =
    returnFilter === 'all'
      ? returnsMeta
      : {
          page: returnsPage,
          totalPages: Math.max(1, Math.ceil(filteredFromStats.length / 10)),
          total: filteredFromStats.length,
          limit: 10,
        };
  const pagedFilteredReturns =
    returnFilter === 'all'
      ? filteredReturns
      : filteredFromStats.slice((returnsPage - 1) * 10, returnsPage * 10);

  const setReturnFilterAndReset = (filter: typeof returnFilter) => {
    setReturnFilter(filter);
    setReturnsPage(1);
  };

  const successTxn = returnSuccess?.transaction;

  return (
    <DashboardLayout title="Issue & Return" subtitle="Issue books and process returns">
      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant={tab === 'active' ? 'default' : 'outline'} onClick={() => setTab('active')}>
          Active Borrows
        </Button>
        <Button variant={tab === 'returns' ? 'default' : 'outline'} onClick={() => setTab('returns')}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Return History
        </Button>
        <Button variant={tab === 'issue' ? 'default' : 'outline'} onClick={() => setTab('issue')}>
          Issue Book
        </Button>
      </div>

      {tab === 'returns' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <SummaryStatCard
              title="Total Returns"
              value={returnStats.total}
              active={returnFilter === 'all'}
              onClick={() => setReturnFilterAndReset('all')}
            />
            <SummaryStatCard
              title="Returned Today"
              value={returnStats.today}
              active={returnFilter === 'today'}
              onClick={() => setReturnFilterAndReset('today')}
            />
            <SummaryStatCard
              title="Late Returns"
              value={returnStats.overdue}
              active={returnFilter === 'overdue'}
              onClick={() => setReturnFilterAndReset('overdue')}
            />
            <SummaryStatCard
              title="On Time"
              value={returnStats.onTime}
              active={returnFilter === 'on-time'}
              onClick={() => setReturnFilterAndReset('on-time')}
            />
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="list-header">
                    <th className="text-left p-4">Transaction</th>
                    <th className="text-left p-4">Student</th>
                    <th className="text-left p-4">Book</th>
                    <th className="text-left p-4">Issued</th>
                    <th className="text-left p-4">Due</th>
                    <th className="text-left p-4">Returned</th>
                    <th className="text-left p-4">Days</th>
                    <th className="text-left p-4">Overdue</th>
                    <th className="text-left p-4">Fine</th>
                    <th className="text-right p-4">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {returnsLoading ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center">
                        Loading...
                      </td>
                    </tr>
                  ) : pagedFilteredReturns.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-muted-foreground">
                        No return records found
                      </td>
                    </tr>
                  ) : (
                    pagedFilteredReturns.map((t) => {
                      const metrics = calcReturnMetrics(t, gracePeriodDays);
                      return (
                        <tr
                          key={t.id}
                          className="list-row-hover cursor-pointer"
                          onClick={() => setSelectedReturn(t)}
                        >
                          <td className="p-4 font-mono text-xs">{t.transactionId}</td>
                          <td className="p-4">{getStudentName(t.student)}</td>
                          <td className="p-4">{getBookTitle(t.book)}</td>
                          <td className="p-4">{formatDate(t.issueDate)}</td>
                          <td className="p-4">{formatDate(t.dueDate)}</td>
                          <td className="p-4">
                            {t.returnDate ? formatDateTime(t.returnDate) : '—'}
                          </td>
                          <td className="p-4">{metrics.daysBorrowed}</td>
                          <td className="p-4">
                            <span
                              className={cn(
                                metrics.overdueDays > 0 && 'text-amber-600 dark:text-amber-400 font-medium'
                              )}
                            >
                              {metrics.overdueDays}
                            </span>
                          </td>
                          <td className="p-4">
                            {t.fineAmount > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400">
                                Rs. {t.fineAmount}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReturn(t);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {filteredReturnsMeta && (
            <Pagination
              page={filteredReturnsMeta.page}
              totalPages={filteredReturnsMeta.totalPages}
              onPageChange={setReturnsPage}
            />
          )}
        </>
      )}

      {tab === 'issue' && (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Direct Issue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              >
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.studentProfile?.registrationNumber})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Book</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
              >
                <option value="">Select book</option>
                {books
                  .filter((b) => b.availableCopies > 0)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.availableCopies} avail.)
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="issueDate"
                  type="date"
                  className="pl-10"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnDueDate">Return Due Date</Label>
              <Input
                id="returnDueDate"
                type="date"
                value={returnDueDate}
                readOnly
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Auto-calculated: {borrowDurationDays}-day borrow policy. The student will see this
                date in My Library.
              </p>
            </div>
            <Button
              onClick={() =>
                studentId &&
                bookId &&
                issueDate &&
                issueMutation.mutate({ studentId, bookId, issueDate })
              }
              disabled={!studentId || !bookId || !issueDate || issueMutation.isPending}
            >
              Issue Book
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === 'active' && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="list-header">
                  <th className="text-left p-4">Transaction</th>
                  <th className="text-left p-4">Student</th>
                  <th className="text-left p-4">Book</th>
                  <th className="text-left p-4">Issued</th>
                  <th className="text-left p-4">Due</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-right p-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      Loading...
                    </td>
                  </tr>
                ) : active.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No active borrows
                    </td>
                  </tr>
                ) : (
                  active.map((t) => (
                    <tr key={t.id} className="border-b">
                      <td className="p-4 font-mono text-xs">{t.transactionId}</td>
                      <td className="p-4">{getStudentName(t.student)}</td>
                      <td className="p-4">{getBookTitle(t.book)}</td>
                      <td className="p-4">{formatDate(t.issueDate)}</td>
                      <td className="p-4">{formatDate(t.dueDate)}</td>
                      <td className="p-4 capitalize">{t.status}</td>
                      <td className="p-4 text-right">
                        <Button size="sm" onClick={() => setReturnTxn(t)}>
                          Returned
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {meta && tab === 'active' && (
        <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
      )}

      <Dialog open={!!returnTxn} onOpenChange={() => setReturnTxn(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Book as Returned</DialogTitle>
            <DialogDescription>Confirm return details before processing.</DialogDescription>
          </DialogHeader>
          {returnTxn && (
            <div className="space-y-2 text-sm rounded-lg border list-surface p-4">
              <p>
                <span className="font-medium">Book:</span> {getBookTitle(returnTxn.book)}
              </p>
              <p>
                <span className="font-medium">Student:</span> {getStudentName(returnTxn.student)}
              </p>
              <p>
                <span className="font-medium">Issued:</span> {formatDate(returnTxn.issueDate)}
              </p>
              <p>
                <span className="font-medium">Due:</span> {formatDate(returnTxn.dueDate)}
              </p>
              <p>
                <span className="font-medium">Status:</span>{' '}
                <span className="capitalize">{returnTxn.status}</span>
              </p>
            </div>
          )}
          <Textarea
            placeholder="Notes (optional)"
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTxn(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                returnTxn &&
                returnMutation.mutate({ id: returnTxn.id, notes: returnNotes || undefined })
              }
              disabled={returnMutation.isPending}
            >
              {returnMutation.isPending ? 'Processing...' : 'Confirm Returned'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!returnSuccess} onOpenChange={(open) => !open && setReturnSuccess(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <DialogTitle>Book Returned Successfully</DialogTitle>
                <DialogDescription className="mt-1">
                  {successTxn?.transactionId}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {returnSuccess && successTxn && (
            <ReturnDetailsPanel
              transaction={successTxn}
              overdueDays={returnSuccess.overdueDays}
              gracePeriodDays={gracePeriodDays}
              fine={returnSuccess.fine}
              autoBlock={returnSuccess.autoBlock}
              notes={returnSuccess.notes}
              showReturnHighlight
            />
          )}

          <DialogFooter>
            <Button onClick={() => setReturnSuccess(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedReturn} onOpenChange={(open) => !open && setSelectedReturn(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Return Record Details</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {selectedReturn?.transactionId}
            </DialogDescription>
          </DialogHeader>

          {selectedReturn && (
            <ReturnDetailsPanel
              transaction={selectedReturn}
              gracePeriodDays={gracePeriodDays}
            />
          )}

          <DialogFooter>
            <Button onClick={() => setSelectedReturn(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
