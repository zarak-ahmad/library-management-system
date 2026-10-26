import { env } from '../config/env';
import { normalizePhoneForWhatsApp, phoneDigitsOnly, phonesMatch } from '../utils/phone';
import { resolvePublicMediaUrl } from '../utils/publicAppUrl';

export { resolvePublicMediaUrl };

interface SendWhatsAppOptions {
  to: string;
  body: string;
}

type ConfirmationKind = 'book_request' | 'book_issue';

interface InteractiveConfirmationPayload {
  phone: string;
  fullName: string;
  bookTitle: string;
  bookAuthor?: string;
  bookIsbn?: string;
  bookId?: string;
  bookPublisher?: string;
  bookEdition?: string;
  publishedYear?: number;
  shelfLocation?: string;
  language?: string;
  description?: string;
  coverImageUrl?: string;
  token: string;
  kind: ConfirmationKind;
  confirmUrl: string;
  cancelUrl: string;
}

const KEYWORD_CONFIRM = 'CONFIRM';
const KEYWORD_CANCEL = 'CANCEL';

const WHATSAPP_DESCRIPTION_MAX = 500;
const WHATSAPP_IMAGE_CAPTION_MAX = 1024;

const truncateForWhatsApp = (text: string, max = WHATSAPP_DESCRIPTION_MAX): string => {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 3).trimEnd()}...`;
};

/** Wasender/Meta need a publicly reachable URL (Cloudinary or WEBHOOK_BASE_URL + /uploads). */

const appendDetailLine = (lines: string[], label: string, value?: string | number): void => {
  if (value === undefined || value === null) return;
  const text = String(value).trim();
  if (!text) return;
  lines.push(`${label}: ${text}`);
};

const CONFIRM_ORDER_LINK_LABEL = 'Click here to confirm your order';
const CONFIRM_PICKUP_LINK_LABEL = 'Click here to confirm pickup';

const LIBRARY_BRAND = 'Library LMS';
const WHATSAPP_POLL_QUESTION_MAX = 255;

/** Poll option labels — parsed by parsePollOptionResponse(). */
const POLL_CONFIRM_OPTION = 'Confirm my reservation';
const POLL_CANCEL_OPTION = 'Cancel my reservation';

type WhatsAppConfirmationDelivery = 'hyperlink' | 'poll';

export const getWhatsAppConfirmationDeliveryMode = (): WhatsAppConfirmationDelivery =>
  'hyperlink';

const getConfirmationLinkLabel = (kind: ConfirmationKind): string =>
  kind === 'book_request' ? CONFIRM_ORDER_LINK_LABEL : CONFIRM_PICKUP_LINK_LABEL;

const buildBookSummaryLines = (payload: InteractiveConfirmationPayload): string[] => {
  const lines: string[] = [`📖 *${payload.bookTitle}*`];
  if (payload.bookAuthor?.trim()) lines.push(`Author: ${payload.bookAuthor.trim()}`);
  if (payload.bookId?.trim()) lines.push(`Book ID: ${payload.bookId.trim()}`);
  if (payload.bookIsbn?.trim()) lines.push(`ISBN: ${payload.bookIsbn.trim()}`);
  if (payload.shelfLocation?.trim()) lines.push(`Shelf: ${payload.shelfLocation.trim()}`);
  return lines;
};

/** Hyperlink mode — book cover caption with full details + confirm/cancel URLs. */
const buildConfirmationDetailsText = (payload: InteractiveConfirmationPayload): string => {
  const {
    fullName,
    bookTitle,
    bookAuthor,
    bookIsbn,
    bookId,
    bookPublisher,
    bookEdition,
    publishedYear,
    shelfLocation,
    language,
    description,
    kind,
    confirmUrl,
    cancelUrl,
  } = payload;

  const intro =
    kind === 'book_request'
      ? `Hi ${fullName}, you have ordered '${bookTitle}'.`
      : `Hi ${fullName}, your book '${bookTitle}' is ready for pickup.`;

  const orderLines: string[] = [];
  appendDetailLine(orderLines, 'Book', bookTitle);
  appendDetailLine(orderLines, 'Author', bookAuthor);
  appendDetailLine(orderLines, 'ISBN', bookIsbn);
  appendDetailLine(orderLines, 'Book ID', bookId);
  appendDetailLine(orderLines, 'Publisher', bookPublisher);
  appendDetailLine(orderLines, 'Edition', bookEdition);
  appendDetailLine(orderLines, 'Published', publishedYear);
  appendDetailLine(orderLines, 'Language', language);
  appendDetailLine(orderLines, 'Shelf location', shelfLocation);

  const sections = [intro, '', ...orderLines];

  if (description?.trim()) {
    sections.push('', 'About this book:', truncateForWhatsApp(description, 280));
  }

  sections.push(
    '',
    'Please choose one of the options below:',
    '',
    'To confirm:',
    confirmUrl,
    '',
    'To cancel:',
    cancelUrl
  );

  return sections.join('\n');
};

/** Native poll question — keep short; book details go in the text field. */
const buildPollQuestion = (_payload: InteractiveConfirmationPayload): string =>
  truncateForWhatsApp('Please confirm or cancel your reservation', WHATSAPP_POLL_QUESTION_MAX);

/** Companion text above the poll — book details only (no hyperlinks). */
const buildPollCompanionText = (payload: InteractiveConfirmationPayload): string => {
  const lines = [
    `📚 *${LIBRARY_BRAND}*`,
    '',
    `Hello ${payload.fullName},`,
    '',
    'You have a book reservation waiting for your response.',
    '',
    ...buildBookSummaryLines(payload),
    '',
    'Vote in the poll below:',
    '',
    '_University Library Management System_',
  ];
  return truncateForWhatsApp(lines.join('\n'), WHATSAPP_IMAGE_CAPTION_MAX);
};

export const buildBookRequestConfirmAck = (_fullName: string, bookTitle: string): string =>
  [
    `Success! Your reservation for '${bookTitle}' has been confirmed. ✅`,
    'Thank you for using our library system!',
  ].join('\n');

export const buildBookRequestCancelAck = (_fullName: string, bookTitle: string): string =>
  [
    `Your reservation for '${bookTitle}' has been cancelled.`,
    'Thank you for using our library system!',
  ].join('\n');

export const buildBookIssueConfirmAck = (fullName: string, bookTitle: string): string =>
  [
    `📚 *${LIBRARY_BRAND}*`,
    '',
    `Hello ${fullName},`,
    '',
    `✅ Pickup confirmed for *"${bookTitle}"*.`,
    '',
    'Please collect your book from the library desk during opening hours.',
    '',
    '_Thank you for using the library._',
  ].join('\n');

export const buildBookIssueCancelAck = (fullName: string, bookTitle: string): string =>
  [
    `📚 *${LIBRARY_BRAND}*`,
    '',
    `Hello ${fullName},`,
    '',
    `❌ Pickup cancelled for *"${bookTitle}"*.`,
    '',
    'No borrow record was created.',
    '',
    '_Thank you for using the library._',
  ].join('\n');

export const parseKeywordConfirmCancel = (text: string): boolean | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const firstLine = trimmed.split(/\r?\n/)[0]?.trim() ?? trimmed;
  const firstWord = firstLine.split(/\s+/)[0]?.replace(/[.!?,]+$/, '').toUpperCase() ?? '';

  if (firstWord === KEYWORD_CONFIRM) return true;
  if (firstWord === KEYWORD_CANCEL) return false;

  const normalized = firstLine.toUpperCase();
  if (normalized === KEYWORD_CONFIRM) return true;
  if (normalized === KEYWORD_CANCEL) return false;

  return null;
};

export const parseKeywordWithToken = (
  text: string
): { token: string; accepted: boolean } | null => {
  const trimmed = text.trim();
  const inline = trimmed.toUpperCase().match(/^(CONFIRM|CANCEL)\s+([A-F0-9]{16})$/);
  if (inline) {
    return {
      accepted: inline[1] === 'CONFIRM',
      token: inline[2].toLowerCase(),
    };
  }

  const keyword = parseKeywordConfirmCancel(trimmed);
  if (keyword === null) return null;

  const refMatch = trimmed.match(/\bref[:\s#-]*([a-f0-9]{16})\b/i);
  if (!refMatch) return null;

  return { token: refMatch[1].toLowerCase(), accepted: keyword };
};

type WasenderMessageKey = {
  fromMe?: boolean;
  remoteJid?: string;
  cleanedSenderPn?: string;
  cleanedParticipantPn?: string;
};

export const extractWasenderSenderPhone = (key?: WasenderMessageKey): string | null => {
  if (!key) return null;

  const cleaned = key.cleanedSenderPn || key.cleanedParticipantPn;
  if (cleaned) {
    const digits = phoneDigitsOnly(cleaned);
    if (digits) return digits;
  }

  const jidUser = key.remoteJid?.split('@')[0];
  if (!jidUser) return null;

  const digits = phoneDigitsOnly(jidUser);
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  return null;
};

const META_CONFIRM_TITLE = 'Confirm your order';
const META_CANCEL_TITLE = 'Cancel your order';

type WhatsAppProvider = 'wasender' | 'twilio' | 'meta' | 'console';

const hasMetaCreds = (): boolean =>
  Boolean(env.WHATSAPP_CLOUD_TOKEN && env.WHATSAPP_CLOUD_PHONE_NUMBER_ID);

const hasWasenderCreds = (): boolean => Boolean(env.WASENDER_API_KEY);

const hasTwilioCreds = (): boolean =>
  Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM);

const getWhatsAppProvider = (): WhatsAppProvider => {
  if (hasWasenderCreds()) {
    return 'wasender';
  }
  if (hasTwilioCreds()) {
    return 'twilio';
  }
  if (hasMetaCreds()) {
    return 'meta';
  }
  return 'console';
};

/** Confirmations prefer Meta (native reply buttons) when configured. */
export const getConfirmationProvider = (): WhatsAppProvider => {
  const mode = env.WHATSAPP_CONFIRMATION_PROVIDER;

  if (mode === 'meta' && hasMetaCreds()) return 'meta';
  if (mode === 'wasender' && hasWasenderCreds()) return 'wasender';
  if (mode === 'twilio' && hasTwilioCreds()) return 'twilio';

  if (mode === 'auto' || mode === 'meta') {
    if (hasMetaCreds()) return 'meta';
  }
  if (mode === 'auto' || mode === 'wasender') {
    if (hasWasenderCreds()) return 'wasender';
  }
  if (hasTwilioCreds()) return 'twilio';
  if (hasMetaCreds()) return 'meta';
  return 'console';
};

export const getWhatsAppProviderLabel = (): string => getWhatsAppProvider();
export const getConfirmationProviderLabel = (): string => getConfirmationProvider();

export const getWasenderConfirmationLimitation = (): string | null => null;

const parseWasenderButtonId = (
  raw: string
): { token: string; accepted: boolean } | { phoneLookup: true; accepted: boolean } | null => {
  const keyword = parseKeywordConfirmCancel(raw);
  if (keyword !== null) {
    return { phoneLookup: true, accepted: keyword };
  }

  const normalized = raw.trim().toLowerCase();
  const withToken = normalized.match(/^(confirm|cancel)_([a-f0-9]{16})$/);
  if (withToken) {
    return {
      accepted: withToken[1] === 'confirm',
      token: withToken[2],
    };
  }

  if (normalized === 'confirm_order' || normalized === 'confirm') {
    return { phoneLookup: true, accepted: true };
  }
  if (normalized === 'cancel_order' || normalized === 'cancel') {
    return { phoneLookup: true, accepted: false };
  }

  return null;
};

const formatLibraryDateTime = (date: Date): string =>
  date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

const formatLibraryDate = (date: Date): string =>
  date.toLocaleDateString('en-US', { dateStyle: 'medium' });

const formatWasenderRecipient = (to: string): string => to.replace(/^\+/, '');

/** Wasender free tier allows ~1 message/min per recipient — track last send per phone. */
const wasenderLastSendAt = new Map<string, number>();
const WASENDER_SEND_GAP_MS = 65_000;

const wasenderPhoneKey = (phone: string): string => {
  const normalized = normalizePhoneForWhatsApp(phone, env.WHATSAPP_DEFAULT_COUNTRY_CODE);
  return phoneDigitsOnly(normalized || phone);
};

const markWasenderMessageSent = (phone: string): void => {
  const key = wasenderPhoneKey(phone);
  if (key) wasenderLastSendAt.set(key, Date.now());
};

const waitForWasenderRateLimit = async (phone: string): Promise<void> => {
  const key = wasenderPhoneKey(phone);
  if (!key) return;
  const last = wasenderLastSendAt.get(key);
  if (!last) return;
  const waitMs = WASENDER_SEND_GAP_MS - (Date.now() - last);
  if (waitMs > 0) {
    console.log(
      `[WasenderApi] Rate limit: waiting ${Math.ceil(waitMs / 1000)}s before next message to ${key}`
    );
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
};

const wasenderPost = async (payload: Record<string, unknown>): Promise<unknown> => {
  const baseUrl = env.WASENDER_API_BASE_URL.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/send-message`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.WASENDER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  if (response.status === 429) {
    let retryAfter = 60;
    try {
      const parsed = JSON.parse(responseText) as { retry_after?: number };
      if (typeof parsed.retry_after === 'number' && parsed.retry_after > 0) {
        retryAfter = parsed.retry_after;
      }
    } catch {
      // use default retryAfter
    }
    throw new Error(
      `WasenderApi rate limit (${response.status}): wait ${retryAfter}s before sending again. ${responseText}`
    );
  }

  if (!response.ok) {
    throw new Error(`WasenderApi error (${response.status}): ${responseText}`);
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
};

