import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { AxiosError } from 'axios';
import { BookMarked } from 'lucide-react';
import { requestConfirmationApi } from '@/api/requestConfirmation.api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { getAssetUrl } from '@/utils/assets';

const formatDateTime = (value?: string) =>
  value
    ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

const formatStatus = (status?: string) => status?.replace(/_/g, ' ') ?? 'unknown';

export default function RequestConfirmationPage() {
  const { token = '' } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['request-confirmation', token],
    queryFn: () => requestConfirmationApi.get(token),
    enabled: Boolean(token),
    retry: false,
  });

  const confirmation = data?.data;
  const coverImage = getAssetUrl(confirmation?.book.coverImage?.url);

  const respondMutation = useMutation({
    mutationFn: (accepted: boolean) => requestConfirmationApi.respond(token, accepted),
    onSuccess: (response, accepted) => {
      queryClient.invalidateQueries({ queryKey: ['request-confirmation', token] });
      toast({
        title: accepted ? 'Request confirmed' : 'Request cancelled',
        description: response.message,
      });
    },
    onError: (mutationError: AxiosError<{ message?: string }>) => {
      toast({
        title: 'Action failed',
        description: mutationError.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>{confirmation?.title || 'Book Request Confirmation'}</CardTitle>
            <CardDescription>
              Review the request details below and choose whether to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-12">Loading request details...</p>
            ) : isError || !confirmation ? (
              <p className="text-center text-destructive py-12">
                {(error as AxiosError<{ message?: string }>)?.response?.data?.message ||
                  'This confirmation link is invalid or no longer available.'}
              </p>
            ) : (
              <>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="font-medium">{confirmation.message}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Expires: {formatDateTime(confirmation.expiresAt)}
                  </p>
                  {confirmation.respondedAt && (
                    <p className="text-sm text-muted-foreground">
                      Responded: {formatDateTime(confirmation.respondedAt)}
                    </p>
                  )}
                </div>

                <div className="grid gap-6 md:grid-cols-[160px_1fr]">
                  <div className="overflow-hidden rounded-xl border bg-muted">
                    {coverImage ? (
                      <img src={coverImage} alt={confirmation.book.title || 'Book cover'} className="h-56 w-full object-cover" />
                    ) : (
                      <div className="flex h-56 items-center justify-center">
                        <BookMarked className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold">{confirmation.book.title || 'Book title unavailable'}</h2>
                      <p className="text-muted-foreground">{confirmation.book.author || 'Author unavailable'}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Detail label="Request ID" value={confirmation.request?.requestId} />
                      <Detail label="Request Status" value={formatStatus(confirmation.request?.status)} />
                      <Detail label="Requested On" value={formatDateTime(confirmation.request?.requestDate)} />
                      <Detail label="Student" value={confirmation.student.fullName} />
                      <Detail label="Book ID" value={confirmation.book.bookId} />
                      <Detail label="ISBN" value={confirmation.book.isbn} />
                      <Detail label="Publisher" value={confirmation.book.publisher} />
                      <Detail label="Shelf Location" value={confirmation.book.shelfLocation} />
                      <Detail label="Language" value={confirmation.book.language} />
                      <Detail label="Approved By" value={confirmation.initiatedBy || undefined} />
                    </div>
                  </div>
                </div>

                {confirmation.book.description && (
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-2">About This Book</h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {confirmation.book.description}
                    </p>
                  </div>
                )}

                {confirmation.request?.remarks && (
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-2">Remarks</h3>
                    <p className="text-sm text-muted-foreground">{confirmation.request.remarks}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Open LMS login
            </Link>
            {confirmation?.canRespond && !respondMutation.isPending ? (
              <div className="flex w-full gap-3 sm:w-auto">
                <Button
                  className="flex-1 sm:flex-none"
                  variant="outline"
                  onClick={() => respondMutation.mutate(false)}
                >
                  Cancel
                </Button>
                <Button className="flex-1 sm:flex-none" onClick={() => respondMutation.mutate(true)}>
                  Confirm
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {respondMutation.isPending
                  ? 'Saving your choice...'
                  : 'This request can no longer be changed from this page.'}
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value || '—'}</p>
    </div>
  );
}
