import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { userApi, UpdateLibrarianData } from '@/api/user.api';
import {
  createLibrarianSchema,
  updateLibrarianSchema,
  CreateLibrarianForm,
  UpdateLibrarianForm,
} from '@/schemas/user.schema';
import { User } from '@/types';

export default function LibrariansPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editLibrarian, setEditLibrarian] = useState<User | null>(null);
  const [deleteLibrarian, setDeleteLibrarian] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['librarians', page, search],
    queryFn: () => userApi.listLibrarians({ page, limit: 10, search: search || undefined }),
  });

  const librarians = data?.data || [];
  const meta = data?.meta;

  const createForm = useForm<CreateLibrarianForm>({
    resolver: zodResolver(createLibrarianSchema),
  });

  const editForm = useForm<UpdateLibrarianForm>({
    resolver: zodResolver(updateLibrarianSchema),
  });

  const createMutation = useMutation({
    mutationFn: userApi.createLibrarian,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['librarians'] });
      setCreateOpen(false);
      createForm.reset();
      toast({ title: 'Success', description: 'Librarian created. Credentials sent via email.' });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create librarian',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLibrarianData }) =>
      userApi.updateLibrarian(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['librarians'] });
      setEditLibrarian(null);
      toast({ title: 'Success', description: 'Librarian updated successfully.' });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update librarian',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: userApi.deactivateLibrarian,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['librarians'] });
      setDeleteLibrarian(null);
      toast({ title: 'Success', description: 'Librarian deactivated.' });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to deactivate librarian',
        variant: 'destructive',
      });
    },
  });

  const openEdit = (librarian: User) => {
    setEditLibrarian(librarian);
    editForm.reset({
      fullName: librarian.fullName,
      email: librarian.email,
      phone: librarian.phone || '',
      department: librarian.librarianProfile?.department,
    });
  };

  return (
    <DashboardLayout title="Librarians">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or employee ID..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Librarian
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="list-header">
                  <th className="text-left p-4 font-medium">Employee ID</th>
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
                ) : librarians.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No librarians found
                    </td>
                  </tr>
                ) : (
                  librarians.map((librarian) => (
                    <tr key={librarian.id} className="list-row-hover">
                      <td className="p-4 font-mono text-xs">
                        {librarian.librarianProfile?.employeeId}
                      </td>
                      <td className="p-4 font-medium">{librarian.fullName}</td>
                      <td className="p-4 hidden md:table-cell text-muted-foreground">
                        {librarian.email}
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        {librarian.librarianProfile?.department}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={librarian.status} />
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(librarian)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteLibrarian(librarian)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Librarian</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Employee ID</Label>
              <Input {...createForm.register('employeeId')} />
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Create Librarian
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editLibrarian} onOpenChange={() => setEditLibrarian(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Librarian</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((d) =>
              editLibrarian && updateMutation.mutate({ id: editLibrarian.id, data: d })
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditLibrarian(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteLibrarian} onOpenChange={() => setDeleteLibrarian(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Librarian</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate {deleteLibrarian?.fullName}? They will no longer
              be able to access the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteLibrarian(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteLibrarian && deleteMutation.mutate(deleteLibrarian.id)}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
