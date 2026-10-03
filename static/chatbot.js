(() => {
  'use strict';

  const STORE_KEY = 'jarvis-portfolio-chat-v1';
  const MAX_HISTORY = 12;
  const elements = {
    toggle: document.getElementById('assistantToggle'),
    panel: document.getElementById('assistantPanel'),
    close: document.getElementById('assistantClose'),
    clear: document.getElementById('assistantClear'),
    messages: document.getElementById('assistantMessages'),
    form: document.getElementById('assistantForm'),
    input: document.getElementById('assistantInput'),
    count: document.getElementById('assistantWords'),
    send: document.getElementById('assistantSend')
  };
  // Secciones del documento y aliases naturales que usan las intenciones de navegación.
  const sections = [
    { id: 'inicio', label: 'Inicio', aliases: ['inicio', 'portada', 'pagina principal'] },
    { id: 'sobre-mi', label: 'Sobre mí', aliases: ['sobre mi', 'informacion personal', 'perfil', 'experiencia', 'formacion'] },
    { id: 'servicios', label: 'Servicios y herramientas', aliases: ['servicio', 'servicios', 'herramientas', 'tecnologia', 'tecnologias', 'stack'] },
    { id: 'paquetes', label: 'Paquetes y precios', aliases: ['paquete', 'paquetes', 'precio', 'precios', 'tarifa', 'tarifas', 'costo', 'costos'] },
    { id: 'proyectos', label: 'Proyectos', aliases: ['proyecto', 'proyectos', 'trabajo', 'trabajos', 'portafolio', 'desarrollado'] },
    { id: 'contacto', label: 'Contacto', aliases: ['contacto', 'contactar', 'correo', 'email', 'whatsapp'] }
  ].filter(section => document.getElementById(section.id));

  // Las respuestas se construyen desde las tarjetas y textos que ya muestra la página.
  function pagePackages() {
    return [...document.querySelectorAll('#paquetes .plan')].map(card => ({
      name: card.querySelector('.plan-name')?.textContent.trim() || '',
      price: card.querySelector('.plan-price')?.textContent.replace(/\s+/g, ' ').trim() || '',
      description: card.querySelector('.plan-desc')?.textContent.trim() || '',
      features: [...card.querySelectorAll('.plan-features li')].map(item => item.textContent.trim())
    })).filter(item => item.name && item.price);
  }

  function pageTechnologies() {
    const logos = [...document.querySelectorAll('#servicios .stack-card img[alt]')]
      .map(image => image.alt.trim()).filter(Boolean);
    const projectStack = [...document.querySelectorAll('#proyectos .chip')]
      .map(chip => chip.textContent.trim()).find(label => /python|fastapi/i.test(label));
    const names = [...new Set([...logos, ...(projectStack ? projectStack.split(/\s*[·+]\s*/) : [])])];
    return names.join(', ');
  }

  function pageProject() {
    const card = document.querySelector('#proyectos .project-card');
    return card ? `${card.querySelector('h3')?.textContent.trim() || 'Proyecto destacado'}: ${card.querySelector('.project-body p')?.textContent.trim() || ''}` : '';
  }

  function pageAbout() {
    const about = document.querySelector('#sobre-mi');
    return about ? [...about.querySelectorAll('.about-grid > div:first-child p')].map(p => p.textContent.trim()).join(' ') : '';
  }

  function pageContact() {
    const entries = [...document.querySelectorAll('#contactGrid .contact-item')].map(item => item.innerText.replace(/\s+/g, ' ').trim());
    return entries.length ? entries.join(' · ') : 'Revisa los botones de WhatsApp y correo de la sección de contacto.';
  }

  const intents = [
    {
      name: 'time', match: /\b(hora|que hora|reloj)\b/,
      respond: () => ({ text: `La hora local de tu navegador es ${new Intl.DateTimeFormat('es-CO', { hour: '2-digit', 'minute': '2-digit', timeZoneName: 'short' }).format(new Date())}.` })
    },
    {
      name: 'date', match: /\b(fecha|que dia|hoy|calendario)\b/,
      respond: () => ({ text: `Hoy es ${new Intl.DateTimeFormat('es-CO', { dateStyle: 'full' }).format(new Date())}, según la fecha de tu dispositivo.` })
    },
    {
      name: 'packages',
      match: /\b(paquete|paquetes|precio|precios|tarifa|tarifas|cuanto|cuesta|cuestan|costos?|inversion|incluye|incluyen|incluido|trabajar contigo|contratar|valor)\b/,
      respond: text => {
        const packages = pagePackages();
        const chosen = packages.find(item => {
          const normalizedQuestion = normalize(text);
          const normalizedName = normalize(item.name);
          const shortName = normalizedName.replace(/^paquete\s+/, '');
          return normalizedQuestion.includes(normalizedName) || normalizedQuestion.includes(shortName);
        });
        if (/incluye|incluyen|incluido|que trae/.test(text)) {
          const selected = chosen ? [chosen] : packages;
          const details = selected.map(item => `${item.name} — ${item.price}. ${item.description} Incluye: ${item.features.join('; ')}.`).join(' ');
          return { text: details || 'No encuentro el detalle de los paquetes en la página.', action: 'paquetes' };
        }
        if (!packages.length) return { text: 'No encuentro tarjetas de paquetes en el contenido actual de la página.', action: 'paquetes' };
        const details = packages.map(item => `${item.name}: ${item.price}`).join(' · ');
        const starts = /cuanto cuesta trabajar contigo|cuanto cuesta|cuestan|precio|precios|tarifa|cost|valor|inversion/.test(text)
          ? ` Los precios publicados son ${details}.`
          : ` Estos son los paquetes publicados: ${details}.`;
        const descriptions = /servicio|incluye|incluyen|que ofrecen|que tienes/.test(text)
          ? ` ${packages.map(item => `${item.name}: ${item.description}`).join(' ')}` : '';
        return { text: `${starts}${descriptions}`, action: 'paquetes' };
      }
    },
    {
      name: 'services',
      match: /\b(servicio|servicios|ofreces|ofrece|haces|sabes hacer|puedes desarrollar|desarrollo web|sistemas a medida|automatizacion)\b/,
      respond: text => {
        const packages = pagePackages();
        const offerings = packages.map(item => item.description).join(' ');
        const navigatingToServices = /\b(navega|navegar|ir a|ve a|llevame|muestrame|ver seccion)\b/.test(text);
        return { text: offerings ? `La página ofrece estas soluciones: ${offerings} Puedes consultar qué incluye cada paquete y sus precios.` : 'La página presenta servicios de desarrollo web, sistemas a medida y automatización.', action: navigatingToServices ? 'servicios' : 'paquetes' };
      }
    },
    {
      name: 'fastapi', match: /\b(fastapi|fast api)\b/,
      respond: () => ({ text: 'FastAPI es el framework de Python que sirve este portafolio en el servidor web. Aquí entrega el HTML en / y los recursos del asistente en /static; la conversación de JARVIS se procesa en tu navegador.' })
    },
    {
      name: 'projects',
      match: /\b(proyecto|proyectos|lo que has desarrollado|que has desarrollado|trabajo reciente|trabajos|construido|creado)\b/,
      respond: () => ({ text: pageProject() || 'No encuentro proyectos descritos en el contenido actual.', action: 'proyectos' })
    },
    {
      name: 'technologies',
      match: /\b(tecnologia|tecnologias|stack|lenguajes|frameworks?|con que (?:se|esta) hecho|que usa|que herramientas|python|aws|render|oracle apex)\b/,
      respond: () => {
        const names = pageTechnologies();
        return { text: names ? `En la sección de herramientas y el proyecto se mencionan: ${names}.` : 'Consulta la sección de herramientas para ver las tecnologías del portafolio.', action: 'servicios' };
      }
    },
    {
      name: 'contact',
      match: /\b(contacto|contactar|como puedo contactarte|como te contacto|correo|email|whatsapp|escribirle|hablar con juan)\b/,
      respond: () => ({ text: `Estas son las opciones publicadas: ${pageContact()}.`, action: 'contacto' })
    },
    {
      name: 'about',
      match: /\b(quien eres|quien es juan|presentacion|sobre juan|sobre mi|cuentame (?:de ti|sobre juan|de juan)|hablame de juan|informacion personal|informacion profesional|experiencia profesional|formacion profesional|formacion|estudios|perfil)\b/,
      respond: () => ({ text: pageAbout() || 'La página no contiene información personal en este momento.', action: 'sobre-mi' })
    },
    {
      name: 'home',
      match: /\b(inicio|portada|pagina principal|propuesta)\b/,
      respond: () => {
        const hero = document.querySelector('#inicio');
        const title = hero?.querySelector('h1')?.textContent.replace(/\s+/g, ' ').trim();
        const lead = hero?.querySelector('.lead')?.textContent.trim();
        return { text: [title, lead].filter(Boolean).join(' '), action: 'inicio' };
      }
    },
    {
      name: 'navigation',
      match: /\b(navega|navegar|ir a|ll[eé]vame|mu[eé]strame|muestrame|explorar|ver seccion|ir al inicio|ir a inicio)\b/,
      respond: text => {
        const section = sections.find(item => item.aliases.some(alias => text.includes(alias)));
        return section
          ? { text: `Claro, te llevo a ${section.label}.`, action: section.id }
          : { text: `Puedo llevarte a ${sections.map(item => item.label).join(', ')}. ¿Cuál quieres ver?` };
      }
    },
    {
      name: 'help',
      match: /\b(ayuda|comandos|que puedes hacer|como funciona|capacidades)\b/,
      respond: () => ({ text: `Puedo consultar la información publicada de ${sections.map(item => item.label).join(', ')}, además de la fecha y la hora. Usa /paquetes, /servicios, /proyectos, /tecnologias, /sobre-mi, /contacto, /fecha, /hora o /ayuda.` })
    },
    {
      name: 'thanks', match: /\b(gracias|te agradezco|muy amable)\b/,
      respond: () => ({ text: '¡Con gusto! Si quieres, seguimos explorando el portafolio.' })
    },
    {
      name: 'bye', match: /\b(chao|adios|hasta luego|nos vemos)\b/,
      respond: () => ({ text: 'Hasta luego. Aquí estaré si quieres consultar algo más del portafolio.' })
    },
    {
      name: 'greeting', match: /^(hola|buenos dias|buenas tardes|buenas noches|hey|buenas)\b/,
      respond: () => ({ text: '¡Hola! ¿Qué te gustaría conocer del portafolio?' })
    }
  ];
  const commands = {
    '/ayuda': 'help', '/hora': 'time', '/fecha': 'date', '/tecnologias': 'technologies',
    '/tecnologías': 'technologies', '/proyecto': 'projects', '/proyectos': 'projects',
    '/paquete': 'packages', '/paquetes': 'packages', '/precios': 'packages',
    '/servicios': 'services', '/contacto': 'contact', '/sobre-mi': 'about', '/inicio': 'navigation'
  };
  const state = { history: [], lastIntent: null, typing: false };

  const normalize = value => value.toLocaleLowerCase('es-CO').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const wordCount = value => value.trim() ? value.trim().split(/\s+/).length : 0;
  const timeLabel = () => new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(new Date());

  function saveHistory() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state.history.slice(-MAX_HISTORY))); } catch (_) { /* Almacenamiento opcional. */ }
  }

  function renderMessage(role, text, showCopy = false) {
    const wrapper = document.createElement('article');
    wrapper.className = `assistant-message ${role === 'user' ? 'is-user' : 'is-assistant'}`;
    const bubble = document.createElement('div');
    bubble.className = 'assistant-bubble';
    bubble.textContent = text;
    wrapper.append(bubble);
    const meta = document.createElement('div');
    meta.className = 'assistant-meta';
    meta.append(document.createTextNode(`${role === 'user' ? 'Tú' : 'JARVIS'} · ${timeLabel()}`));
    if (role === 'assistant' && showCopy) {
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'assistant-copy';
      copy.setAttribute('aria-label', 'Copiar respuesta');
      copy.title = 'Copiar respuesta';
      copy.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>';
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(text); copy.title = 'Copiado'; }
        catch (_) { copy.title = 'No se pudo copiar'; }
      });
      meta.append(copy);
    }
    wrapper.append(meta);
    elements.messages.append(wrapper);
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  function suggestions() {
    const area = document.createElement('div');
    area.className = 'assistant-suggestions';
    [
      ['Ver paquetes y precios', 'Muéstrame los paquetes y precios'],
      ['Ver servicios', '¿Qué servicios tienes?'],
      ['Ver proyectos', 'Quiero ver los proyectos'],
      ['Ver tecnologías', '¿Qué tecnologías utiliza esta página?'],
      ['Sobre mí', 'Cuéntame sobre Juan'],
      ['Contacto', '¿Cómo puedo contactarte?']
    ].forEach(([label, prompt]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => submitMessage(prompt));
      area.append(button);
    });
    elements.messages.append(area);
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  function showWelcome(withSuggestions = true) {
    renderMessage('assistant', 'Hola 👋 Soy JARVIS. Puedo ayudarte a explorar esta página, conocer sus tecnologías, consultar utilidades y navegar por sus secciones.');
    if (withSuggestions) suggestions();
  }

  function classify(raw) {
    const text = normalize(raw);
    const command = text.match(/^\/(\S+)/)?.[0];
    const commandIntent = command ? commands[command] : null;
    if (commandIntent) return intents.find(intent => intent.name === commandIntent);
    return intents.find(intent => intent.match.test(text)) || null;
  }

  function makeReply(raw) {
    const intent = classify(raw);
    if (intent) {
      const answer = intent.respond(normalize(raw));
      state.lastIntent = intent.name;
      return answer;
    }
    const text = normalize(raw);
    if (state.lastIntent === 'technologies' && /\b(y|pero|para que|por que|como)\b/.test(text)) {
      state.lastIntent = 'fastapi';
      return { text: 'En este sitio, FastAPI recibe las visitas del navegador, responde con el HTML del portafolio y entrega los archivos estáticos como el código del asistente. La lógica de la conversación sigue siendo local en el navegador.' };
    }
    if (state.lastIntent === 'projects' && /\b(mas|amplia|detalles|donde|como)\b/.test(text)) {
      return { text: 'La descripción del portafolio dice que la plataforma de Fundación Marielita reúne gestión y publicación de contenidos, servicios y comunicación con la comunidad.' };
    }
    return { text: 'Puedo orientarte sobre el contenido que aparece en esta página. Pregúntame por las tecnologías, el proyecto, los paquetes o el contacto, o escribe /ayuda para ver opciones.' };
  }

  function showTyping() {
    const typing = document.createElement('div');
    typing.className = 'assistant-message is-assistant';
    typing.id = 'assistantTyping';
    typing.setAttribute('aria-label', 'JARVIS está escribiendo');
    const bubble = document.createElement('div');
    bubble.className = 'assistant-bubble assistant-typing';
    bubble.innerHTML = '<i></i><i></i><i></i>';
    typing.append(bubble);
    elements.messages.append(typing);
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  function navigate(sectionId) {
    if (!sectionId) return;
    window.setTimeout(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    elements.panel.classList.remove('is-open');
    elements.panel.setAttribute('aria-hidden', 'true');
    elements.toggle.setAttribute('aria-expanded', 'false');
  }

  function submitMessage(value = elements.input.value) {
    const message = value.trim();
    if (!message || state.typing) return;
    elements.input.value = '';
    elements.count.textContent = '0 palabras';
    elements.input.style.height = 'auto';
    elements.send.disabled = true;
    renderMessage('user', message);
    state.history.push({ role: 'user', text: message });
    state.typing = true;
    showTyping();
    window.setTimeout(() => {
      document.getElementById('assistantTyping')?.remove();
      const reply = makeReply(message);
      renderMessage('assistant', reply.text, true);
      state.history.push({ role: 'assistant', text: reply.text });
      state.history = state.history.slice(-MAX_HISTORY);
      saveHistory();
      state.typing = false;
      elements.send.disabled = false;
      if (reply.action) navigate(reply.action);
    }, 480 + Math.min(message.length * 5, 650));
  }

  function restoreHistory() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || '[]');
      if (!Array.isArray(saved)) return false;
      state.history = saved.filter(item => item && ['user', 'assistant'].includes(item.role) && typeof item.text === 'string').slice(-MAX_HISTORY);
      state.history.forEach(item => renderMessage(item.role, item.text));
      return state.history.length > 0;
    } catch (_) { return false; }
  }

  elements.toggle.addEventListener('click', () => {
    const open = !elements.panel.classList.contains('is-open');
    elements.panel.classList.toggle('is-open', open);
    elements.panel.setAttribute('aria-hidden', String(!open));
    elements.toggle.setAttribute('aria-expanded', String(open));
    if (open) elements.input.focus();
  });
  elements.close.addEventListener('click', () => {
    elements.panel.classList.remove('is-open');
    elements.panel.setAttribute('aria-hidden', 'true');
    elements.toggle.setAttribute('aria-expanded', 'false');
    elements.toggle.focus();
  });
  elements.clear.addEventListener('click', () => {
    state.history = [];
    state.lastIntent = null;
    try { sessionStorage.removeItem(STORE_KEY); } catch (_) { /* Almacenamiento opcional. */ }
    elements.messages.replaceChildren();
    showWelcome();
  });
  elements.form.addEventListener('submit', event => { event.preventDefault(); submitMessage(); });
  elements.input.addEventListener('input', () => {
    const count = wordCount(elements.input.value);
    elements.count.textContent = `${count} ${count === 1 ? 'palabra' : 'palabras'}`;
    elements.input.style.height = 'auto';
    elements.input.style.height = `${Math.min(elements.input.scrollHeight, 100)}px`;
  });
  elements.input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); elements.form.requestSubmit(); }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && elements.panel.classList.contains('is-open')) elements.close.click();
  });

  // Si el servidor remoto de Render deja de ofrecer el logo, se conserva una tarjeta visual limpia.
  document.querySelectorAll('.stack-card img[src^="https://cdn.pulse2.com/"]').forEach(image => {
    image.addEventListener('error', () => {
      image.closest('.stack-card')?.classList.add('has-fallback');
      image.hidden = true;
      const fallback = document.createElement('span');
      fallback.className = 'asset-fallback';
      fallback.textContent = image.alt || 'Render';
      image.after(fallback);
    }, { once: true });
  });

  if (!restoreHistory()) showWelcome();
})();
