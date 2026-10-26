import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { authApi } from '@/api/auth.api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { firstLoginSchema, FirstLoginFormData } from '@/schemas/auth.schema';

export default function FirstLoginPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FirstLoginFormData>({ resolver: zodResolver(firstLoginSchema) });

  const onSubmit = async (data: FirstLoginFormData) => {
    try {
      const response = await authApi.firstLoginChangePassword(data.newPassword, data.confirmPassword);
      await refreshUser();
      toast({ title: 'Success', description: 'Password set successfully.' });
      navigate(response.data?.redirectTo || '/student/dashboard');
    } catch (error) {
      const message =
        (error as AxiosError<{ message?: string }>)?.response?.data?.message || 'Failed to set password';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  return (
    <AuthLayout
      title="Set Your Password"
      subtitle="For security, please change your temporary password before continuing."
    >
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" {...register('newPassword')} />
              {errors.newPassword && (
                <p className="text-sm text-destructive">{errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Set Password & Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