const sendViaWasenderText = async (to: string, body: string): Promise<void> => {
  await waitForWasenderRateLimit(to);
  await wasenderPost({ to: formatWasenderRecipient(to), text: body });
  markWasenderMessageSent(to);
  console.log('[WasenderApi] Text sent:', {
    to: formatWasenderRecipient(to),
    preview: body.slice(0, 100),
  });
};

export type WasenderSendResult = {
  recipientJid?: string;
  msgId?: string;
};

const parseWasenderSendMeta = (response: unknown): WasenderSendResult => {
  const data = (
    response as {
      data?: {
        jid?: string;
        msgId?: number | string;
        key?: { id?: string | number };
        messageId?: string | number;
      };
    }
  )?.data;
  const recipientJid = data?.jid
    ? String(data.jid).replace(/@.*/, '').trim() || undefined
    : undefined;
  const msgId =
    data?.msgId != null
      ? String(data.msgId)
      : data?.key?.id != null
        ? String(data.key.id)
        : data?.messageId != null
          ? String(data.messageId)
          : undefined;
  return { recipientJid, msgId };
};

// ─── POLL mode: native WhatsApp poll (Wasender) ───────────────────────────────
const sendViaWasenderNativePollConfirmation = async (
  payload: InteractiveConfirmationPayload
): Promise<WasenderSendResult> => {
  const normalized = normalizePhoneForWhatsApp(payload.phone, env.WHATSAPP_DEFAULT_COUNTRY_CODE);
  if (!normalized) {
    throw new Error('Invalid phone for Wasender poll confirmation message');
  }

  const recipient = formatWasenderRecipient(normalized);

  const pollPayload = {
    to: recipient,
    text: buildPollCompanionText(payload),
    poll: {
      question: buildPollQuestion(payload),
      options: [POLL_CONFIRM_OPTION, POLL_CANCEL_OPTION],
      multiSelect: false,
    },
  };

  console.log('[WasenderApi] Sending poll payload:', pollPayload);
  let response: unknown;
  try {
    response = await wasenderPost(pollPayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('poll') && !message.toLowerCase().includes('text')) {
      throw error;
    }
    console.warn('[WasenderApi] text+poll rejected, retrying poll-only');
    response = await wasenderPost({
      to: recipient,
      poll: {
        question: truncateForWhatsApp(
          `${buildPollCompanionText(payload)}\n\n${buildPollQuestion(payload)}`,
          WHATSAPP_POLL_QUESTION_MAX
        ),
        options: [POLL_CONFIRM_OPTION, POLL_CANCEL_OPTION],
        multiSelect: false,
      },
    });
  }
  console.log('[WasenderApi] Poll sent:', response);

  markWasenderMessageSent(normalized);
  return parseWasenderSendMeta(response);
};

