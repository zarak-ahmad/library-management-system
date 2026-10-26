import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { Plus, Search, Pencil, Shield } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/common/StatusBadge';
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
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { userApi, UpdateStudentData } from '@/api/user.api';
import {
  createStudentSchema,
  updateStudentSchema,
  statusChangeSchema,
  CreateStudentForm,
  UpdateStudentForm,
  StatusChangeForm,
} from '@/schemas/user.schema';
import { User } from '@/types';

export default function StudentsPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = currentUser?.role === 'admin';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<User | null>(null);
  const [statusStudent, setStatusStudent] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['students', page, search, statusFilter],
    queryFn: () =>
      userApi.listStudents({
        page,
        limit: 10,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const students = data?.data || [];
  const meta = data?.meta;

  const createForm = useForm<CreateStudentForm>({
    resolver: zodResolver(createStudentSchema),
  });

  const editForm = useForm<UpdateStudentForm>({
    resolver: zodResolver(updateStudentSchema),
  });

  const statusForm = useForm<StatusChangeForm>({
    resolver: zodResolver(statusChangeSchema),
    defaultValues: { status: 'active', reason: '' },
  });

  const createMutation = useMutation({
    mutationFn: userApi.createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setCreateOpen(false);
      createForm.reset();
      toast({ title: 'Success', description: 'Student created. Credentials sent via email.' });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create student',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStudentData }) =>
      userApi.updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setEditStudent(null);
      toast({ title: 'Success', description: 'Student updated successfully.' });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update student',
        variant: 'destructive',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: StatusChangeForm }) =>
      userApi.updateStudentStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setStatusStudent(null);
      statusForm.reset();
      toast({ title: 'Success', description: 'Student status updated.' });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update status',
        variant: 'destructive',
      });
    },
  });

  const openEdit = (student: User) => {
    setEditStudent(student);
    editForm.reset({
      fullName: student.fullName,
      email: student.email,
      phone: student.phone || '',
      department: student.studentProfile?.department,
      address: student.studentProfile?.address,
    });
  };

  const openStatus = (student: User) => {
    setStatusStudent(student);
    statusForm.reset({ status: student.status, reason: student.statusReason || '' });
  };

  return (
    <DashboardLayout title="Students">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or registration number..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="pending_verification">Pending Verification</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="list-header">
                  <th className="text-left p-4 font-medium">Reg. No.</th>
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium hidden md:table-cell">Email</th>
                  <th className="text-left p-4 font-medium hidden lg:table-cell">Department</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No students found
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} className="list-row-hover">
                      <td className="p-4 font-mono text-xs">
                        {student.studentProfile?.registrationNumber}
                      </td>
                      <td className="p-4 font-medium">{student.fullName}</td>
                      <td className="p-4 hidden md:table-cell text-muted-foreground">
                        {student.email}
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        {student.studentProfile?.department}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={student.status} />
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(student)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" onClick={() => openStatus(student)}>
                              <Shield className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {meta && (
        <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Registration Number</Label>
              <Input {...createForm.register('registrationNumber')} />
              {createForm.formState.errors.registrationNumber && (
                <p className="text-sm text-destructive">
                  {createForm.formState.errors.registrationNumber.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input {...createForm.register('fullName')} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...createForm.register('email')} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...createForm.register('phone')} />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input {...createForm.register('department')} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea {...createForm.register('address')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Student'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editStudent} onOpenChange={() => setEditStudent(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((d) =>
              editStudent && updateMutation.mutate({ id: editStudent.id, data: d })
            )}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input {...editForm.register('fullName')} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...editForm.register('email')} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...editForm.register('phone')} />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input {...editForm.register('department')} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea {...editForm.register('address')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditStudent(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={!!statusStudent} onOpenChange={() => setStatusStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Status — {statusStudent?.fullName}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={statusForm.handleSubmit((d) =>
              statusStudent && statusMutation.mutate({ id: statusStudent.id, data: d })
            )}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={statusForm.watch('status')}
                onValueChange={(v) =>
                  statusForm.setValue('status', v as StatusChangeForm['status'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending_verification">Pending Verification</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea {...statusForm.register('reason')} placeholder="Reason for status change" />
              {statusForm.formState.errors.reason && (
                <p className="text-sm text-destructive">
                  {statusForm.formState.errors.reason.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStatusStudent(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={statusMutation.isPending}>
                Update Status
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
