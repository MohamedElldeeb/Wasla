const nf = new Intl.NumberFormat('en-US'); // Western digits (OPEN decision: digits style)
export const num = (n: number | null | undefined) => (n == null ? '—' : nf.format(n));
export const cairoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
export const dateFmt = (iso: string, locale: 'ar' | 'en' = 'ar') =>
  new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'medium' }).format(new Date(iso));