// ─── HYPERLINK mode: image + caption with confirm/cancel links ─────────────────
const sendViaWasenderHyperlinkConfirmation = async (
  payload: InteractiveConfirmationPayload
): Promise<WasenderSendResult> => {
  const normalized = normalizePhoneForWhatsApp(payload.phone, env.WHATSAPP_DEFAULT_COUNTRY_CODE);
  if (!normalized) {
    throw new Error('Invalid phone for Wasender hyperlink confirmation message');
  }

  const recipient = formatWasenderRecipient(normalized);
  const detailsText = buildConfirmationDetailsText(payload);
  const imageUrl = resolvePublicMediaUrl(payload.coverImageUrl);

  await waitForWasenderRateLimit(normalized);

  const response = imageUrl
    ? await wasenderPost({
        to: recipient,
        imageUrl,
        text: truncateForWhatsApp(detailsText, WHATSAPP_IMAGE_CAPTION_MAX),
      })
    : await wasenderPost({
        to: recipient,
        text: detailsText,
      });

  console.log('[WasenderApi] Hyperlink confirmation sent:', {
    to: recipient,
    hasImage: Boolean(imageUrl),
  });

  markWasenderMessageSent(normalized);
  return parseWasenderSendMeta(response);
};

const sendViaWasenderConfirmation = async (
  payload: InteractiveConfirmationPayload
): Promise<WasenderSendResult> => {
  if (getWhatsAppConfirmationDeliveryMode() === 'hyperlink') {
    return sendViaWasenderHyperlinkConfirmation(payload);
  }
  return sendViaWasenderNativePollConfirmation(payload);
};

