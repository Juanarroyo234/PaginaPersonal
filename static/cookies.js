(() => {
  'use strict';

  const elements = {
    banner: document.getElementById('cookieBanner'),
    accept: document.getElementById('cookieAccept'),
    configure: document.getElementById('cookieConfigure'),
    footerSettings: document.getElementById('footerCookieSettings'),
    backdrop: document.getElementById('cookieBackdrop'),
    dialog: document.getElementById('cookieDialog'),
    close: document.getElementById('cookieDialogClose'),
    save: document.getElementById('cookieSave'),
    status: document.getElementById('cookieStatus'),
    preferences: document.getElementById('cookiePreferences'),
    analytics: document.getElementById('cookieAnalytics'),
    marketing: document.getElementById('cookieMarketing')
  };
  const categories = ['preferences', 'analytics', 'marketing'];
  let currentConsent = null;
  let previousFocus = null;
  let previousBodyOverflow = '';

  function showBanner() {
    elements.banner.classList.add('is-visible');
    elements.banner.setAttribute('aria-hidden', 'false');
  }

  function hideBanner() {
    elements.banner.classList.remove('is-visible');
    elements.banner.setAttribute('aria-hidden', 'true');
  }

  function fillOptions(consent = {}) {
    categories.forEach(category => {
      elements[category].checked = Boolean(consent[category]);
    });
  }

  function openSettings() {
    previousFocus = document.activeElement;
    previousBodyOverflow = document.body.style.overflow;
    fillOptions(currentConsent || {});
    elements.status.textContent = '';
    elements.backdrop.classList.add('is-open');
    elements.backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => elements.close.focus(), 30);
  }

  function closeSettings() {
    if (!elements.backdrop.classList.contains('is-open')) return;
    elements.backdrop.classList.remove('is-open');
    elements.backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = previousBodyOverflow;
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  }

  async function saveConsent(consent) {
    elements.save.disabled = true;
    elements.accept.disabled = true;
    elements.status.textContent = 'Guardando tu elección…';
    try {
      const response = await fetch('/api/cookie-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(consent)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'No se pudo guardar tu elección.');
      currentConsent = { necessary: true, ...consent, updated_at: result.updated_at };
      hideBanner();
      closeSettings();
    } catch (error) {
      elements.status.textContent = error.message || 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.';
    } finally {
      elements.save.disabled = false;
      elements.accept.disabled = false;
    }
  }

  elements.accept.addEventListener('click', () => {
    saveConsent({ preferences: true, analytics: true, marketing: true });
  });
  elements.configure.addEventListener('click', openSettings);
  elements.footerSettings.addEventListener('click', openSettings);
  elements.close.addEventListener('click', closeSettings);
  elements.save.addEventListener('click', () => {
    saveConsent(Object.fromEntries(categories.map(category => [category, elements[category].checked])));
  });
  elements.backdrop.addEventListener('click', event => {
    if (event.target === elements.backdrop) closeSettings();
  });
  document.addEventListener('keydown', event => {
    if (!elements.backdrop.classList.contains('is-open')) return;
    if (event.key === 'Escape') closeSettings();
    if (event.key === 'Tab') {
      const focusable = [...elements.dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  fetch('/api/cookie-consent', { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' })
    .then(response => {
      if (!response.ok) throw new Error('No se pudo consultar la elección.');
      return response.json();
    })
    .then(result => {
      currentConsent = result.consent;
      if (!currentConsent) showBanner();
    })
    .catch(() => showBanner());
})();
