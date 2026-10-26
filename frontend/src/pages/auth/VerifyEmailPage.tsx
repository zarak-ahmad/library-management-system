import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authApi } from '@/api/auth.api';
import { useToast } from '@/components/ui/use-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus('success');
        toast({ title: 'Email Verified', description: 'Your email has been verified.' });
      })
      .catch(() => setStatus('error'));
  }, [token, toast]);

  return (
    <AuthLayout title="Email Verification">
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          {status === 'loading' && (
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p>Your email has been verified successfully.</p>
              <Button asChild>
                <Link to="/login">Go to Login</Link>
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <p>Invalid or expired verification link.</p>
              <Button asChild variant="outline">
                <Link to="/login">Back to Login</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
