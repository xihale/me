export const asset = (p: string) => import.meta.env.BASE_URL.replace(/\/$/, '') + '/' + p;
export const slug = (u: string) =>
  u.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/-$/, '').toLowerCase();
