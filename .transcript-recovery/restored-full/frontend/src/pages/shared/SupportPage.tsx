import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Plus, MessageSquare } from 'lucide-react';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  supportApi,
  SupportTicket,
  SupportCategory,
  SUPPORT_CATEGORY_LABELS,
  getTicketStudentName,
  formatSupportStatus,
} from '@/api/support.api';
import { userApi } from '@/api/user.api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const categories = Object.keys(SUPPORT_CATEGORY_LABELS) as SupportCategory[];

export default function SupportPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'librarian';
  const isAdmin = user?.role === 'admin';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('open');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [reopenNotes, setReopenNotes] = useState('');

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportCategory>('general_inquiry');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [attachment, setAttachment] = useState<File | null>(null);

  const { data: summary } = useQuery({
    queryKey: ['support', 'summary'],
    queryFn: () => supportApi.getSummary(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['support', page, statusFilter],
    queryFn: () =>
      supportApi.list({
        page,
        limit: 10,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['support', 'detail', detailId],
    queryFn: () => supportApi.getById(detailId!),
    enabled: !!detailId,
  });

  const { data: librariansData } = useQuery({
    queryKey: ['librarians', 'assign'],
    queryFn: () => userApi.listLibrarians({ limit: 100 }),
    enabled: isAdmin && !!detailId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['support'] });
    if (detailId) queryClient.invalidateQueries({ queryKey: ['support', 'detail', detailId] });
  };

  const createMutation = useMutation({
    mutationFn: supportApi.create,
    onSuccess: () => {
      invalidate();
      resetCreateForm();
      setCreateOpen(false);
      toast({ title: 'Ticket submitted', description: 'We will review your request shortly.' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => supportApi.addComment(id, notes),
    onSuccess: () => {
      invalidate();
      setComment('');
      toast({ title: 'Comment added' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, assignedTo }: { id: string; assignedTo: string }) =>
      supportApi.assign(id, assignedTo),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Ticket assigned' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({
      id,
      notes,
      status,
    }: {
      id: string;
      notes: string;
      status: 'resolved' | 'rejected';
    }) => supportApi.resolve(id, notes, status),
    onSuccess: () => {
      invalidate();
      setResolutionNotes('');
      toast({ title: 'Ticket closed' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  const reopenMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => supportApi.reopen(id, notes),
    onSuccess: () => {
      invalidate();
      setReopenNotes('');
      toast({ title: 'Ticket reopened' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  const resetCreateForm = () => {
    setSubject('');
    setCategory('general_inquiry');
    setDescription('');
    setPriority('medium');
    setAttachment(null);
  };

  const tickets = data?.data || [];
  const meta = data?.meta;
  const ticket = detailData?.data?.ticket;
  const timeline = detailData?.data?.timeline || [];
  const librarians = librariansData?.data || [];
  const isClosed = ticket?.status === 'resolved' || ticket?.status === 'rejected';

  return (
    <DashboardLayout title="Support">
      {isStaff && (
        <div className="grid gap-4 md:grid-cols-5 mb-6">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Open</p><p className="text-2xl font-bold">{summary?.data?.open || 0}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Under Review</p><p className="text-2xl font-bold">{summary?.data?.underReview || 0}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Waiting</p><p className="text-2xl font-bold">{summary?.data?.waiting || 0}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Resolved</p><p className="text-2xl font-bold">{summary?.data?.resolved || 0}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Rejected</p><p className="text-2xl font-bold">{summary?.data?.rejected || 0}</p></CardContent></Card>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-6 items-center justify-between">
        <div className="w-full sm:w-[200px]">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="waiting_for_student">Waiting for Student</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!isStaff && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Ticket
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4">Ticket ID</th>
                {isStaff && <th className="text-left p-4">Student</th>}
                <th className="text-left p-4">Subject</th>
                <th className="text-left p-4 hidden md:table-cell">Category</th>
                <th className="text-left p-4">Priority</th>
                <th className="text-left p-4">Status</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={isStaff ? 7 : 6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={isStaff ? 7 : 6} className="p-8 text-center text-muted-foreground">No tickets found</td></tr>
              ) : (
                tickets.map((t: SupportTicket) => (
                  <tr key={t.id} className="border-b hover:bg-muted/30">
                    <td className="p-4 font-mono text-xs">{t.requestId}</td>
                    {isStaff && <td className="p-4">{getTicketStudentName(t.student)}</td>}
                    <td className="p-4">{t.subject}</td>
                    <td className="p-4 hidden md:table-cell">{SUPPORT_CATEGORY_LABELS[t.category]}</td>
                    <td className="p-4 capitalize">{t.priority}</td>
                    <td className="p-4 capitalize">{formatSupportStatus(t.status)}</td>
                    <td className="p-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => setDetailId(t.id)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {meta && <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submit Support Ticket</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as SupportCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{SUPPORT_CATEGORY_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Describe your issue in detail..."
              />
            </div>
            <div className="space-y-2">
              <Label>Attachment (optional, PDF or image)</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  subject,
                  category,
                  description,
                  priority,
                  attachment: attachment || undefined,
                })
              }
              disabled={
                subject.length < 3 ||
                description.length < 10 ||
                createMutation.isPending
              }
            >
              Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{ticket?.requestId || 'Ticket Details'}</DialogTitle>
          </DialogHeader>

          {detailLoading || !ticket ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 text-sm">
                <p><span className="text-muted-foreground">Subject:</span> {ticket.subject}</p>
                {isStaff && (
                  <p><span className="text-muted-foreground">Student:</span> {getTicketStudentName(ticket.student)}</p>
                )}
                <p><span className="text-muted-foreground">Category:</span> {SUPPORT_CATEGORY_LABELS[ticket.category]}</p>
                <p><span className="text-muted-foreground">Status:</span> <span className="capitalize">{formatSupportStatus(ticket.status)}</span></p>
                {ticket.assignedTo && (
                  <p><span className="text-muted-foreground">Assigned to:</span> {ticket.assignedTo.fullName}</p>
                )}
                {ticket.resolutionNotes && (
                  <p><span className="text-muted-foreground">Resolution:</span> {ticket.resolutionNotes}</p>
                )}
                <p className="whitespace-pre-wrap"><span className="text-muted-foreground">Description:</span> {ticket.description}</p>
                {ticket.attachment?.url && (
                  <p>
                    <span className="text-muted-foreground">Attachment:</span>{' '}
                    <a href={ticket.attachment.url} target="_blank" rel="noreferrer" className="text-primary underline">
                      {ticket.attachment.filename}
                    </a>
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Timeline
                </h4>
                <div className="space-y-3 max-h-48 overflow-y-auto border rounded-md p-3">
                  {timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet</p>
                  ) : (
                    timeline.map((entry) => (
                      <div key={entry.id} className="text-sm border-b pb-2 last:border-0">
                        <div className="flex justify-between gap-2">
                          <span className="font-medium capitalize">{entry.action.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {entry.performedBy?.fullName}
                          {entry.newStatus && ` · ${formatSupportStatus(entry.newStatus)}`}
                        </p>
                        {entry.notes && <p className="mt-1">{entry.notes}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {!isClosed && (
                <div className="space-y-2">
                  <Label>Add Comment</Label>
                  <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
                  <Button
                    size="sm"
                    onClick={() => detailId && commentMutation.mutate({ id: detailId, notes: comment })}
                    disabled={comment.length < 1 || commentMutation.isPending}
                  >
                    Send Comment
                  </Button>
                </div>
              )}

              {isStaff && !isClosed && (
                <div className="border-t pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Assign Ticket</Label>
                    <div className="flex gap-2">
                      {isAdmin ? (
                        <select
                          className="flex h-10 flex-1 rounded-md border border-input bg-surface px-3 py-2 text-sm"
                          value={assignTo}
                          onChange={(e) => setAssignTo(e.target.value)}
                        >
                          <option value="">Select staff</option>
                          {librarians.map((l) => (
                            <option key={l.id} value={l.id}>{l.fullName}</option>
                          ))}
                        </select>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => user?.id && assignMutation.mutate({ id: detailId!, assignedTo: user.id })}
                          disabled={assignMutation.isPending}
                        >
                          Assign to Me
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          onClick={() => assignTo && assignMutation.mutate({ id: detailId!, assignedTo: assignTo })}
                          disabled={!assignTo || assignMutation.isPending}
                        >
                          Assign
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Close Ticket</Label>
                    <Textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Resolution notes..."
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          resolveMutation.mutate({
                            id: detailId!,
                            notes: resolutionNotes,
                            status: 'resolved',
                          })
                        }
                        disabled={resolutionNotes.length < 3 || resolveMutation.isPending}
                      >
                        Resolve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() =>
                          resolveMutation.mutate({
                            id: detailId!,
                            notes: resolutionNotes,
                            status: 'rejected',
                          })
                        }
                        disabled={resolutionNotes.length < 3 || resolveMutation.isPending}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {isStaff && isClosed && (
                <div className="border-t pt-4 space-y-2">
                  <Label>Reopen Ticket</Label>
                  <Textarea
                    value={reopenNotes}
                    onChange={(e) => setReopenNotes(e.target.value)}
                    placeholder="Reason for reopening..."
                    rows={2}
                  />
                  <Button
                    onClick={() => reopenMutation.mutate({ id: detailId!, notes: reopenNotes })}
                    disabled={reopenNotes.length < 3 || reopenMutation.isPending}
                  >
                    Reopen
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
