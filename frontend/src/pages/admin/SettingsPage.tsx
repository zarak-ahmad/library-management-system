import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { settingsApi, SystemSettings } from '@/api/fine.api';
import { useToast } from '@/components/ui/use-toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  const settings = data?.data;

  const [fineRules, setFineRules] = useState<SystemSettings['fineRules'] | null>(null);
  const [blockRules, setBlockRules] = useState<SystemSettings['blockRules'] | null>(null);
  const [borrowRules, setBorrowRules] = useState<SystemSettings['borrowRules'] | null>(null);

  useEffect(() => {
    if (settings) {
      setFineRules({ ...settings.fineRules });
      setBlockRules({ ...settings.blockRules });
      setBorrowRules({ ...settings.borrowRules });
    }
  }, [settings]);

  const fineMutation = useMutation({
    mutationFn: settingsApi.updateFineRules,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: 'Fine rules updated' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  const blockMutation = useMutation({
    mutationFn: settingsApi.updateBlockRules,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: 'Block rules updated' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  const borrowMutation = useMutation({
    mutationFn: settingsApi.updateBorrowRules,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: 'Borrow rules updated' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  if (isLoading || !fineRules || !blockRules || !borrowRules) {
    return (
      <DashboardLayout title="System Settings">
        <p className="text-muted-foreground">Loading settings...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="System Settings">
      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Fine Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Rate per Day (Rs.)</Label>
              <Input
                type="number"
                min={0}
                value={fineRules.ratePerDay}
                onChange={(e) => setFineRules({ ...fineRules, ratePerDay: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Grace Period (days)</Label>
              <Input
                type="number"
                min={0}
                value={fineRules.gracePeriodDays}
                onChange={(e) => setFineRules({ ...fineRules, gracePeriodDays: Number(e.target.value) })}
              />
            </div>
            <Button onClick={() => fineMutation.mutate(fineRules)} disabled={fineMutation.isPending}>
              Save Fine Rules
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auto-Block Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoBlock"
                checked={blockRules.autoBlockEnabled}
                onChange={(e) => setBlockRules({ ...blockRules, autoBlockEnabled: e.target.checked })}
              />
              <Label htmlFor="autoBlock">Enable automatic account blocking</Label>
            </div>
            <div className="space-y-2">
              <Label>Fine Threshold (Rs.)</Label>
              <Input
                type="number"
                min={0}
                value={blockRules.fineThreshold}
                onChange={(e) => setBlockRules({ ...blockRules, fineThreshold: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Students are blocked when outstanding fines reach this amount.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Max Overdue Returns</Label>
              <Input
                type="number"
                min={1}
                value={blockRules.maxOverdueReturns}
                onChange={(e) => setBlockRules({ ...blockRules, maxOverdueReturns: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Students are blocked after this many overdue book returns.
              </p>
            </div>
            <Button onClick={() => blockMutation.mutate(blockRules)} disabled={blockMutation.isPending}>
              Save Block Rules
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Borrow Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Borrow Duration (days)</Label>
              <Input
                type="number"
                min={1}
                value={borrowRules.borrowDurationDays}
                onChange={(e) =>
                  setBorrowRules({ ...borrowRules, borrowDurationDays: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Max Books per Student</Label>
              <Input
                type="number"
                min={1}
                value={borrowRules.maxBooksPerStudent}
                onChange={(e) =>
                  setBorrowRules({ ...borrowRules, maxBooksPerStudent: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Reservation Expiry (days)</Label>
              <Input
                type="number"
                min={1}
                value={borrowRules.reservationExpiryDays}
                onChange={(e) =>
                  setBorrowRules({ ...borrowRules, reservationExpiryDays: Number(e.target.value) })
                }
              />
            </div>
            <Button onClick={() => borrowMutation.mutate(borrowRules)} disabled={borrowMutation.isPending}>
              Save Borrow Rules
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
