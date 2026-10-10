(() => {
  'use strict';

  const elements = {
    backdrop: document.getElementById('leadBackdrop'),
    dialog: document.getElementById('leadDialog'),
    close: document.getElementById('leadClose'),
    form: document.getElementById('leadForm'),
    name: document.getElementById('leadName'),
    phone: document.getElementById('leadPhone'),
    submit: document.getElementById('leadSubmit'),
    status: document.getElementById('leadStatus')
  };
  const SESSION_KEY = 'juan-lead-popup-dismissed-v1';
  let previousFocus = null;

  function hasBeenDismissed() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; }
    catch (_) { return false; }
  }

  function rememberDismissal() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); }
    catch (_) { /* La invitación sigue funcionando si el almacenamiento está deshabilitado. */ }
  }

  function openPopup() {
    if (elements.backdrop.classList.contains('is-open')) return;
    previousFocus = document.activeElement;
    elements.backdrop.classList.add('is-open');
    elements.backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => elements.name.focus(), 80);
  }

  function closePopup() {
    if (!elements.backdrop.classList.contains('is-open')) return;
    elements.backdrop.classList.remove('is-open');
    elements.backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    rememberDismissal();
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  }

  elements.close.addEventListener('click', closePopup);
  elements.backdrop.addEventListener('click', event => {
    if (event.target === elements.backdrop) closePopup();
  });
  document.addEventListener('keydown', event => {
    if (!elements.backdrop.classList.contains('is-open')) return;
    if (event.key === 'Escape') closePopup();
    if (event.key === 'Tab') {
      const focusable = [...elements.dialog.querySelectorAll('input,button:not(:disabled)')];
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

  elements.form.addEventListener('submit', async event => {
    event.preventDefault();
    const fullName = elements.name.value.trim().replace(/\s+/g, ' ');
    const phone = elements.phone.value.trim();
    const phoneDigits = phone.replace(/\D/g, '');
    const validName = fullName.length >= 2 && fullName.length <= 100 && /^[\p{L}]+(?:[ '\u2019.-][\p{L}]+)*$/u.test(fullName);

    elements.status.classList.remove('is-error');
    if (!validName) {
      elements.status.textContent = 'Escribe tu nombre completo para continuar.';
      elements.name.focus();
      return;
    }
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      elements.status.textContent = 'Revisa el número de teléfono e inténtalo de nuevo.';
      elements.phone.focus();
      return;
    }

    elements.submit.disabled = true;
    elements.submit.setAttribute('aria-busy', 'true');
    elements.status.textContent = 'Enviando…';
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ full_name: fullName, phone })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'No se pudo enviar. Inténtalo de nuevo.');
      elements.form.reset();
      elements.status.textContent = result.duplicate
        ? '¡Gracias! Ya recibimos tu solicitud y pronto nos pondremos en contacto.'
        : '¡Listo! Recibimos tus datos. Pronto nos pondremos en contacto contigo.';
      rememberDismissal();
      window.setTimeout(closePopup, 3200);
    } catch (error) {
      elements.status.classList.add('is-error');
      elements.status.textContent = error.message || 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.';
    } finally {
      elements.submit.disabled = false;
      elements.submit.removeAttribute('aria-busy');
    }
  });

  if (!hasBeenDismissed()) window.setTimeout(openPopup, 9000);
})();