const getConfirmationLabels = (): { yes: string; no: string } => ({
  yes: KEYWORD_CONFIRM,
  no: KEYWORD_CANCEL,
});

const toPlainWhatsAppText = (text: string): string => text.replace(/\*/g, '');

const getConfirmationSubject = (kind: ConfirmationKind): string =>
  kind === 'book_request' ? 'Book Request Confirmation' : 'Book Issue Confirmation';

const buildConfirmationBody = (
  payload: InteractiveConfirmationPayload,
  _options?: { includeSubject?: boolean; includeRawUrl?: boolean }
): string => buildConfirmationDetailsText(payload);

const sendViaTwilio = async (to: string, body: string): Promise<void> => {
  const accountSid = env.TWILIO_ACCOUNT_SID!;
  const authToken = env.TWILIO_AUTH_TOKEN!;
  const from = env.TWILIO_WHATSAPP_FROM!.startsWith('whatsapp:')
    ? env.TWILIO_WHATSAPP_FROM!
    : `whatsapp:${env.TWILIO_WHATSAPP_FROM}`;

  const toAddress = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: from,
        To: toAddress,
        Body: body,
      }),
    }
  );
  

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio WhatsApp error (${response.status}): ${errorText}`);
  }


};

const sendMetaReplyButtonConfirmation = async (
  to: string,
  subject: string,
  body: string,
  token: string,
  coverImageUrl?: string
): Promise<void> => {
  const phoneNumberId = env.WHATSAPP_CLOUD_PHONE_NUMBER_ID!;
  const accessToken = env.WHATSAPP_CLOUD_TOKEN!;
  const recipient = to.replace(/\D/g, '');
  const imageLink = resolvePublicMediaUrl(coverImageUrl);

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'interactive',
      interactive: {
        type: 'button',
        header: imageLink
          ? { type: 'image', image: { link: imageLink } }
          : { type: 'text', text: subject },
        body: { text: body },
        footer: { text: 'Tap a button below to confirm or cancel your request.' },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: { id: `BR_YES_${token}`, title: META_CONFIRM_TITLE },
            },
            {
              type: 'reply',
              reply: { id: `BR_NO_${token}`, title: META_CANCEL_TITLE },
            },
          ],
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WhatsApp Cloud API error (${response.status}): ${errorText}`);
  }
};

const sendMetaCtaUrlConfirmation = async (
  to: string,
  body: string,
  buttonLabel: string,
  actionUrl: string,
  coverImageUrl?: string
): Promise<void> => {
  const phoneNumberId = env.WHATSAPP_CLOUD_PHONE_NUMBER_ID!;
  const accessToken = env.WHATSAPP_CLOUD_TOKEN!;
  const recipient = to.replace(/\D/g, '');
  const imageLink = resolvePublicMediaUrl(coverImageUrl);
  const displayText = buttonLabel.length <= 20 ? buttonLabel : 'Confirm your order';

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        ...(imageLink ? { header: { type: 'image', image: { link: imageLink } } } : {}),
        body: { text: toPlainWhatsAppText(body) },
        action: {
          name: 'cta_url',
          parameters: {
            display_text: displayText,
            url: actionUrl,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WhatsApp Cloud API error (${response.status}): ${errorText}`);
  }
};

const sendViaMetaText = async (to: string, body: string): Promise<void> => {
  const phoneNumberId = env.WHATSAPP_CLOUD_PHONE_NUMBER_ID!;
  const accessToken = env.WHATSAPP_CLOUD_TOKEN!;
  const recipient = to.replace(/\D/g, '');

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'text',
      text: { body },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WhatsApp Cloud API error (${response.status}): ${errorText}`);
  }
};

