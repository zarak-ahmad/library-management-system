import { Link } from 'react-router-dom';
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
import { registerSchema, RegisterFormData } from '@/schemas/auth.schema';
import { cn } from '@/lib/utils';

type ApiErrorResponse = {
  message?: string;
  errors?: Array<{ field?: string; message: string }>;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

const registerFieldNames: Array<keyof RegisterFormData> = [
  'registrationNumber',
  'fullName',
  'email',
  'phone',
  'department',
  'address',
];

export default function RegisterPage() {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    reValidateMode: 'onChange',
    defaultValues: {
      registrationNumber: '',
      fullName: '',
      email: '',
      phone: '',
      department: '',
      address: '',
    },
  });

  const inputClassName = (field: keyof RegisterFormData) =>
    cn(errors[field] && 'border-destructive focus-visible:ring-destructive');

  const applyServerErrors = (data?: ApiErrorResponse) => {
    if (!data) return false;

    let mapped = false;

    if (Array.isArray(data.errors)) {
      for (const error of data.errors) {
        if (error.field && registerFieldNames.includes(error.field as keyof RegisterFormData)) {
          setError(error.field as keyof RegisterFormData, {
            type: 'server',
            message: error.message,
          });
          mapped = true;
        }
      }
    }

    if (mapped) return true;

    const message = data.message;

    if (message === 'Email already registered') {
      setError('email', { type: 'server', message });
      return true;
    }

    if (message === 'Registration number already exists') {
      setError('registrationNumber', { type: 'server', message });
      return true;
    }

    return false;
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const response = await authApi.register(data);
      toast({
        title: 'Registration Successful',
        description: response.message || 'Check your email for login credentials.',
      });
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const data = axiosError.response?.data;

      if (applyServerErrors(data)) {
        return;
      }

      toast({
        title: 'Error',
        description: data?.message || 'Registration failed. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AuthLayout
      title="Student Registration"
      subtitle="Create your library account. Credentials will be sent to your email."
    >
      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="p-6 pt-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Registration Number</Label>
              <Input
                id="registrationNumber"
                placeholder="REG-2026-001"
                aria-invalid={!!errors.registrationNumber}
                className={inputClassName('registrationNumber')}
                {...register('registrationNumber')}
              />
              <FieldError message={errors.registrationNumber?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                aria-invalid={!!errors.fullName}
                className={inputClassName('fullName')}
                {...register('fullName', {
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                  },
                })}
              />
              <FieldError message={errors.fullName?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@university.edu"
                aria-invalid={!!errors.email}
                className={inputClassName('email')}
                {...register('email')}
              />
              <FieldError message={errors.email?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                inputMode="numeric"
                maxLength={11}
                placeholder="03001234567"
                aria-invalid={!!errors.phone}
                className={inputClassName('phone')}
                {...register('phone', {
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(/\D/g, '');
                  },
                })}
              />
              <FieldError message={errors.phone?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                placeholder="Computer Science"
                aria-invalid={!!errors.department}
                className={inputClassName('department')}
                {...register('department')}
              />
              <FieldError message={errors.department?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="123 University Road"
                aria-invalid={!!errors.address}
                className={inputClassName('address')}
                {...register('address')}
              />
              <FieldError message={errors.address?.message} />
            </div>

            <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
