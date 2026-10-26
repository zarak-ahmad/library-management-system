export type LinkActionOutcome =
  | 'confirmed'
  | 'cancelled'
  | 'already_confirmed'
  | 'already_cancelled'
  | 'expired'
  | 'invalid';

export interface LinkActionPageData {
  outcome: LinkActionOutcome;
  title: string;
  message: string;
  studentName: string;
  bookTitle: string;
  bookAuthor?: string;
  bookIsbn?: string;
  bookId?: string;
  shelfLocation?: string;
  requestId?: string;
  requestStatus?: string;
  coverImageUrl?: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const outcomeAccent: Record<LinkActionOutcome, string> = {
  confirmed: '#22c55e',
  cancelled: '#f87171',
  already_confirmed: '#38bdf8',
  already_cancelled: '#fbbf24',
  expired: '#94a3b8',
  invalid: '#f87171',
};

export const renderRequestConfirmationResult = (data: LinkActionPageData): string => {
  const accent = outcomeAccent[data.outcome];

  const detail = (label: string, value?: string) =>
    value
      ? `<div class="detail"><span class="detail-label">${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(data.title)}</title>
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
      max-width: 640px;
      margin: 0 auto;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 20px 50px rgba(0,0,0,.35);
    }
    .badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .04em;
      background: ${accent}22;
      color: ${accent};
      border: 1px solid ${accent}55;
      margin-bottom: 12px;
    }
    h1 { margin: 0 0 12px; font-size: 1.6rem; }
    .message {
      color: #cbd5e1;
      line-height: 1.7;
      margin: 0 0 20px;
      font-size: 1.05rem;
    }
    .layout {
      display: grid;
      gap: 20px;
      margin-top: 20px;
    }
    @media (min-width: 640px) {
      .layout { grid-template-columns: 120px 1fr; align-items: start; }
    }
    .cover {
      width: 100%;
      max-width: 120px;
      border-radius: 12px;
      border: 1px solid #334155;
      object-fit: cover;
      aspect-ratio: 3/4;
      background: #0f172a;
    }
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
    .footer {
      margin-top: 24px;
      color: #64748b;
      font-size: 0.85rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">${escapeHtml(data.outcome.replace(/_/g, ' '))}</span>
    <h1>${escapeHtml(data.title)}</h1>
    <p class="message">${escapeHtml(data.message)}</p>
    <div class="layout">
      ${
        data.coverImageUrl
          ? `<img class="cover" src="${escapeHtml(data.coverImageUrl)}" alt="${escapeHtml(data.bookTitle)}" />`
          : '<div></div>'
      }
      <div class="details">
        ${detail('Student', data.studentName)}
        ${detail('Book', data.bookTitle)}
        ${detail('Author', data.bookAuthor)}
        ${detail('Book ID', data.bookId)}
        ${detail('ISBN', data.bookIsbn)}
        ${detail('Shelf', data.shelfLocation)}
        ${detail('Request ID', data.requestId)}
        ${detail('Status', data.requestStatus?.replace(/_/g, ' '))}
      </div>
    </div>
    <p class="footer">You can close this page and return to WhatsApp.</p>
  </div>
</body>
</html>`;
};
