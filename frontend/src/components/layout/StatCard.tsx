import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type StatAccent = 'blue' | 'green' | 'amber' | 'purple' | 'rose' | 'cyan' | 'indigo';

const accentStyles: Record<StatAccent, { icon: string; ring: string }> = {
  blue: {
    icon: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    ring: 'group-hover:border-blue-500/30',
  },
  green: {
    icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    ring: 'group-hover:border-emerald-500/30',
  },
  amber: {
    icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    ring: 'group-hover:border-amber-500/30',
  },
  purple: {
    icon: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    ring: 'group-hover:border-purple-500/30',
  },
  rose: {
    icon: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    ring: 'group-hover:border-rose-500/30',
  },
  cyan: {
    icon: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    ring: 'group-hover:border-cyan-500/30',
  },
  indigo: {
    icon: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    ring: 'group-hover:border-indigo-500/30',
  },
};

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  href?: string;
  icon?: LucideIcon;
  accent?: StatAccent;
  actionLabel?: string;
}

export function StatCard({
  title,
  value,
  description,
  href,
  icon: Icon,
  accent = 'blue',
  actionLabel = 'View details →',
}: StatCardProps) {
  const styles = accentStyles[accent];

  const card = (
    <Card
      className={cn(
        'group h-full overflow-hidden transition-all duration-200',
        href && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-glow',
        href && styles.ring
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && (
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', styles.icon)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1.5">{description}</p>}
        {href && (
          <p className="text-xs font-medium text-primary mt-3 opacity-0 transition-opacity group-hover:opacity-100">
            {actionLabel}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link to={href} className="block h-full">
        {card}
      </Link>
    );
  }

  return card;
}
