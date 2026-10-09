const nf = new Intl.NumberFormat('en-US'); // Western digits (OPEN decision: digits style)
export const num = (n: number | null | undefined) => (n == null ? '—' : nf.format(n));
export const cairoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
export const dateAr = (iso: string) =>
  new Intl.DateTimeFormat('ar-EG-u-nu-latn', { timeZone: 'Africa/Cairo', dateStyle: 'medium' }).format(new Date(iso));
