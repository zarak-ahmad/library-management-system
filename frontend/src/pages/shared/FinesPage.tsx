import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Eye, ChevronRight, BookOpen, AlertCircle, CheckCircle2, Info } from 'lucide-react';
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
  getFineRecordId,
  settingsApi,
} from '@/api/fine.api';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { studentLabels as SL } from '@/constants/studentLabels';

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

function StatusBadge({
  status,
  studentView = false,
}: {
  status: Fine['paymentStatus'];
  studentView?: boolean;
}) {
  const label = studentView
    ? {
        pending: SL.fines.status.pending,
        paid: SL.fines.status.paid,
        waived: SL.fines.status.waived,
      }[status]
    : status;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
        status === 'pending' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
        status === 'paid' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        status === 'waived' && 'bg-muted text-muted-foreground'
      )}
    >
      {label}
    </span>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm font-medium break-words text-foreground">{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-semibold text-right text-foreground">{value}</span>
    </div>
  );
}

function FineTimeline({
  fine,
  labels,
}: {
  fine: Fine;
  labels: {
    borrowed: string;
    due: string;
    returned: string;
    fined: string;
  };
}) {
  const steps = [
    { key: 'borrowed', label: labels.borrowed, date: fine.transaction?.issueDate },
    { key: 'due', label: labels.due, date: fine.transaction?.dueDate },
    { key: 'returned', label: labels.returned, date: fine.transaction?.returnDate },
    { key: 'fined', label: labels.fined, date: fine.createdAt },
  ] as const;

  return (
    <div className="relative">
      <div className="absolute left-4 top-3 bottom-3 w-px bg-border md:hidden" aria-hidden />
      <ol className="grid gap-3 md:grid-cols-4 md:gap-2">
        {steps.map((step, index) => {
          const hasDate = !!step.date;
          return (
            <li
              key={step.key}
              className={cn(
                'relative flex gap-3 md:flex-col md:items-center md:text-center md:gap-2',
                !hasDate && 'opacity-50'
              )}
            >
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
                  hasDate
                    ? step.key === 'fined'
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground'
                )}
              >
                {index + 1}
              </div>
              <div className="min-w-0 flex-1 md:flex-none">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {step.label}
                </p>
                <p className="text-sm font-medium mt-0.5">
                  {hasDate ? formatDate(step.date) : '—'}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className="hidden md:block absolute top-4 left-[calc(12.5%+1rem)] right-[calc(-12.5%+1rem)] h-px bg-border"
                  style={{ width: 'auto' }}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function FineStatusCallout({ fine, isStaff }: { fine: Fine; isStaff: boolean }) {
  if (isStaff) return null;

  const L = SL.fines.callouts;
  if (fine.paymentStatus === 'pending') {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{L.pendingTitle}</p>
          <p className="text-sm text-muted-foreground mt-1">{L.pendingBody}</p>
          <p className="text-xs font-mono text-primary mt-2">{fine.fineId}</p>
        </div>
      </div>
    );
  }
  if (fine.paymentStatus === 'paid') {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex gap-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{L.paidTitle}</p>
          <p className="text-sm text-muted-foreground mt-1">{L.paidBody}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border list-surface p-4 flex gap-3">
      <Info className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
      <div>
        <p className="text-sm font-semibold">{L.waivedTitle}</p>
        <p className="text-sm text-muted-foreground mt-1">{L.waivedBody}</p>
        {fine.waivedReason && (
          <p className="text-sm mt-2">
            <span className="text-muted-foreground">{SL.fines.fields.waiveReason}: </span>
            {fine.waivedReason}
          </p>
        )}
      </div>
    </div>
  );
}

function FineRecordCard({
  fine,
  isStaff,
  onClick,
}: {
  fine: Fine;
  isStaff: boolean;
  onClick: () => void;
}) {
  const L = SL.fines;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border p-4 transition-all hover:border-primary/30 hover:shadow-soft list-item-hover group relative"
    >
      <div className="flex items-start justify-between gap-3 pr-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-primary">{fine.fineId}</span>
            <StatusBadge status={fine.paymentStatus} studentView={!isStaff} />
          </div>
          <p className="font-semibold mt-2 truncate">{getFineBookTitle(fine)}</p>
          {isStaff && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {getFineStudentName(fine.student)}
            </p>
          )}
        </div>
        <p className="text-lg font-bold shrink-0">Rs. {fine.amount}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-sm text-muted-foreground">
        {!isStaff ? (
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span>
                <span className="font-medium text-foreground/80">{L.card.issued}: </span>
                {formatDate(fine.transaction?.issueDate)}
              </span>
              <span>
                <span className="font-medium text-foreground/80">{L.card.returned}: </span>
                {formatDate(fine.transaction?.returnDate)}
              </span>
            </div>
            <p className="text-xs">{L.card.daysLate(fine.overdueDays)}</p>
          </div>
        ) : (
          <span>
            {fine.overdueDays} day{fine.overdueDays !== 1 ? 's' : ''} overdue
          </span>
        )}
        <span className={cn(!isStaff && 'hidden sm:inline')}>
          {isStaff ? `Rate Rs. ${fine.ratePerDay}/day` : L.card.tapForDetails}
        </span>
      </div>
      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:text-primary transition-all" />
    </button>
  );
}

function FineSummaryCard({
  fine,
  isStaff,
  variant,
  onClick,
}: {
  fine: Fine | FineWithPayment;
  isStaff: boolean;
  variant: 'pending' | 'paid' | 'waived';
  onClick: () => void;
}) {
  const paidFine = fine as FineWithPayment;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border p-4 text-sm list-item-hover transition-all hover:border-primary/30 group relative"
    >
      <div className="flex justify-between gap-3 pr-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-primary">{fine.fineId}</span>
            <StatusBadge status={variant} studentView={!isStaff} />
          </div>
          <p className="font-medium mt-1.5 truncate">{getFineBookTitle(fine)}</p>
          {isStaff && (
            <p className="text-muted-foreground text-xs mt-0.5 truncate">
              {getFineStudentName(fine.student)}
            </p>
          )}
        </div>
        <span
          className={cn(
            'font-semibold shrink-0',
            variant === 'paid' && 'text-emerald-600 dark:text-emerald-400'
          )}
        >
          Rs. {variant === 'paid' ? (paidFine.payment?.amount ?? fine.amount) : fine.amount}
        </span>
      </div>
      {!isStaff && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
          <span>
            <span className="font-medium text-foreground/80">{SL.fines.card.issued}: </span>
            {formatDate(fine.transaction?.issueDate)}
          </span>
          <span>
            <span className="font-medium text-foreground/80">{SL.fines.card.returned}: </span>
            {formatDate(fine.transaction?.returnDate)}
          </span>
        </div>
      )}
      {variant === 'paid' && (
        <p className="text-muted-foreground text-xs mt-2">
          {formatDateTime(paidFine.payment?.paidAt || fine.paymentDate)}
        </p>
      )}
      {variant === 'waived' && fine.waivedReason && (
        <p className="text-muted-foreground text-xs mt-2 line-clamp-2">{fine.waivedReason}</p>
      )}
      {variant === 'pending' && (
        <p className="text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {isStaff ? 'View details →' : SL.fines.card.tapForDetails}
        </p>
      )}
      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-hover:opacity-100" />
    </button>
  );
}

