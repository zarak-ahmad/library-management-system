import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { authApi } from '@/api/auth.api';
import { useToast } from '@/components/ui/use-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { forgotPasswordSchema, ForgotPasswordFormData } from '@/schemas/auth.schema';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [success, setSuccess] = useState<{ message: string; temporaryPassword?: string } | null>(
    null
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      const response = await authApi.forgotPassword(data.email);
      const temporaryPassword = response.data?.temporaryPassword;

      setSuccess({
        message: response.message || 'Password reset successful.',
        temporaryPassword,
      });

      toast({
        title: 'Password Reset',
        description: temporaryPassword
          ? `Your temporary password is: ${temporaryPassword}`
          : response.message,
      });
    } catch (error) {
      const message =
        (error as AxiosError<{ message?: string }>)?.response?.data?.message || 'Request failed';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  if (success) {
    return (
      <AuthLayout title="Password Reset" subtitle="Your new temporary password is ready">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-muted-foreground">{success.message}</p>
            {success.temporaryPassword && (
              <div className="rounded-md border list-surface p-4 space-y-2">
                <p className="text-sm font-medium">Your temporary password</p>
                <p className="font-mono text-lg font-semibold tracking-wide break-all">
                  {success.temporaryPassword}
                </p>
                <p className="text-xs text-muted-foreground">
                  This password was also sent to your email. Use it to sign in, then change your
                  password.
                </p>
              </div>
            )}
            <Button asChild className="w-full">
              <Link to="/login">Go to Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your email to receive a new temporary password"
    >
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@university.edu" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Temporary Password'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link to="/login" className="text-primary hover:underline font-medium">
              Back to Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
