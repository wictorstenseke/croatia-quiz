/**
 * Files in `public/` are copied verbatim, so Vite never rewrites a literal
 * "/img/…" string and it would break under the repo-name base on Pages.
 * Prefix them here instead. `BASE_URL` already ends in a slash.
 */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`
}
