import type { Metadata } from 'next';
import { AuthForm } from '@/components/app/auth-form';
import { signup } from '@/app/actions/auth';
import { ar } from '@/lib/i18n/ar';

export const metadata: Metadata = { title: ar.auth.signup };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-1 text-xl">{ar.auth.signupTitle}</h1>
      <p className="mb-5 text-sm text-muted-foreground">{ar.auth.signupSub}</p>
      <AuthForm mode="signup" action={signup} />
    </>
  );
}
