import { AuthForm } from '@/components/app/auth-form';
import { signup } from '@/app/actions/auth';
import { getT } from '@/lib/i18n/server';

export default async function SignupPage() {
  const { t } = await getT();
  return (
    <>
      <div>
        <h1 className="text-h1 text-fg">{t.auth.signupTitle}</h1>
        <p className="mt-1 text-body text-fg-muted">{t.auth.signupSub}</p>
      </div>
      <AuthForm mode="signup" action={signup} />
    </>
  );
}
