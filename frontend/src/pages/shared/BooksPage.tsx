import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  LayoutGrid,
  List,
  BookMarked,
  Copy,
  Upload,
  Download,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BookStatusBadge } from '@/components/common/BookStatusBadge';
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
import { useToast } from '@/components/ui/use-toast';
import { bookApi, genreApi, categoryApi, getEntityName, getEntityId, BookImportResult } from '@/api/book.api';
import { bookFormSchema, BookFormValues } from '@/schemas/book.schema';
import { Book, BookStatus } from '@/types';
import { getAssetUrl } from '@/utils/assets';

export default function BooksPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [formOpen, setFormOpen] = useState(false);
  const [editBook, setEditBook] = useState<Book | null>(null);
  const [deleteBook, setDeleteBook] = useState<Book | null>(null);
  const [copiesBook, setCopiesBook] = useState<Book | null>(null);
  const [coverFile, setCoverFile] = useState<File | undefined>();
  const [copiesCount, setCopiesCount] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | undefined>();
  const [importResult, setImportResult] = useState<BookImportResult | null>(null);

  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: () => genreApi.list(),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list(),
  });

  const genres = genresData?.data || [];
  const categories = categoriesData?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ['books', page, search, genreFilter, categoryFilter, statusFilter],
    queryFn: () =>
      bookApi.list({
        page,
        limit: viewMode === 'grid' ? 12 : 10,
        search: search || undefined,
        genre: genreFilter !== 'all' ? genreFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? (statusFilter as BookStatus) : undefined,
      }),
  });

  const books = data?.data || [];
  const meta = data?.meta;

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      language: 'English',
      totalCopies: 1,
      publishedYear: new Date().getFullYear(),
    },
  });

  const createMutation = useMutation({
    mutationFn: ({ payload, file }: { payload: BookFormValues; file?: File }) =>
      bookApi.create(payload, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      closeForm();
      toast({ title: 'Success', description: 'Book created successfully.' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message || 'Failed', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload, file }: { id: string; payload: BookFormValues; file?: File }) =>
      bookApi.update(id, payload, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      closeForm();
      toast({ title: 'Success', description: 'Book updated successfully.' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message || 'Failed', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: bookApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setDeleteBook(null);
      toast({ title: 'Success', description: 'Book deleted.' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message || 'Failed', variant: 'destructive' });
    },
  });

  const copiesMutation = useMutation({
    mutationFn: ({ id, totalCopies }: { id: string; totalCopies: number }) =>
      bookApi.adjustCopies(id, totalCopies),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setCopiesBook(null);
      toast({ title: 'Success', description: 'Copy count updated.' });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message || 'Failed', variant: 'destructive' });
    },
  });

  const importMutation = useMutation({
    mutationFn: bookApi.importBooks,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setImportResult(response.data || null);
      setImportFile(undefined);
      toast({
        title: 'Import complete',
        description: response.message || `${response.data?.imported ?? 0} book(s) imported.`,
      });
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Import failed', description: e.response?.data?.message || 'Failed', variant: 'destructive' });
    },
  });

  const closeImportDialog = () => {
    setImportOpen(false);
    setImportFile(undefined);
    setImportResult(null);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditBook(null);
    setCoverFile(undefined);
    form.reset({ language: 'English', totalCopies: 1, publishedYear: new Date().getFullYear() });
  };

  const openCreate = () => {
    setEditBook(null);
    form.reset({ language: 'English', totalCopies: 1, publishedYear: new Date().getFullYear() });
    setCoverFile(undefined);
    setFormOpen(true);
  };

  const openEdit = (book: Book) => {
    setEditBook(book);
    form.reset({
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      genreId: getEntityId(book.genre),
      categoryId: getEntityId(book.category),
      publisher: book.publisher,
      edition: book.edition || '',
      publishedYear: book.publishedYear,
      language: book.language,
      description: book.description || '',
      shelfLocation: book.shelfLocation,
      totalCopies: book.totalCopies,
    });
    setCoverFile(undefined);
    setFormOpen(true);
  };

  const onSubmit = (values: BookFormValues) => {
    if (editBook) {
      updateMutation.mutate({ id: editBook.id, payload: values, file: coverFile });
    } else {
      createMutation.mutate({ payload: values, file: coverFile });
    }
  };

  const BookCover = ({ book }: { book: Book }) => {
    const url = getAssetUrl(book.coverImage?.url);
    const [failed, setFailed] = useState(false);

    if (!url || failed) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <BookMarked className="h-10 w-10 text-muted-foreground" />
        </div>
      );
    }

    return (
      <img
        src={url}
        alt={book.title}
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  };

  return (
    <DashboardLayout title="Books">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search title, author, ISBN..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={genreFilter} onValueChange={(v) => { setGenreFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full lg:w-[160px]"><SelectValue placeholder="Genre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {genres.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full lg:w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full lg:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="borrowed">Borrowed</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex gap-1">
            <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('table')}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('grid')}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setImportOpen(true); setImportResult(null); setImportFile(undefined); }}>
              <Upload className="h-4 w-4 mr-2" />Import
            </Button>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Book</Button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading ? (
            <p className="col-span-full text-center text-muted-foreground py-8">Loading...</p>
          ) : books.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground py-8">No books found</p>
          ) : (
            books.map((book) => (
              <Card key={book.id} className="overflow-hidden">
                <div className="aspect-[3/4] relative">
                  <BookCover book={book} />
                </div>
                <CardContent className="p-4 space-y-2">
                  <p className="font-semibold line-clamp-2">{book.title}</p>
                  <p className="text-sm text-muted-foreground">{book.author}</p>
                  <div className="flex justify-between items-center">
                    <BookStatusBadge status={book.status} />
                    <span className="text-xs text-muted-foreground">{book.availableCopies}/{book.totalCopies}</span>
                  </div>
                  <div className="flex gap-1 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(book)}>
                      <Pencil className="h-3 w-3 mr-1" />Edit
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => { setCopiesBook(book); setCopiesCount(book.totalCopies); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setDeleteBook(book)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="list-header">
                  <th className="text-left p-4 font-medium">Book ID</th>
                  <th className="text-left p-4 font-medium">Title</th>
                  <th className="text-left p-4 font-medium hidden md:table-cell">Author</th>
                  <th className="text-left p-4 font-medium hidden lg:table-cell">Genre</th>
                  <th className="text-left p-4 font-medium">Copies</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : books.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No books found</td></tr>
                ) : (
                  books.map((book) => (
                    <tr key={book.id} className="list-row-hover">
                      <td className="p-4 font-mono text-xs">{book.bookId}</td>
                      <td className="p-4 font-medium max-w-[200px] truncate">{book.title}</td>
                      <td className="p-4 hidden md:table-cell">{book.author}</td>
                      <td className="p-4 hidden lg:table-cell">{getEntityName(book.genre)}</td>
                      <td className="p-4">{book.availableCopies}/{book.totalCopies}</td>
                      <td className="p-4"><BookStatusBadge status={book.status} /></td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(book)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { setCopiesBook(book); setCopiesCount(book.totalCopies); }}><Copy className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteBook(book)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {meta && <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />}

      <Dialog open={formOpen} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editBook ? 'Edit Book' : 'Add Book'}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>ISBN</Label><Input {...form.register('isbn')} /></div>
              <div className="space-y-2"><Label>Shelf Location</Label><Input {...form.register('shelfLocation')} /></div>
            </div>
            <div className="space-y-2"><Label>Title</Label><Input {...form.register('title')} /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Author</Label><Input {...form.register('author')} /></div>
              <div className="space-y-2"><Label>Publisher</Label><Input {...form.register('publisher')} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Genre</Label>
                <Select value={form.watch('genreId')} onValueChange={(v) => form.setValue('genreId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select genre" /></SelectTrigger>
                  <SelectContent>{genres.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.watch('categoryId')} onValueChange={(v) => form.setValue('categoryId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Edition</Label><Input {...form.register('edition')} /></div>
              <div className="space-y-2"><Label>Published Year</Label><Input type="number" {...form.register('publishedYear')} /></div>
              <div className="space-y-2"><Label>Language</Label><Input {...form.register('language')} /></div>
            </div>
            {!editBook && (
              <div className="space-y-2"><Label>Total Copies</Label><Input type="number" {...form.register('totalCopies')} /></div>
            )}
            <div className="space-y-2"><Label>Description</Label><Textarea {...form.register('description')} /></div>
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0])} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editBook ? 'Save Changes' : 'Create Book'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!copiesBook} onOpenChange={() => setCopiesBook(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Copies — {copiesBook?.title}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Total Copies</Label>
            <Input type="number" min={0} value={copiesCount} onChange={(e) => setCopiesCount(parseInt(e.target.value, 10) || 0)} />
            <p className="text-xs text-muted-foreground">
              Currently: {copiesBook?.borrowedCopies} borrowed, {copiesBook?.reservedCopies} reserved
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopiesBook(null)}>Cancel</Button>
            <Button onClick={() => copiesBook && copiesMutation.mutate({ id: copiesBook.id, totalCopies: copiesCount })}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteBook} onOpenChange={() => setDeleteBook(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Book</DialogTitle>
            <DialogDescription>Delete &quot;{deleteBook?.title}&quot;? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteBook(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteBook && deleteMutation.mutate(deleteBook.id)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
