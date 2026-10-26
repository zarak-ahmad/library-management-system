import { cn } from '@/lib/utils';
import { BookStatus } from '@/types';

const styles: Record<BookStatus, string> = {
  available: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  reserved: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  borrowed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  out_of_stock: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const labels: Record<BookStatus, string> = {
  available: 'Available',
  reserved: 'Reserved',
  borrowed: 'Borrowed',
  out_of_stock: 'Out of Stock',
};

export function BookStatusBadge({
  status,
  className,
}: {
  status: BookStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles[status],
        className
      )}
    >
      {labels[status]}
    </span>
  );
}