export const sendWhatsAppMessage = async (options: SendWhatsAppOptions): Promise<boolean> => {
  const normalized = normalizePhoneForWhatsApp(options.to, env.WHATSAPP_DEFAULT_COUNTRY_CODE);
  if (!normalized) {
    console.warn('[WhatsApp] Skipped — invalid or missing phone number');
    return false;
  }

  const provider = getWhatsAppProvider();

  if (provider === 'console') {
    console.log('--- WHATSAPP (dev mode) ---');
    console.log(`To: ${normalized}`);
    console.log(options.body);
    console.log('--- END WHATSAPP ---');
    return true;
  }

  try {
    if (provider === 'wasender') {
      await sendViaWasenderText(normalized, options.body);
    } else if (provider === 'twilio') {
      await sendViaTwilio(normalized, options.body);
    } else {
      await sendViaMetaText(normalized, options.body);
    }
    return true;
  } catch (error) {
    console.error('[WhatsApp] Failed to send message:', error);
    return false;
  }
};

export type WhatsAppConfirmationSendResult = {
  sent: boolean;
  recipientJid?: string;
  msgId?: string;
};

const sendConfirmationMessage = async (
  payload: InteractiveConfirmationPayload
): Promise<WhatsAppConfirmationSendResult> => {
  const normalized = normalizePhoneForWhatsApp(payload.phone, env.WHATSAPP_DEFAULT_COUNTRY_CODE);
  if (!normalized) {
    console.warn('[WhatsApp] Skipped confirmation — invalid phone');
    return { sent: false };
  }

  const provider = getConfirmationProvider();

  if (provider === 'console') {
    const imageUrl = resolvePublicMediaUrl(payload.coverImageUrl);
    const delivery = getWhatsAppConfirmationDeliveryMode();
    console.log('--- WHATSAPP CONFIRMATION (dev mode) ---');
    console.log(`To: ${normalized}`);
    console.log(`Delivery: ${delivery}`);
    if (imageUrl) {
      console.log(`Cover image: ${imageUrl}`);
    }
    if (delivery === 'hyperlink') {
      console.log(buildConfirmationDetailsText(payload));
    } else {
      console.log(buildPollCompanionText(payload));
      console.log('Poll question:', buildPollQuestion(payload));
      console.log('Poll options:', [POLL_CONFIRM_OPTION, POLL_CANCEL_OPTION]);
      console.log('(Enable poll.results + messages.received webhooks in Wasender)');
    }
    console.log('--- END WHATSAPP ---');
    return { sent: true };
  }

  try {
    if (provider === 'wasender') {
      const result = await sendViaWasenderConfirmation({ ...payload, phone: normalized });
      return { sent: true, recipientJid: result.recipientJid, msgId: result.msgId };
    } else if (provider === 'twilio') {
      const linkText = buildConfirmationDetailsText({ ...payload, phone: normalized });
      await sendViaTwilio(normalized, linkText);
    } else if (provider === 'meta') {
      await sendMetaCtaUrlConfirmation(
        normalized,
        buildConfirmationDetailsText({ ...payload, phone: normalized }),
        getConfirmationLinkLabel(payload.kind),
        payload.confirmUrl,
        payload.coverImageUrl
      );
    }
    return { sent: true };
  } catch (error) {
    console.error('[WhatsApp] Failed to send confirmation:', error);
    return { sent: false };
  }
};

export const sendBookRequestAckWhatsApp = async (phone: string, message: string): Promise<void> => {
  const sendAck = async (): Promise<boolean> =>
    sendWhatsAppMessage({ to: phone, body: message });

  let sent = await sendAck();
  if (sent) {
    console.log('[WhatsApp] Poll confirmation ack sent:', { phone, message });
    return;
  }

  console.warn('[WhatsApp] Poll confirmation ack failed, retrying after rate-limit window...');
  await new Promise((resolve) => setTimeout(resolve, WASENDER_SEND_GAP_MS));
  sent = await sendAck();
  if (sent) {
    console.log('[WhatsApp] Poll confirmation ack sent on retry:', { phone });
  } else {
    console.error('[WhatsApp] Poll confirmation ack failed after retry:', { phone, message });
  }
};

export const sendBookRequestConfirmationWhatsApp = async (payload: {
  phone: string;
  fullName: string;
  bookTitle: string;
  bookAuthor?: string;
  bookIsbn?: string;
  bookId?: string;
  bookPublisher?: string;
  bookEdition?: string;
  publishedYear?: number;
  shelfLocation?: string;
  language?: string;
  description?: string;
  coverImageUrl?: string;
  token: string;
  confirmUrl: string;
  cancelUrl: string;
}): Promise<WhatsAppConfirmationSendResult> =>
  sendConfirmationMessage({ ...payload, kind: 'book_request' });

export const sendBookIssueConfirmationWhatsApp = async (payload: {
  phone: string;
  fullName: string;
  bookTitle: string;
  bookAuthor?: string;
  bookIsbn?: string;
  bookId?: string;
  bookPublisher?: string;
  bookEdition?: string;
  publishedYear?: number;
  shelfLocation?: string;
  language?: string;
  description?: string;
  coverImageUrl?: string;
  token: string;
  confirmUrl: string;
  cancelUrl: string;
}): Promise<WhatsAppConfirmationSendResult> =>
  sendConfirmationMessage({ ...payload, kind: 'book_issue' });