function FineDetailContent({
  fine,
  payments,
  paymentsLoading,
  isStaff,
  gracePeriodDays,
}: {
  fine: Fine;
  payments: Payment[];
  paymentsLoading: boolean;
  isStaff: boolean;
  gracePeriodDays: number;
}) {
  const L = SL.fines;
  const timelineLabels = isStaff
    ? { borrowed: 'Issue Date', due: 'Due Date', returned: 'Return Date', fined: 'Fine Created' }
    : L.timeline;
  const missingDate = isStaff ? '—' : L.details.notRecorded;
  const formatDateValue = (value?: string) => (value ? formatDate(value) : missingDate);
  const formatDateTimeValue = (value?: string) => (value ? formatDateTime(value) : missingDate);

  if (!isStaff) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {L.details.fineNumber}
          </p>
          <p className="font-mono text-sm text-primary mt-1">{fine.fineId}</p>
          <h3 className="text-xl font-bold mt-3 leading-snug">{getFineBookTitle(fine)}</h3>
          {fine.transaction?.book?.author && (
            <p className="text-sm text-muted-foreground mt-1">by {fine.transaction.book.author}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <p className="text-3xl font-bold">Rs. {fine.amount}</p>
            <StatusBadge status={fine.paymentStatus} studentView />
          </div>
        </div>

        <FineStatusCallout fine={fine} isStaff={false} />

        <div className="rounded-xl border list-surface p-4">
          <h4 className="text-sm font-semibold mb-1">{L.details.datesSection}</h4>
          <p className="text-xs text-muted-foreground mb-3">{L.details.timeline}</p>
          <DetailRow label={L.fields.issueDate} value={formatDateValue(fine.transaction?.issueDate)} />
          <DetailRow label={L.fields.dueDate} value={formatDateValue(fine.transaction?.dueDate)} />
          <DetailRow
            label={L.fields.returnDate}
            value={formatDateValue(fine.transaction?.returnDate)}
          />
          <DetailRow label={L.fields.fineCreated} value={formatDateTimeValue(fine.createdAt)} />
        </div>

        <div className="rounded-xl border list-surface p-4">
          <h4 className="text-sm font-semibold mb-3">{L.fields.calculation}</h4>
          <DetailRow label={L.fields.overdueDays} value={fine.overdueDays} />
          <DetailRow label={L.fields.ratePerDay} value={`Rs. ${fine.ratePerDay}`} />
          {gracePeriodDays > 0 && (
            <DetailRow label={L.fields.gracePeriod} value={`${gracePeriodDays} days`} />
          )}
          <DetailRow label={L.fields.amountDue} value={`Rs. ${fine.amount}`} />
        </div>

        <div className="rounded-xl border list-surface p-4">
          <h4 className="text-sm font-semibold mb-3">{L.details.bookSection}</h4>
          <DetailRow label="Book" value={getFineBookTitle(fine)} />
          <DetailRow label={L.fields.author} value={fine.transaction?.book?.author || missingDate} />
          <DetailRow
            label={L.fields.transactionId}
            value={
              <span className="font-mono text-xs">
                {fine.transaction?.transactionId || missingDate}
              </span>
            }
          />
        </div>

        {(fine.paymentStatus === 'paid' || fine.paymentStatus === 'waived' || fine.paymentDate) && (
          <div className="rounded-xl border list-surface p-4">
            <h4 className="text-sm font-semibold mb-3">{L.details.paymentInfo}</h4>
            <DetailRow
              label="Status"
              value={<StatusBadge status={fine.paymentStatus} studentView />}
            />
            {fine.paymentDate && (
              <DetailRow label={L.fields.paymentDate} value={formatDateTimeValue(fine.paymentDate)} />
            )}
            {fine.paymentStatus === 'waived' && (
              <>
                <DetailRow label={L.fields.waivedBy} value={fine.waivedBy?.fullName || missingDate} />
                <DetailRow label={L.fields.waiveReason} value={fine.waivedReason || missingDate} />
              </>
            )}
          </div>
        )}

        {(paymentsLoading || payments.length > 0) && (
          <div>
            <h4 className="text-sm font-semibold mb-3">{L.details.paymentHistory}</h4>
            {paymentsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <ul className="space-y-2">
                {payments.map((payment: Payment) => (
                  <li
                    key={payment.id}
                    className="rounded-lg border list-surface px-4 py-3 text-sm space-y-2"
                  >
                    <div className="flex justify-between gap-3">
                      <span className="font-mono text-xs text-primary">{payment.paymentId}</span>
                      <span className="font-bold">Rs. {payment.amount}</span>
                    </div>
                    <DetailRow
                      label={L.fields.paymentDate}
                      value={formatDateTimeValue(payment.paidAt || payment.createdAt)}
                    />
                    {payment.collectedBy && (
                      <DetailRow label={L.fields.collectedBy} value={payment.collectedBy.fullName} />
                    )}
                    {payment.receiptNumber && (
                      <DetailRow label="Receipt" value={payment.receiptNumber} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FineStatusCallout fine={fine} isStaff={isStaff} />

      <div
        className={cn(
          'rounded-xl border p-4',
          fine.paymentStatus === 'pending' && 'border-amber-500/20 bg-amber-500/5',
          fine.paymentStatus === 'paid' && 'border-emerald-500/20 bg-emerald-500/5',
          fine.paymentStatus === 'waived' && 'list-surface'
        )}
      >
        <p className="text-sm text-muted-foreground">
          {isStaff ? 'Total Amount' : L.details.totalAmount}
        </p>
        <p className="text-3xl font-bold tracking-tight mt-1">Rs. {fine.amount}</p>
        <p className="text-xs text-muted-foreground mt-2">
          {fine.overdueDays} day{fine.overdueDays !== 1 ? 's' : ''} overdue × Rs. {fine.ratePerDay}
          /day
          {!isStaff && gracePeriodDays > 0 && (
            <span className="block mt-1">
              ({L.fields.gracePeriod}: {gracePeriodDays} day{gracePeriodDays !== 1 ? 's' : ''} not
              charged)
            </span>
          )}
        </p>
      </div>

      <div className="rounded-xl border list-surface p-4">
        <h4 className="text-sm font-semibold mb-3">
          {isStaff ? 'Issue & Return Dates' : L.details.datesSection}
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailItem
            label={isStaff ? 'Issue Date' : L.fields.issueDate}
            value={formatDate(fine.transaction?.issueDate)}
          />
          <DetailItem
            label={isStaff ? 'Due Date' : L.fields.dueDate}
            value={formatDate(fine.transaction?.dueDate)}
          />
          <DetailItem
            label={isStaff ? 'Return Date' : L.fields.returnDate}
            value={formatDate(fine.transaction?.returnDate)}
          />
          <DetailItem
            label={isStaff ? 'Fine Created' : L.fields.fineCreated}
            value={formatDateTime(fine.createdAt)}
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          {isStaff ? 'Borrowing Timeline' : L.details.timeline}
        </h4>
        <FineTimeline fine={fine} labels={timelineLabels} />
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-3">
          {isStaff ? 'Student & Book' : L.details.bookSection}
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          {isStaff && (
            <>
              <DetailItem label="Student" value={getFineStudentName(fine.student)} />
              <DetailItem
                label="Registration No."
                value={fine.student?.studentProfile?.registrationNumber || '—'}
              />
              <DetailItem label="Email" value={fine.student?.email || '—'} />
            </>
          )}
          <DetailItem label="Book" value={getFineBookTitle(fine)} />
          <DetailItem
            label={isStaff ? 'Author' : L.fields.author}
            value={fine.transaction?.book?.author || '—'}
          />
          <DetailItem
            label={isStaff ? 'Transaction ID' : L.fields.transactionId}
            value={
              <span className="font-mono text-xs">{fine.transaction?.transactionId || '—'}</span>
            }
          />
        </div>
      </div>

      <div className="rounded-xl border list-surface p-4">
        <h4 className="text-sm font-semibold mb-3">
          {isStaff ? 'Fine Calculation' : L.fields.calculation}
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              {isStaff ? 'Overdue Days' : L.fields.overdueDays}
            </span>
            <span className="font-medium">{fine.overdueDays}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              {isStaff ? 'Rate per Day' : L.fields.ratePerDay}
            </span>
            <span className="font-medium">Rs. {fine.ratePerDay}</span>
          </div>
          {gracePeriodDays > 0 && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{L.fields.gracePeriod}</span>
              <span className="font-medium">{gracePeriodDays} days</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between gap-4 font-semibold">
            <span>{isStaff ? 'Total Fine' : L.fields.amountDue}</span>
            <span className="text-primary">Rs. {fine.amount}</span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-3">
          {isStaff ? 'Payment Information' : L.details.paymentInfo}
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailItem
            label="Status"
            value={<StatusBadge status={fine.paymentStatus} studentView={!isStaff} />}
          />
          {fine.paymentDate && (
            <DetailItem
              label={isStaff ? 'Payment Date' : L.fields.paymentDate}
              value={formatDateTime(fine.paymentDate)}
            />
          )}
          {fine.paymentStatus === 'waived' && (
            <>
              <DetailItem
                label={isStaff ? 'Waived By' : L.fields.waivedBy}
                value={fine.waivedBy?.fullName || '—'}
              />
              <DetailItem
                label={isStaff ? 'Waive Reason' : L.fields.waiveReason}
                value={fine.waivedReason || '—'}
              />
            </>
          )}
          {fine.notes && (
            <div className="sm:col-span-2">
              <DetailItem label="Notes" value={fine.notes} />
            </div>
          )}
        </div>
      </div>

      {(paymentsLoading || payments.length > 0) && (
        <div>
          <h4 className="text-sm font-semibold mb-3">
            {isStaff ? 'Payment History' : L.details.paymentHistory}
          </h4>
          {paymentsLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <ul className="space-y-2">
              {payments.map((payment: Payment) => (
                <li
                  key={payment.id}
                  className="rounded-lg border list-surface px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-medium font-mono text-xs">{payment.paymentId}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {formatDate(payment.paidAt || payment.createdAt)} at{' '}
                      {formatTime(payment.paidAt || payment.createdAt)} ·{' '}
                      <span className="capitalize">{payment.paymentMethod}</span>
                      {payment.receiptNumber && ` · Receipt ${payment.receiptNumber}`}
                      {(payment.discount ?? 0) > 0 && ` · Discount Rs. ${payment.discount}`}
                    </p>
                    {payment.collectedBy && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {isStaff ? 'Collected by' : L.fields.collectedBy}:{' '}
                        {payment.collectedBy.fullName}
                        {isStaff && payment.collectedBy.role
                          ? ` (${payment.collectedBy.role})`
                          : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">Rs. {payment.amount}</p>
                    {payment.originalAmount != null && payment.originalAmount !== payment.amount && (
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
  );
}

type SummaryView = 'outstanding' | 'pending' | 'paid' | 'waived';

function SummaryStatCard({
  title,
  value,
  onClick,
  actionLabel = 'View details →',
}: {
  title: string;
  value: string | number;
  onClick: () => void;
  actionLabel?: string;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left w-full group">
      <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-glow hover:border-primary/30 cursor-pointer">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-xs font-medium text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {actionLabel}
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
  const [detailsFinePreview, setDetailsFinePreview] = useState<Fine | null>(null);
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
  const gracePeriodDays = settingsData?.data?.fineRules.gracePeriodDays ?? 0;

  const { data, isLoading } = useQuery({
    queryKey: ['fines', page, statusFilter],
    queryFn: () =>
      fineApi.list({
        page,
        limit: 10,
        paymentStatus: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const { data: fineDetailsResponse, isLoading: detailsLoading, isError: detailsError } = useQuery({
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
  const displayFine = detailsFine ?? detailsFinePreview;
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

  const closeDetailsDialog = () => {
    setDetailsFineId(null);
    setDetailsFinePreview(null);
  };

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

  const openDetails = (fine: Fine) => {
    const id = getFineRecordId(fine);
    if (!id) return;
    setDetailsFinePreview(fine);
    setDetailsFineId(id);
  };

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
      <div className={`grid gap-3 sm:grid-cols-2 ${isStaff ? 'lg:grid-cols-3' : ''}`}>
        <div className="rounded-xl border bg-amber-500/5 border-amber-500/20 p-4">
          <p className="text-xs text-muted-foreground">
            {isStaff ? 'Outstanding (Pending)' : SL.fines.finance.stillOwe}
          </p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
            Rs. {data.outstandingTotal}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {SL.fines.finance.fineCount(data.pendingCount)}
          </p>
        </div>
        <div className="rounded-xl border bg-emerald-500/5 border-emerald-500/20 p-4">
          <p className="text-xs text-muted-foreground">
            {isStaff ? 'Total Collected' : SL.fines.finance.paidTotal}
          </p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
            Rs. {data.paidTotalCollected}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {SL.fines.finance.fineCount(data.paidCount)}
          </p>
        </div>
        <div className="rounded-xl border list-surface p-4">
          <p className="text-xs text-muted-foreground">
            {isStaff ? 'Total Waived' : SL.fines.finance.forgivenTotal}
          </p>
          <p className="text-xl font-bold">Rs. {data.waivedTotalAmount}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {SL.fines.finance.fineCount(data.waivedCount)}
          </p>
        </div>
        {isStaff && (
          <>
            <div className="rounded-xl border p-4">
              <p className="text-xs text-muted-foreground">Total Discounts Given</p>
              <p className="text-xl font-bold">Rs. {data.totalDiscount}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs text-muted-foreground">Total Fines Recorded</p>
              <p className="text-xl font-bold">{data.totalFinesCount}</p>
            </div>
          </>
        )}
      </div>

      {data.pending.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">
            {isStaff ? 'Pending Fines' : SL.fines.finance.finesToPay}
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {data.pending.map((fine) => (
              <FineSummaryCard
                key={fine.id}
                fine={fine}
                isStaff={isStaff}
                variant="pending"
                onClick={() => openFineFromSummary(fine)}
              />
            ))}
          </div>
        </div>
      )}

      {data.paid.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">
            {isStaff ? 'Recent Paid Fines' : SL.fines.finance.recentPaid}
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {data.paid.slice(0, 10).map((fine) => (
              <FineSummaryCard
                key={fine.id}
                fine={fine}
                isStaff={isStaff}
                variant="paid"
                onClick={() => openFineFromSummary(fine)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderPendingList = (items: Fine[]) => (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {isStaff ? 'No pending fines.' : SL.fines.details.noFines}
        </p>
      ) : (
        items.map((fine) => (
          <FineSummaryCard
            key={fine.id}
            fine={fine}
            isStaff={isStaff}
            variant="pending"
            onClick={() => openFineFromSummary(fine)}
          />
        ))
      )}
    </div>
  );

  const renderPaidList = (items: FineWithPayment[]) => (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {isStaff ? 'No paid fines.' : SL.fines.details.noFines}
        </p>
      ) : (
        items.map((fine) => (
          <FineSummaryCard
            key={fine.id}
            fine={fine}
            isStaff={isStaff}
            variant="paid"
            onClick={() => openFineFromSummary(fine)}
          />
        ))
      )}
    </div>
  );

  const renderWaivedList = (items: FineWithPayment[]) => (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {isStaff ? 'No waived fines.' : SL.fines.details.noFines}
        </p>
      ) : (
        items.map((fine) => (
          <FineSummaryCard
            key={fine.id}
            fine={fine}
            isStaff={isStaff}
            variant="waived"
            onClick={() => openFineFromSummary(fine)}
          />
        ))
      )}
    </div>
  );

  const summaryDialogTitle: Record<SummaryView, string> = isStaff
    ? {
        outstanding: 'Financial Overview',
        pending: 'Pending Fines',
        paid: 'Paid Fines',
        waived: 'Waived Fines',
      }
    : {
        outstanding: SL.fines.summaryDialogs.outstanding.title,
        pending: SL.fines.summaryDialogs.pending.title,
        paid: SL.fines.summaryDialogs.paid.title,
        waived: SL.fines.summaryDialogs.waived.title,
      };

  const summaryDialogDescription: Record<SummaryView, string> = isStaff
    ? {
        outstanding: 'Complete breakdown of all fine finances',
        pending: 'All fines awaiting payment',
        paid: 'Payment history with dates, amounts, and staff details',
        waived: 'All waived fines with reasons and dates',
      }
    : {
        outstanding: SL.fines.summaryDialogs.outstanding.description,
        pending: SL.fines.summaryDialogs.pending.description,
        paid: SL.fines.summaryDialogs.paid.description,
        waived: SL.fines.summaryDialogs.waived.description,
      };

  const fines = data?.data || [];
  const meta = data?.meta;
  const fineOriginalAmount = selectedFine?.amount ?? 0;
  const payDiscountNum = Math.max(0, Number(payDiscount) || 0);
  const payTotal = Math.max(0, fineOriginalAmount - payDiscountNum);
  const payDiscountInvalid = payDiscountNum > fineOriginalAmount;

  return (
    <DashboardLayout
      title={isStaff ? 'Fines' : SL.fines.title}
      subtitle={isStaff ? 'Track overdue fines and payments' : SL.fines.subtitle}
    >
      <p className="text-sm text-muted-foreground mb-4">
        {isStaff
          ? `Overdue books are fined at Rs. ${ratePerDay} per day. Pending fines accrue daily until the book is returned or paid. Click a summary card or table row to view details.`
          : `${SL.fines.intro} The current rate is Rs. ${ratePerDay} per day.`}
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <SummaryStatCard
          title={isStaff ? 'Outstanding Pending' : SL.fines.summaryCards.outstanding}
          value={`Rs. ${summary?.data?.outstandingTotal || 0}`}
          onClick={() => openSummaryView('outstanding')}
          actionLabel={isStaff ? undefined : SL.common.seeMore}
        />
        <SummaryStatCard
          title={isStaff ? 'Pending' : SL.fines.summaryCards.pending}
          value={summary?.data?.pendingCount || 0}
          onClick={() => openSummaryView('pending')}
          actionLabel={isStaff ? undefined : SL.common.seeMore}
        />
        <SummaryStatCard
          title={isStaff ? 'Paid' : SL.fines.summaryCards.paid}
          value={summary?.data?.paidCount || 0}
          onClick={() => openSummaryView('paid')}
          actionLabel={isStaff ? undefined : SL.common.seeMore}
        />
        <SummaryStatCard
          title={isStaff ? 'Waived' : SL.fines.summaryCards.waived}
          value={summary?.data?.waivedCount || 0}
          onClick={() => openSummaryView('waived')}
          actionLabel={isStaff ? undefined : SL.common.seeMore}
        />
      </div>

      {!isStaff && (summary?.data?.outstandingTotal ?? 0) > 0 && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              {SL.fines.banner.title(summary?.data?.outstandingTotal ?? 0)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{SL.fines.banner.description}</p>
          </div>
        </div>
      )}

      <div className="mb-6 w-full sm:w-[200px]">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={isStaff ? 'Filter status' : SL.fines.status.all}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">
              {isStaff ? 'Pending' : SL.fines.status.pending}
            </SelectItem>
            <SelectItem value="paid">{isStaff ? 'Paid' : SL.fines.status.paid}</SelectItem>
            <SelectItem value="waived">
              {isStaff ? 'Waived' : SL.fines.status.waived}
            </SelectItem>
            <SelectItem value="all">{isStaff ? 'All' : SL.fines.status.all}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isStaff ? (
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="list-header">
                <th className="text-left p-4">Fine ID</th>
                <th className="text-left p-4">Student</th>
                <th className="text-left p-4">Book</th>
                <th className="text-left p-4 hidden md:table-cell">Overdue Days</th>
                <th className="text-left p-4 hidden lg:table-cell">Rate/Day</th>
                <th className="text-left p-4">Amount</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Details</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : fines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No fines found
                  </td>
                </tr>
              ) : (
                fines.map((fine) => (
                  <tr
                    key={fine.id}
                    className="list-row-hover cursor-pointer"
                    onClick={() => openDetails(fine)}
                  >
                    <td className="p-4 font-mono text-xs text-primary">{fine.fineId}</td>
                    <td className="p-4">{getFineStudentName(fine.student)}</td>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      ) : (
        <div className="space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </>
          ) : fines.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {SL.fines.table.empty}
              </CardContent>
            </Card>
          ) : (
            fines.map((fine) => (
              <FineRecordCard
                key={fine.id}
                fine={fine}
                isStaff={false}
                onClick={() => openDetails(fine)}
              />
            ))
          )}
        </div>
      )}

      {meta && <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />}

      <Dialog open={!!detailsFineId} onOpenChange={(open) => !open && closeDetailsDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          <div className="overflow-y-auto max-h-[90vh] p-6 scrollbar-thin">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4 pr-8">
                <div className="min-w-0">
                  <DialogTitle>{isStaff ? 'Fine Details' : SL.fines.details.title}</DialogTitle>
                  <DialogDescription className="sr-only">
                    {displayFine
                      ? `${displayFine.fineId} ${getFineBookTitle(displayFine)}`
                      : 'Loading fine information'}
                  </DialogDescription>
                  {displayFine && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      <span className="font-mono text-primary">{displayFine.fineId}</span>
                      {!isStaff ? (
                        <p className="mt-1 font-medium text-foreground">{getFineBookTitle(displayFine)}</p>
                      ) : (
                        <span>
                          {' · '}
                          {getFineBookTitle(displayFine)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {displayFine && (
                  <StatusBadge status={displayFine.paymentStatus} studentView={!isStaff} />
                )}
              </div>
            </DialogHeader>

            {detailsLoading && !displayFine ? (
              <div className="space-y-4 py-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : displayFine ? (
              <div className="mt-4">
                {detailsLoading && (
                  <p className="text-xs text-muted-foreground mb-3">{SL.common.loading}</p>
                )}
                {detailsError && !detailsFine && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                    Showing saved summary. Some details may refresh when connection is restored.
                  </p>
                )}
                <FineDetailContent
                  fine={displayFine}
                  payments={payments}
                  paymentsLoading={paymentsLoading}
                  isStaff={isStaff}
                  gracePeriodDays={gracePeriodDays}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">Fine not found.</p>
            )}

            {displayFine && isStaff && displayFine.paymentStatus === 'pending' && (
              <DialogFooter className="gap-2 sm:gap-0 mt-6">
                <Button variant="outline" onClick={() => openAction(displayFine, 'edit')}>
                  Edit Amount
                </Button>
                <Button variant="outline" onClick={() => openAction(displayFine, 'waive')}>
                  Waive
                </Button>
                <Button onClick={() => openAction(displayFine, 'pay')}>Record Payment</Button>
              </DialogFooter>
            )}
          </div>
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
              <div className="rounded-xl border list-surface p-4 space-y-3">
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
