import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/api/auth.api';
import { userApi } from '@/api/user.api';
import { updateProfileSchema, UpdateProfileForm } from '@/schemas/user.schema';
import { changePasswordSchema, ChangePasswordFormData } from '@/schemas/auth.schema';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const profileForm = useForm<UpdateProfileForm>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      address: user?.studentProfile?.address || '',
    },
  });

  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName,
        phone: user.phone || '',
        address: user.studentProfile?.address || '',
      });
    }
  }, [user, profileForm]);

  const profileMutation = useMutation({
    mutationFn: userApi.updateProfile,
    onSuccess: async () => {
      await refreshUser();
      toast({ title: 'Success', description: 'Profile updated successfully.' });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update profile',
        variant: 'destructive',
      });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: ChangePasswordFormData) =>
      authApi.changePassword(data.currentPassword, data.newPassword, data.confirmPassword),
    onSuccess: () => {
      passwordForm.reset();
      toast({ title: 'Success', description: 'Password changed successfully.' });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to change password',
        variant: 'destructive',
      });
    },
  });

  return (
    <DashboardLayout title="Profile Settings">
      <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>View your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="capitalize font-medium">{user?.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{user?.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              {user && <StatusBadge status={user.status} />}
            </div>
            {user?.studentProfile && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registration No.</span>
                <span className="font-mono">{user.studentProfile.registrationNumber}</span>
              </div>
            )}
            {user?.librarianProfile && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employee ID</span>
                <span className="font-mono">{user.librarianProfile.employeeId}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={profileForm.handleSubmit((d) => profileMutation.mutate(d))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input {...profileForm.register('fullName')} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input {...profileForm.register('phone')} />
              </div>
              {user?.role === 'student' && (
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea {...profileForm.register('address')} />
                </div>
              )}
              <Button type="submit" disabled={profileMutation.isPending}>
                {profileMutation.isPending ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={passwordForm.handleSubmit((d) => passwordMutation.mutate(d))}
              className="space-y-4 max-w-md"
            >
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" {...passwordForm.register('currentPassword')} />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" {...passwordForm.register('newPassword')} />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" {...passwordForm.register('confirmPassword')} />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={passwordMutation.isPending}>
                {passwordMutation.isPending ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
