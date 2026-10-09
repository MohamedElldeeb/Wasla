import { AuthForm } from '@/components/app/auth-form';
import { signup } from '@/app/actions/auth';
import { getT } from '@/lib/i18n/server';

export default async function SignupPage() {
  const { t } = await getT();
  return (
    <>
      <h1 className="mb-1 text-2xl">{t.auth.signupTitle}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t.auth.signupSub}</p>
      <AuthForm mode="signup" action={signup} />
    </>
  );
}
