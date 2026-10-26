/**
 * Resolve uploaded asset paths for display in the browser.
 * Local uploads use site-relative URLs (/uploads/...) so the Vite dev proxy
 * or production reverse proxy serves them on the same origin as the SPA.
 */
export const getAssetUrl = (url?: string): string | undefined => {
  if (!url) return undefined;

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return url.startsWith('/') ? url : `/${url}`;
};
