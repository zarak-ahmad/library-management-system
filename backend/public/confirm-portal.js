(function () {
  const token = document.body.dataset.token;
  const apiBase = '/api/v1/request-confirmations/' + encodeURIComponent(token);

  const els = {
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    content: document.getElementById('content'),
    title: document.getElementById('title'),
    message: document.getElementById('message'),
    cover: document.getElementById('cover'),
    bookTitle: document.getElementById('book-title'),
    bookAuthor: document.getElementById('book-author'),
    details: document.getElementById('details'),
    description: document.getElementById('description-block'),
    descriptionText: document.getElementById('description-text'),
    actions: document.getElementById('actions'),
    status: document.getElementById('status'),
    confirmBtn: document.getElementById('confirm-btn'),
    cancelBtn: document.getElementById('cancel-btn'),
  };

  function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  function formatStatus(value) {
    return value ? String(value).replace(/_/g, ' ') : '—';
  }

  function assetUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return url.startsWith('/') ? url : '/' + url;
  }

  function addDetail(label, value) {
    if (value === undefined || value === null || value === '') return;
    const item = document.createElement('div');
    item.className = 'detail';
    item.innerHTML = '<span class="detail-label">' + label + '</span><span>' + value + '</span>';
    els.details.appendChild(item);
  }

  function showError(text) {
    els.loading.hidden = true;
    els.content.hidden = true;
    els.error.hidden = false;
    els.error.textContent = text;
  }

  function setBusy(busy) {
    els.confirmBtn.disabled = busy;
    els.cancelBtn.disabled = busy;
    els.status.textContent = busy ? 'Saving your choice...' : '';
  }

  async function respond(accepted) {
    setBusy(true);
    try {
      const res = await fetch(apiBase + '/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.message || 'Action failed');
      }
      await load();
      els.message.textContent = body.message || (accepted ? 'Confirmed successfully.' : 'Cancelled successfully.');
    } catch (err) {
      showError(err.message || 'Could not save your response.');
    } finally {
      setBusy(false);
    }
  }

  async function load() {
    try {
      const res = await fetch(apiBase);
      const body = await res.json();
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.message || 'This link is invalid or expired.');
      }

      const data = body.data;
      els.loading.hidden = true;
      els.error.hidden = true;
      els.content.hidden = false;

      els.title.textContent = data.title || 'Book Request Confirmation';
      els.message.textContent = data.message || '';

      if (data.book && data.book.coverImage && data.book.coverImage.url) {
        els.cover.src = assetUrl(data.book.coverImage.url);
        els.cover.alt = data.book.title || 'Book cover';
        els.cover.hidden = false;
      } else {
        els.cover.hidden = true;
      }

      els.bookTitle.textContent = (data.book && data.book.title) || 'Book';
      els.bookAuthor.textContent = (data.book && data.book.author) || '';

      els.details.innerHTML = '';
      addDetail('Request ID', data.request && data.request.requestId);
      addDetail('Status', formatStatus(data.request && data.request.status));
      addDetail('Requested', formatDate(data.request && data.request.requestDate));
      addDetail('Student', data.student && data.student.fullName);
      addDetail('Book ID', data.book && data.book.bookId);
      addDetail('ISBN', data.book && data.book.isbn);
      addDetail('Shelf', data.book && data.book.shelfLocation);
      addDetail('Expires', formatDate(data.expiresAt));

      if (data.book && data.book.description) {
        els.description.hidden = false;
        els.descriptionText.textContent = data.book.description;
      } else {
        els.description.hidden = true;
      }

      if (data.canRespond) {
        els.actions.hidden = false;
        els.status.textContent = '';
      } else {
        els.actions.hidden = true;
        els.status.textContent = 'This request can no longer be changed from this page.';
      }
    } catch (err) {
      showError(err.message || 'Failed to load confirmation details.');
    }
  }

  els.confirmBtn.addEventListener('click', function () {
    respond(true);
  });
  els.cancelBtn.addEventListener('click', function () {
    respond(false);
  });

  load();
})();