export interface BookApprovedWhatsAppPayload {
  phone?: string;
  fullName: string;
  bookTitle: string;
  bookAuthor?: string;
  bookId?: string;
  transactionId: string;
  issueDate: Date;
  dueDate: Date;
}

export const sendBookApprovedWhatsApp = async (
  payload: BookApprovedWhatsAppPayload
): Promise<boolean> => {
  if (!payload.phone?.trim()) {
    return false;
  }

  const lines = [
    `📚 *${LIBRARY_BRAND}*`,
    '',
    `Hello ${payload.fullName},`,
    '',
    '✅ Your book has been issued successfully.',
    '',
    `📖 *${payload.bookTitle}*`,
  ];

  if (payload.bookAuthor) lines.push(`Author: ${payload.bookAuthor}`);
  if (payload.bookId) lines.push(`Book ID: ${payload.bookId}`);

  lines.push(
    '',
    `Issued: ${formatLibraryDateTime(payload.issueDate)}`,
    `Return by: ${formatLibraryDate(payload.dueDate)}`,
    `Reference: ${payload.transactionId}`,
    '',
    'Please return the book by the due date to avoid fines.',
    '',
    '_Thank you for using the library._'
  );

  return sendWhatsAppMessage({ to: payload.phone, body: lines.join('\n') });
};

const parsePollOptionResponse = (optionName: string): boolean | null => {
  const normalized = optionName.trim().toLowerCase();

  // Wasender/WhatsApp poll votes often send the option index (0 = confirm, 1 = cancel).
  if (/^\d+$/.test(normalized)) {
    const index = Number(normalized);
    if (index === 0) return true;
    if (index === 1) return false;
    return null;
  }

  if (
    normalized.includes('cancel') &&
    (normalized.includes('reservation') || normalized.includes('my'))
  ) {
    return false;
  }
  if (
    normalized.includes('confirm') &&
    (normalized.includes('reservation') || normalized.includes('my'))
  ) {
    return true;
  }
  if (normalized === 'yes' || normalized.startsWith('yes') || normalized.includes('confirm')) {
    return true;
  }
  if (normalized === 'no' || normalized.startsWith('no') || normalized.includes('cancel')) {
    return false;
  }
  return null;
};

export const parsePollVoteFromInboundMessage = (
  payload: unknown
):
  | { phone: string; accepted: boolean; pollKeyId?: string }
  | { jid: string; accepted: boolean; pollKeyId?: string }
  | null => {
  const inbound = extractWasenderInboundMessage(payload);
  if (!inbound) return null;

  const { phoneDigits, jid } = extractWasenderSenderIdentifiers(inbound.key);
  const pollKeyId = inbound.pollCreationKeyId;

  if (inbound.pollOption) {
    const decision = parsePollOptionResponse(inbound.pollOption);
    if (decision === null) return null;
    if (phoneDigits) return { phone: phoneDigits, accepted: decision, pollKeyId };
    if (jid) return { jid, accepted: decision, pollKeyId };
    return null;
  }

  const text = inbound.messageBody?.trim();
  if (!text) return null;

  const decision = parsePollOptionResponse(text) ?? parseButtonLabelResponse(text);
  if (decision === null) return null;

  if (phoneDigits) return { phone: phoneDigits, accepted: decision, pollKeyId };
  if (jid) return { jid, accepted: decision, pollKeyId };
  return null;
};

export const parseButtonLabelResponse = (text: string): boolean | null => {
  const normalized = text.trim().toLowerCase();
  if (
    normalized.includes('confirm') ||
    normalized === 'confirm order ✅' ||
    normalized === 'confirm order' ||
    normalized === 'confirm your order'
  ) {
    return true;
  }
  if (
    normalized.includes('cancel') ||
    normalized === 'cancel order ❌' ||
    normalized === 'cancel order' ||
    normalized === 'cancel your order'
  ) {
    return false;
  }
  return null;
};


export const parseInboundResponse = (text: string): { token: string; accepted: boolean } | null => {
  const normalized = text.trim().toUpperCase();

  const buttonMatch = normalized.match(/^(?:BR_)?(YES|NO)[_\s-]?([A-F0-9]{16})$/i);
  if (buttonMatch) {
    return {
      accepted: buttonMatch[1].toUpperCase() === 'YES',
      token: buttonMatch[2].toLowerCase(),
    };
  }

  const replyMatch = normalized.match(/^(YES|NO)\s+([A-F0-9]{16})$/i);
  if (replyMatch) {
    return {
      accepted: replyMatch[1].toUpperCase() === 'YES',
      token: replyMatch[2].toLowerCase(),
    };
  }

  return null;
};

export const parseSimpleYesNoResponse = (text: string): boolean | null => {
  const keyword = parseKeywordConfirmCancel(text);
  if (keyword !== null) return keyword;

  const label = parseButtonLabelResponse(text);
  if (label !== null) return label;

  const normalized = text.trim().toLowerCase();
  if (/^(yes|y|confirm|1)$/.test(normalized)) return true;
  if (/^(no|n|cancel|2)$/.test(normalized)) return false;
  return null;
};

