import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-4 py-10">
      <Image src="/brand/wasla-logo.svg" alt="وصلة" width={230} height={96} priority className="mx-auto h-24 w-auto" />
      <div className="rounded-2xl border bg-card p-6 shadow-sm">{children}</div>
    </main>
  );
}
