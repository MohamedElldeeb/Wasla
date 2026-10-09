'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';

export type AuthState = { error?: string; info?: string } | undefined;

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const { t } = await getT();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
  });
  if (error) return { error: t.auth.badCredentials };
  redirect('/dashboard');
}

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  const { t } = await getT();
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) return { error: t.auth.weakPassword };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get('email') ?? '').trim(),
    password,
    options: { data: { full_name: String(formData.get('full_name') ?? '').trim() } },
  });
  if (error) return { error: t.auth.genericError };
  if (!data.session) return { info: t.auth.checkEmail };
  redirect('/onboarding');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