export const parseMetaWebhookResponse = (
  payload: unknown
): { token: string; accepted: boolean } | null => {
  const body = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{
            type?: string;
            text?: { body?: string };
            interactive?: {
              type?: string;
              button_reply?: { id?: string };
            };
          }>;
        };
      }>;
    }>;
  };

  const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return null;

  if (message.type === 'interactive' && message.interactive?.button_reply?.id) {
    const id = message.interactive.button_reply.id.toUpperCase();
    const match = id.match(/^BR_(YES|NO)_([A-F0-9]{16})$/);
    if (match) {
      return { accepted: match[1] === 'YES', token: match[2].toLowerCase() };
    }
  }

  if (message.type === 'text' && message.text?.body) {
    return parseInboundResponse(message.text.body);
  }

  return null;
};

export const verifyWasenderWebhook = (signatureHeader: string | undefined): boolean => {
  if (!env.WASENDER_WEBHOOK_SECRET) {
    return env.isDev || env.isTest;
  }
  return signatureHeader === env.WASENDER_WEBHOOK_SECRET;
};

const extractVoterPhone = (
  voterJid: string,
  chatKey?: WasenderMessageKey & { id?: string }
): string | null => {
  const fromVoter = phoneDigitsOnly(voterJid.replace(/@.*/, ''));
  if (fromVoter.length >= 10 && fromVoter.length <= 15) {
    return fromVoter;
  }

  const fromChat = extractWasenderSenderPhone(chatKey);
  if (fromChat) return fromChat;

  return fromVoter.length >= 7 ? fromVoter : null;
};

type PollResultOption = { name?: string; voters?: string[] };

const parsePollResultArrayForPhone = (
  pollResult: PollResultOption[],
  targetPhone: string,
  chatKey?: WasenderMessageKey & { id?: string },
  pollKeyId?: string
): { accepted: boolean; pollKeyId?: string } | null => {
  for (const option of pollResult) {
    const voters = option.voters ?? [];
    if (!option.name || voters.length === 0) {
      continue;
    }

    const decision = parsePollOptionResponse(option.name);
    if (decision === null) {
      continue;
    }

    for (const voterJid of voters) {
      const phone = extractVoterPhone(voterJid, chatKey);
      if (!phone || !phonesMatch(targetPhone, phone)) {
        continue;
      }
      return { accepted: decision, pollKeyId };
    }
  }

  return null;
};

const findNestedPollResult = (payload: unknown, depth = 0): PollResultOption[] | null => {
  if (!payload || typeof payload !== 'object' || depth > 8) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  for (const key of ['pollResult', 'pollResults', 'poll_result']) {
    const value = record[key];
    if (Array.isArray(value) && value.length > 0) {
      return value as PollResultOption[];
    }
  }

  for (const value of Object.values(record)) {
    if (!value || typeof value !== 'object') continue;
    const nested = findNestedPollResult(value, depth + 1);
    if (nested) return nested;
  }

  return null;
};

const findNestedMessageKey = (
  payload: unknown,
  depth = 0
): (WasenderMessageKey & { id?: string }) | undefined => {
  if (!payload || typeof payload !== 'object' || depth > 8) {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  if (record.key && typeof record.key === 'object') {
    return record.key as WasenderMessageKey & { id?: string };
  }

  for (const value of Object.values(record)) {
    if (!value || typeof value !== 'object') continue;
    const nested = findNestedMessageKey(value, depth + 1);
    if (nested) return nested;
  }

  return undefined;
};

/** Fetch poll vote state from Wasender when webhooks are not delivered. */
export const fetchWasenderMessageInfo = async (msgId: string): Promise<unknown> => {
  if (!env.WASENDER_API_KEY) {
    throw new Error('WASENDER_API_KEY is not configured');
  }

  const baseUrl = env.WASENDER_API_BASE_URL.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/messages/${encodeURIComponent(msgId)}/info`, {
    headers: {
      Authorization: `Bearer ${env.WASENDER_API_KEY}`,
      Accept: 'application/json',
    },
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Wasender message info (${response.status}): ${responseText}`);
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
};

export const parsePollVoteFromMessageInfo = (
  payload: unknown,
  targetPhone: string
): { accepted: boolean; pollKeyId?: string } | null => {
  const pollResult = findNestedPollResult(payload);
  if (!pollResult?.length) {
    return null;
  }

  const chatKey = findNestedMessageKey(payload);
  const pollKeyId = chatKey?.id ? String(chatKey.id) : undefined;

  return parsePollResultArrayForPhone(pollResult, targetPhone, chatKey, pollKeyId);
};

export const parseWasenderPollWebhookResponse = (
  payload: unknown
): { phone: string; accepted: boolean; msgId?: string; pollKeyId?: string } | null => {
  const body = payload as {
    event?: string;
    data?: {
      key?: WasenderMessageKey & { id?: string };
      pollResult?: Array<{ name?: string; voters?: string[] }>;
      pollResults?: Array<{ name?: string; voters?: string[] }>;
    };
  };

  const pollResult = body.data?.pollResult ?? body.data?.pollResults;
  if (!pollResult?.length) {
    return null;
  }

  const pollKeyId = body.data?.key?.id ? String(body.data.key.id) : undefined;
  const chatPhone = extractWasenderSenderPhone(body.data?.key);

  let latest: { phone: string; accepted: boolean; msgId?: string; pollKeyId?: string } | null =
    null;

  for (const option of pollResult) {
    const voters = option.voters ?? [];
    if (!option.name || voters.length === 0) {
      continue;
    }

    const decision = parsePollOptionResponse(option.name);
    if (decision === null) {
      continue;
    }

    for (const voterJid of voters) {
      const phone = extractVoterPhone(voterJid, body.data?.key) ?? chatPhone;
      if (!phone) {
        continue;
      }
      latest = {
        phone,
        accepted: decision,
        msgId: pollKeyId,
        pollKeyId,
      };
    }
  }

  return latest;
};

