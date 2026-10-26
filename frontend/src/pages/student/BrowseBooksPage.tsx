import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Search, BookMarked } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BookStatusBadge } from '@/components/common/BookStatusBadge';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { bookApi, genreApi, categoryApi, getEntityName } from '@/api/book.api';
import { borrowApi } from '@/api/borrow.api';
import { Book } from '@/types';
import { getAssetUrl } from '@/utils/assets';
import { studentLabels as L } from '@/constants/studentLabels';

export default function BrowseBooksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const { data: genresData } = useQuery({ queryKey: ['genres'], queryFn: () => genreApi.list() });
  const { data: categoriesData } = useQuery({ queryKey: ['categories'], queryFn: () => categoryApi.list() });

  const genres = genresData?.data || [];
  const categories = categoriesData?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ['books', 'browse', page, search, genreFilter, categoryFilter],
    queryFn: () =>
      bookApi.list({
        page,
        limit: 12,
        search: search || undefined,
        genre: genreFilter !== 'all' ? genreFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
      }),
  });

  const requestMutation = useMutation({
    mutationFn: borrowApi.createRequest,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['book-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'mine'] });
      const resent = response.data?.resent;
      toast({
        title: resent ? 'WhatsApp resent' : 'Check WhatsApp',
        description:
          response.data?.message ||
          'Check WhatsApp and open the secure confirmation link to complete your request.',
      });
      setSelectedBook(null);
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  const reserveMutation = useMutation({
    mutationFn: borrowApi.createReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'student'] });
      toast({ title: 'Reserved', description: 'Book reserved successfully.' });
      setSelectedBook(null);
    },
    onError: (e: AxiosError<{ message?: string }>) => {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' });
    },
  });

  const canBorrow = user?.status === 'active';

  const books = data?.data || [];
  const meta = data?.meta;

  const BookCover = ({ book, className }: { book: Book; className?: string }) => {
    const url = getAssetUrl(book.coverImage?.url);
    const [failed, setFailed] = useState(false);

    return (
      <div className={className}>
        {url && !failed ? (
          <img
            src={url}
            alt={book.title}
            className="w-full h-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <BookMarked className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout title={L.browseBooks.title}>
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search books..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={genreFilter} onValueChange={(v) => { setGenreFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="Genre" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genres</SelectItem>
            {genres.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Loading books...</p>
      ) : books.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No available books found</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {books.map((book) => (
            <Card
              key={book.id}
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedBook(book)}
            >
              <BookCover book={book} className="aspect-[3/4]" />
              <CardContent className="p-4 space-y-2">
                <p className="font-semibold line-clamp-2">{book.title}</p>
                <p className="text-sm text-muted-foreground">{book.author}</p>
                <div className="flex justify-between items-center">
                  <BookStatusBadge status={book.status} />
                  <span className="text-xs text-muted-foreground">
                    {L.browseBooks.copiesAvailable(book.availableCopies)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {meta && <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />}

      <Dialog open={!!selectedBook} onOpenChange={() => setSelectedBook(null)}>
        <DialogContent className="max-w-lg">
          {selectedBook && (
            <>
              <DialogHeader><DialogTitle>{selectedBook.title}</DialogTitle></DialogHeader>
              <div className="grid sm:grid-cols-3 gap-4">
                <BookCover book={selectedBook} className="aspect-[3/4] rounded-md overflow-hidden sm:col-span-1" />
                <div className="sm:col-span-2 space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Author:</span> {selectedBook.author}</p>
                  <p><span className="text-muted-foreground">ISBN:</span> {selectedBook.isbn}</p>
                  <p><span className="text-muted-foreground">Genre:</span> {getEntityName(selectedBook.genre)}</p>
                  <p><span className="text-muted-foreground">Category:</span> {getEntityName(selectedBook.category)}</p>
                  <p><span className="text-muted-foreground">Publisher:</span> {selectedBook.publisher}</p>
                  <p><span className="text-muted-foreground">Shelf:</span> {selectedBook.shelfLocation}</p>
                  <p><span className="text-muted-foreground">Available:</span> {selectedBook.availableCopies} of {selectedBook.totalCopies}</p>
                  <BookStatusBadge status={selectedBook.status} />
                  {selectedBook.description && (
                    <p className="pt-2 text-muted-foreground">{selectedBook.description}</p>
                  )}
                  {canBorrow && (
                    <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
                      <Button
                        className="flex-1"
                        onClick={() => requestMutation.mutate(selectedBook.id)}
                        disabled={requestMutation.isPending}
                      >
                        {L.browseBooks.requestBook}
                      </Button>
                      {selectedBook.availableCopies > 0 && (
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => reserveMutation.mutate(selectedBook.id)}
                          disabled={reserveMutation.isPending}
                        >
                          {L.browseBooks.reserveBook}
                        </Button>
                      )}
                    </DialogFooter>
                  )}
                  {!canBorrow && (
                    <p className="text-xs text-destructive pt-2">{L.browseBooks.accountBlocked}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
