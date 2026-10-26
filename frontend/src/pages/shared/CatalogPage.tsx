import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
import { useToast } from '@/components/ui/use-toast';
import { genreApi, categoryApi } from '@/api/book.api';
import {
  genreFormSchema,
  categoryFormSchema,
  GenreFormValues,
  CategoryFormValues,
} from '@/schemas/book.schema';
import { Genre, Category } from '@/types';

type Tab = 'genres' | 'categories';

export default function CatalogPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('genres');
  const [formOpen, setFormOpen] = useState(false);
  const [editGenre, setEditGenre] = useState<Genre | null>(null);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deactivateItem, setDeactivateItem] = useState<{ type: Tab; id: string; name: string } | null>(null);

  const { data: genresData, isLoading: genresLoading } = useQuery({
    queryKey: ['genres', 'all'],
    queryFn: () => genreApi.list(true),
  });

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => categoryApi.list(true),
  });

  const genres = genresData?.data || [];
  const categories = categoriesData?.data || [];

  const genreForm = useForm<GenreFormValues>({ resolver: zodResolver(genreFormSchema) });
  const categoryForm = useForm<CategoryFormValues>({ resolver: zodResolver(categoryFormSchema) });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['genres'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const genreCreate = useMutation({
    mutationFn: genreApi.create,
    onSuccess: () => { invalidate(); closeForm(); toast({ title: 'Genre created' }); },
    onError: (e: AxiosError<{ message?: string }>) =>
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const genreUpdate = useMutation({
    mutationFn: ({ id, data }: { id: string; data: GenreFormValues }) => genreApi.update(id, data),
    onSuccess: () => { invalidate(); closeForm(); toast({ title: 'Genre updated' }); },
    onError: (e: AxiosError<{ message?: string }>) =>
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const genreDelete = useMutation({
    mutationFn: genreApi.deactivate,
    onSuccess: () => { invalidate(); setDeactivateItem(null); toast({ title: 'Genre deactivated' }); },
    onError: (e: AxiosError<{ message?: string }>) =>
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const categoryCreate = useMutation({
    mutationFn: categoryApi.create,
    onSuccess: () => { invalidate(); closeForm(); toast({ title: 'Category created' }); },
    onError: (e: AxiosError<{ message?: string }>) =>
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const categoryUpdate = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryFormValues }) => categoryApi.update(id, data),
    onSuccess: () => { invalidate(); closeForm(); toast({ title: 'Category updated' }); },
    onError: (e: AxiosError<{ message?: string }>) =>
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const categoryDelete = useMutation({
    mutationFn: categoryApi.deactivate,
    onSuccess: () => { invalidate(); setDeactivateItem(null); toast({ title: 'Category deactivated' }); },
    onError: (e: AxiosError<{ message?: string }>) =>
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const closeForm = () => {
    setFormOpen(false);
    setEditGenre(null);
    setEditCategory(null);
    genreForm.reset();
    categoryForm.reset();
  };

  const openCreate = () => {
    genreForm.reset();
    categoryForm.reset();
    setEditGenre(null);
    setEditCategory(null);
    setFormOpen(true);
  };

  const openEditGenre = (genre: Genre) => {
    setEditGenre(genre);
    setEditCategory(null);
    genreForm.reset({ name: genre.name, description: genre.description || '' });
    setFormOpen(true);
  };

  const openEditCategory = (category: Category) => {
    setEditCategory(category);
    setEditGenre(null);
    categoryForm.reset({ name: category.name, description: category.description || '' });
    setFormOpen(true);
  };

  const onSubmitGenre = (data: GenreFormValues) => {
    if (editGenre) genreUpdate.mutate({ id: editGenre.id, data });
    else genreCreate.mutate(data);
  };

  const onSubmitCategory = (data: CategoryFormValues) => {
    if (editCategory) categoryUpdate.mutate({ id: editCategory.id, data });
    else categoryCreate.mutate(data);
  };

  const items = tab === 'genres' ? genres : categories;
  const isLoading = tab === 'genres' ? genresLoading : categoriesLoading;

  return (
    <DashboardLayout title="Catalog Management">
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="flex gap-2">
          <Button variant={tab === 'genres' ? 'default' : 'outline'} onClick={() => setTab('genres')}>
            Genres
          </Button>
          <Button variant={tab === 'categories' ? 'default' : 'outline'} onClick={() => setTab('categories')}>
            Categories
          </Button>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add {tab === 'genres' ? 'Genre' : 'Category'}</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="list-header">
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Description</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No items found</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="list-row-hover">
                    <td className="p-4 font-medium">{item.name}</td>
                    <td className="p-4 hidden md:table-cell text-muted-foreground">{item.description || '—'}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${item.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => tab === 'genres' ? openEditGenre(item as Genre) : openEditCategory(item as Category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {item.isActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeactivateItem({ type: tab, id: item.id, name: item.name })}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editGenre || editCategory ? 'Edit' : 'Add'} {tab === 'genres' ? 'Genre' : 'Category'}
            </DialogTitle>
          </DialogHeader>
          {tab === 'genres' ? (
            <form onSubmit={genreForm.handleSubmit(onSubmitGenre)} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input {...genreForm.register('name')} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea {...genreForm.register('description')} /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={categoryForm.handleSubmit(onSubmitCategory)} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input {...categoryForm.register('name')} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea {...categoryForm.register('description')} /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deactivateItem} onOpenChange={() => setDeactivateItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate {deactivateItem?.name}</DialogTitle>
            <DialogDescription>This item will no longer be available for new books.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateItem(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deactivateItem) return;
                if (deactivateItem.type === 'genres') genreDelete.mutate(deactivateItem.id);
                else categoryDelete.mutate(deactivateItem.id);
              }}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
