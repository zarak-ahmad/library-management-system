const CONFIRM_ORDER_LINK_LABEL = 'Click here to confirm your order';
const CONFIRM_PICKUP_LINK_LABEL = 'Click here to confirm pickup';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export interface RequestConfirmationPortalPreview {
  previewTitle: string;
  previewDescription: string;
  previewImage?: string;
  canonicalUrl: string;
}

export const renderRequestConfirmationPortal = (
  token: string,
  preview?: RequestConfirmationPortalPreview
): string => {
  const previewTitle = escapeHtml(preview?.previewTitle || CONFIRM_ORDER_LINK_LABEL);
  const previewDescription = escapeHtml(
    preview?.previewDescription || 'Review your book request and choose Confirm or Cancel.'
  );
  const canonicalUrl = escapeHtml(preview?.canonicalUrl || '');
  const previewImage = preview?.previewImage ? escapeHtml(preview.previewImage) : '';

  const openGraphTags = preview
    ? `
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${previewTitle}" />
  <meta property="og:description" content="${previewDescription}" />
  <meta property="og:url" content="${canonicalUrl}" />
  ${previewImage ? `<meta property="og:image" content="${previewImage}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${previewTitle}" />
  <meta name="twitter:description" content="${previewDescription}" />
  ${previewImage ? `<meta name="twitter:image" content="${previewImage}" />` : ''}`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${previewTitle}</title>${openGraphTags}
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      max-width: 720px;
      margin: 0 auto;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 20px 50px rgba(0,0,0,.35);
    }
    h1 { margin: 0 0 8px; font-size: 1.5rem; }
    .subtitle { color: #94a3b8; margin: 0 0 20px; }
    .banner {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 20px;
      color: #cbd5e1;
    }
    .layout { display: grid; gap: 20px; }
    @media (min-width: 640px) {
      .layout { grid-template-columns: 140px 1fr; align-items: start; }
    }
    #cover {
      width: 100%;
      max-width: 140px;
      border-radius: 12px;
      border: 1px solid #334155;
      object-fit: cover;
      aspect-ratio: 3/4;
      background: #0f172a;
    }
    #book-title { margin: 0; font-size: 1.25rem; }
    #book-author { margin: 4px 0 16px; color: #94a3b8; }
    .details { display: grid; gap: 10px; }
    .detail {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border: 1px solid #334155;
      border-radius: 10px;
      background: #0f172a;
      font-size: 0.92rem;
    }
    .detail-label {
      color: #94a3b8;
      text-transform: uppercase;
      font-size: 0.72rem;
      letter-spacing: .04em;
    }
    #description-block {
      margin-top: 20px;
      padding: 14px;
      border: 1px solid #334155;
      border-radius: 12px;
      background: #0f172a;
    }
    #description-block h2 { margin: 0 0 8px; font-size: 1rem; }
    #description-text { margin: 0; color: #94a3b8; line-height: 1.6; white-space: pre-wrap; }
    .actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
      flex-wrap: wrap;
    }
    button {
      flex: 1;
      min-width: 120px;
      border: none;
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    button:disabled { opacity: .6; cursor: not-allowed; }
    #confirm-btn { background: #22c55e; color: #052e16; }
    #cancel-btn { background: transparent; color: #fca5a5; border: 1px solid #7f1d1d; }
    #loading, #error, #status { color: #94a3b8; text-align: center; padding: 24px 0; }
    #error { color: #fca5a5; }
  </style>
</head>
<body data-token="${token}">
  <div class="card">
    <h1 id="title">Book Request Confirmation</h1>
    <p class="subtitle">Review the details and choose Confirm or Cancel.</p>
    <div id="loading">Loading request details...</div>
    <div id="error" hidden></div>
    <div id="content" hidden>
      <div class="banner" id="message"></div>
      <div class="layout">
        <img id="cover" alt="Book cover" hidden />
        <div>
          <h2 id="book-title"></h2>
          <p id="book-author"></p>
          <div class="details" id="details"></div>
        </div>
      </div>
      <div id="description-block" hidden>
        <h2>About this book</h2>
        <p id="description-text"></p>
      </div>
      <div class="actions" id="actions" hidden>
        <button type="button" id="cancel-btn">Cancel</button>
        <button type="button" id="confirm-btn">Confirm</button>
      </div>
      <p id="status"></p>
    </div>
  </div>
  <script src="/confirm-portal.js"></script>
</body>
</html>`;
};
