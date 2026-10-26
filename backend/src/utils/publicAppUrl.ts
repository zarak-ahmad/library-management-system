import { env } from '../config/env';

export const isLocalhostUrl = (url: string): boolean =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url.trim());

/** Public URL for WhatsApp confirmation links (works on phones). */
export const getPublicConfirmationBaseUrl = (): string => {
  const client = env.CLIENT_URL.replace(/\/$/, '');
  if (!isLocalhostUrl(client)) {
    return client;
  }

  const webhook = env.WEBHOOK_BASE_URL?.trim().replace(/\/$/, '');
  if (webhook) {
    return webhook;
  }

  return client;
};

export const getConfirmationPageUrl = (token: string): string =>
  `${getPublicConfirmationBaseUrl()}/request-confirmation/${token}`;

export const getConfirmationConfirmUrl = (token: string): string =>
  `${getPublicConfirmationBaseUrl()}/request-confirmation/${token}/confirm`;

export const getConfirmationCancelUrl = (token: string): string =>
  `${getPublicConfirmationBaseUrl()}/request-confirmation/${token}/cancel`;

/** Public URL for uploaded assets (covers, etc.) when using ngrok backend. */
export const resolvePublicMediaUrl = (url?: string): string | null => {
  if (!url?.trim()) return null;

  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (!trimmed.startsWith('/')) {
    return null;
  }

  const publicBase = env.WEBHOOK_BASE_URL?.replace(/\/$/, '');
  if (!publicBase) {
    return null;
  }

  return `${publicBase}${trimmed}`;
};