export const extractWasenderInboundMessage = (
  payload: unknown
): {
  key?: WasenderMessageKey;
  messageBody?: string;
  buttonId?: string;
  selectedButtonId?: string;
  pollOption?: string;
  pollCreationKeyId?: string;
} | null => {
  const body = payload as {
    event?: string;
    data?: {
      messages?: unknown;
      message?: unknown;
    };
  };

  let messages = body.data?.messages ?? body.data?.message;
  if (Array.isArray(messages)) {
    messages = messages[0];
  }

  if (!messages || typeof messages !== 'object') {
    return null;
  }

  const record = messages as {
    key?: WasenderMessageKey;
    messageBody?: string;
    buttonId?: string;
    selectedButtonId?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      pollUpdateMessage?: {
        vote?: { selectedOptions?: string[] };
        pollCreationMessageKey?: { id?: string };
      };
    };
  };

  if (record.key?.fromMe) {
    return null;
  }

  const pollSelected = record.message?.pollUpdateMessage?.vote?.selectedOptions?.[0];
  const pollCreationKeyId = record.message?.pollUpdateMessage?.pollCreationMessageKey?.id
    ? String(record.message.pollUpdateMessage.pollCreationMessageKey.id)
    : undefined;

  const messageBody =
    record.messageBody?.trim() ||
    record.message?.conversation?.trim() ||
    record.message?.extendedTextMessage?.text?.trim() ||
    '';

  if (!messageBody && !record.buttonId && !record.selectedButtonId && !pollSelected) {
    return null;
  }

  return {
    key: record.key,
    messageBody: messageBody || undefined,
    buttonId: record.buttonId,
    selectedButtonId: record.selectedButtonId,
    pollOption: pollSelected?.trim() || undefined,
    pollCreationKeyId,
  };
};

export const extractWasenderSenderIdentifiers = (
  key?: WasenderMessageKey
): { phoneDigits?: string; jid?: string } => {
  const phoneDigits = extractWasenderSenderPhone(key) ?? undefined;
  const jid =
    key?.remoteJid?.replace(/@.*/, '') ||
    key?.cleanedSenderPn ||
    key?.cleanedParticipantPn ||
    phoneDigits;

  return { phoneDigits, jid: jid ? phoneDigitsOnly(jid) || jid : undefined };
};

export const parseWasenderWebhookResponse = (
  payload: unknown
): { token: string; accepted: boolean } | { phone: string; accepted: boolean } | { jid: string; accepted: boolean } | null => {
  const body = payload as { event?: string };
  const event = String(body.event || '').toLowerCase();

  if (event.includes('status') || event.includes('receipt') || event.includes('ack')) {
    return null;
  }

  const message = extractWasenderInboundMessage(payload);
  if (!message) {
    return null;
  }

  const { phoneDigits, jid } = extractWasenderSenderIdentifiers(message.key);

  const buttonRaw = message.buttonId || message.selectedButtonId;
  if (buttonRaw) {
    const parsed = parseWasenderButtonId(buttonRaw);
    if (parsed) {
      if ('token' in parsed) {
        return { token: parsed.token, accepted: parsed.accepted };
      }
      if (phoneDigits) {
        return { phone: phoneDigits, accepted: parsed.accepted };
      }
      if (jid) {
        return { jid, accepted: parsed.accepted };
      }
    }
  }

  const text = message.messageBody?.trim();
  if (!text) return null;

  const tokenKeyword = parseKeywordWithToken(text);
  if (tokenKeyword) {
    return tokenKeyword;
  }

  const refOnly = text.match(/\bref[:\s#-]*([a-f0-9]{16})\b/i);
  if (refOnly) {
    const keyword = parseKeywordConfirmCancel(text);
    if (keyword !== null) {
      return { token: refOnly[1].toLowerCase(), accepted: keyword };
    }
  }

  const keyword = parseKeywordConfirmCancel(text);
  if (keyword !== null) {
    if (phoneDigits) {
      return { phone: phoneDigits, accepted: keyword };
    }
    if (jid) {
      return { jid, accepted: keyword };
    }
    return { phone: '', accepted: keyword };
  }

  const tokenParsed = parseInboundResponse(text);
  if (tokenParsed) {
    return tokenParsed;
  }

  const buttonLabel = parseButtonLabelResponse(text);
  if (buttonLabel !== null) {
    if (phoneDigits) {
      return { phone: phoneDigits, accepted: buttonLabel };
    }
    if (jid) {
      return { jid, accepted: buttonLabel };
    }
  }

  const simple = parseSimpleYesNoResponse(text);
  if (simple !== null) {
    if (phoneDigits) {
      return { phone: phoneDigits, accepted: simple };
    }
    if (jid) {
      return { jid, accepted: simple };
    }
  }

  return null;
};

export const extractPhoneFromTwilioWebhook = (from: string): string =>
  phoneDigitsOnly(from.replace(/^whatsapp:/i, ''));
