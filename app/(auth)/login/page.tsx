import { AuthForm } from '@/components/app/auth-form';
import { login } from '@/app/actions/auth';
import { getT } from '@/lib/i18n/server';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { t } = await getT();
  return (
    <>
      <div>
        <h1 className="text-h1 text-fg">{t.auth.loginTitle}</h1>
        <p className="mt-1 text-body text-fg-muted">{t.auth.loginSub}</p>
      </div>
      <AuthForm mode="login" action={login} oauthError={error === 'oauth'} />
    </>
  );
}
