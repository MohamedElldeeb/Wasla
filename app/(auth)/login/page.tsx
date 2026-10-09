import { AuthForm } from '@/components/app/auth-form';
import { login } from '@/app/actions/auth';
import { getT } from '@/lib/i18n/server';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { t } = await getT();
  return (
    <>
      <h1 className="mb-1 text-2xl">{t.auth.loginTitle}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t.auth.loginSub}</p>
      <AuthForm mode="login" action={login} oauthError={error === 'oauth'} />
    </>
  );
}
