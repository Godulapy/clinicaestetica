/* Gódula — comportamiento de la web. Sin dependencias ni base de datos.
   Las solicitudes se preparan en WhatsApp; el visitante debe enviarlas.
   No se consulta ni se expone Google Calendar. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const PHONE = '595987302505';
  const status = $('#status');
  const say = text => { status.textContent = text; };
  const selected = new Set();
  let currentSize = 'Pequeña';
  const zones = {
    Mini: ['Bozo (labio superior)', 'Entrecejo', 'Manos', 'Pies', 'Mentón', 'Dedos', 'Patilla'],
    Pequeña: ['Axilas', 'Cuello', 'Cavado', 'Tiro de cola', 'Línea alba', 'Rodillas'],
    Mediana: ['Medias piernas', 'Medios brazos', 'Abdomen', 'Pecho', 'Espalda media', 'Muslos', 'Glúteos'],
    Grande: ['Piernas completas', 'Brazos completos', 'Espalda completa', 'Tronco']
  };
  const combos = {
    Essential: 'Axilas + bozo + mentón. Entrecejo de regalo.',
    Bikini: 'Axilas + cavado + tiro de cola. Línea alba de regalo.',
    Body: 'Axilas + cavado + piernas completas. Bozo de regalo.'
  };
  // Evita solicitar dos veces una zona incluida en otra más amplia.
  const includes = {
    'Piernas completas': ['Medias piernas', 'Muslos', 'Rodillas'],
    'Brazos completos': ['Medios brazos'],
    'Espalda completa': ['Espalda media']
  };
  const customService = 'Paquete de depi personalizado';
  const service = $('#service');
  const customOption = $('#custom-option');
  function overlaps(a,b) { return includes[a]?.includes(b) || includes[b]?.includes(a); }
  function updateBookingSummary() {
    const target = $('#booking-selection');
    let text = '';
    if (service.value === customService && selected.size) text = 'Tu paquete: ' + [...selected].join(' + ');
    else if (service.value.startsWith('Combo ')) text = combos[service.value.slice(6)] || '';
    target.textContent = text;
    target.hidden = !text;
  }
  function updateSelected() {
    $('#zone-count').textContent = `· ${selected.size} ${selected.size === 1 ? 'zona' : 'zonas'}`;
    const holder = $('#selected-zones');
    holder.replaceChildren();
    if (!selected.size) {
      const empty = document.createElement('p'); empty.className = 'empty';
      empty.textContent = 'Elegí una o más zonas para comenzar.'; holder.append(empty);
    }
    selected.forEach(zone => {
      const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'chip';
      chip.textContent = zone + ' ×'; chip.setAttribute('aria-label', 'Quitar ' + zone);
      chip.addEventListener('click', () => {
        selected.delete(zone); renderZones(); updateSelected();
        $('#request-package').disabled ? $('[data-size][aria-pressed="true"]').focus() : $('#request-package').focus();
        say(zone + ' quitada del paquete.');
      }); holder.append(chip);
    });
    $('#request-package').disabled = !selected.size;
    $('#clear-zones').hidden = !selected.size;
    customOption.disabled = !selected.size;
    if (!selected.size && service.value === customService) service.value = 'Depilación láser';
    updateBookingSummary();
  }
  function renderZones() {
    const holder = $('#zone-options'); holder.replaceChildren();
    $('#zone-legend').textContent = 'Zonas · ' + currentSize;
    zones[currentSize].forEach(zone => {
      const label = document.createElement('label'); label.className = 'zone';
      const input = document.createElement('input'); input.type = 'checkbox'; input.value = zone;
      input.checked = selected.has(zone);
      const text = document.createElement('span'); text.textContent = zone;
      label.append(input, text); holder.append(label);
      input.addEventListener('change', () => {
        const removed = [];
        if (input.checked) {
          for (const prior of selected) if (overlaps(zone, prior)) { selected.delete(prior); removed.push(prior); }
          selected.add(zone);
        } else selected.delete(zone);
        updateSelected();
        say(removed.length ? `Seleccionaste ${zone}. Quitamos ${removed.join(', ')} para evitar zonas superpuestas.` : `${selected.size} zonas seleccionadas.`);
      });
    });
  }
  $$('[data-size]').forEach(button => button.addEventListener('click', () => {
    currentSize = button.dataset.size;
    $$('[data-size]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    renderZones();
  }));
  $('#clear-zones').addEventListener('click', () => {
    selected.clear(); renderZones(); updateSelected();
    $('[data-size][aria-pressed="true"]').focus(); say('Selección borrada.');
  });
  function choose(value) {
    service.value = value; updateBookingSummary();
    $('#cita').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    $('#name').focus({preventScroll:true});
    say(value + ' seleccionado. Completá tu solicitud de cita.');
  }
  $$('[data-service]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); choose(link.dataset.service); }));
  $$('[data-combo]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); choose('Combo ' + link.dataset.combo); }));
  $('#request-package').addEventListener('click', () => { if (selected.size) choose(customService); });
  service.addEventListener('change', updateBookingSummary);
  renderZones(); updateSelected();

  // Fechas en la zona horaria de la clínica, independientemente del país del visitante.
  const date = $('#date');
  const dateError = $('#date-error');
  function today() {
    const parts = new Intl.DateTimeFormat('en', { timeZone:'America/Asuncion', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
    const part = name => parts.find(p => p.type === name).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
  function readDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const d = new Date(value + 'T12:00:00Z');
    return Number.isNaN(d.getTime()) || d.toISOString().slice(0,10) !== value ? null : d;
  }
  function validateDate() {
    date.min = today(); date.setCustomValidity(''); dateError.textContent = '';
    const d = readDate(date.value);
    let error = '';
    if (date.value && !d) error = 'Elegí una fecha válida.';
    else if (d && date.value < today()) error = 'Elegí hoy o una fecha futura.';
    else if (d && d.getUTCDay() === 0) error = 'Los domingos no atendemos. Elegí un día de lunes a sábado.';
    date.setCustomValidity(error); dateError.textContent = error;
    const saturday = d?.getUTCDay() === 6;
    $('#afternoon').hidden = !!saturday;
    $('#anytime').hidden = !!saturday;
    const first = $('.time-options label');
    const morning = first.querySelector('input');
    // Sábado tiene una única franja: no se ofrecen horarios fuera de 8–14.
    first.lastChild.textContent = saturday ? ' Sábado · 8:00 a 14:00' : ' Mañana';
    morning.value = saturday ? 'Sábado, de 8:00 a 14:00' : 'Mañana';
    $$('#afternoon input, #anytime input').forEach(input => { input.disabled = !!saturday; });
    if (saturday) morning.checked = true;
    $('#date-help').textContent = saturday ? 'Sábados: atención de 8:00 a 14:00. Horario exacto a confirmar.' : 'Atendemos de lunes a sábado. Elegí la fecha que te resulte cómoda.';
    return !error;
  }
  date.min = today();
  date.addEventListener('change', validateDate);
  date.addEventListener('focus', () => { date.min = today(); });
  const formatDate = value => new Intl.DateTimeFormat('es-PY', {timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}).format(readDate(value));
  function code() {
    if (window.crypto?.getRandomValues) {
      const values = new Uint16Array(1);
      do { window.crypto.getRandomValues(values); } while (values[0] >= 64800);
      return String(100 + values[0] % 900);
    }
    return String(100 + Math.floor(Math.random() * 900));
  }
  // El código es una referencia de origen web. Puede repetirse; no valida descuentos.
  const waURL = text => `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;
  $$('[data-whatsapp]').forEach(link => {
    const update = () => { link.href = waURL('Buenas, quisiera consultar por un tratamiento en Gódula. Código web: ' + code() + '.'); };
    update(); link.addEventListener('click', update); link.addEventListener('auxclick', update);
  });
  $('#booking-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = $('#name'); name.value = name.value.trim();
    if (!validateDate() || !event.currentTarget.reportValidity()) { date.reportValidity(); return; }
    if (service.value === customService && !selected.size) { say('Elegí las zonas de tu paquete primero.'); return; }
    const time = $('input[name="franja"]:checked')?.value;
    if (!time) return;
    const messages = [`Buenas, soy ${name.value}. Quisiera solicitar una cita desde la página web de Gódula.`, `Servicio: ${service.value}.`];
    if (service.value === customService) messages.push('Zonas: ' + [...selected].join(' + ') + '.');
    else if (service.value.startsWith('Combo ')) messages.push(combos[service.value.slice(6)]);
    messages.push(`Fecha preferida: ${formatDate(date.value)}.`, `Franja preferida: ${time}.`, `Código web: ${code()}.`, '¿Me confirman disponibilidad, horario y cotización?');
    window.location.assign(waURL(messages.join('\n')));
  });

  // Menú móvil.
  const menu = $('#menu'); const toggle = $('.menu-toggle');
  const closeMenu = () => { menu.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); toggle.setAttribute('aria-label','Abrir menú'); toggle.textContent = '☰'; };
  toggle.addEventListener('click', () => {
    const open = !menu.classList.contains('open'); menu.classList.toggle('open',open);
    toggle.setAttribute('aria-expanded',String(open)); toggle.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú'); toggle.textContent = open ? '×' : '☰';
  });
  menu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('click', event => { if (!menu.contains(event.target) && !toggle.contains(event.target)) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.classList.contains('open')) {closeMenu();toggle.focus();} });
  window.matchMedia('(max-width:700px)').addEventListener('change',closeMenu);
  $('#year').textContent = String(new Date().getFullYear());

  // Ambiente musical original sintetizado, opcional, sin reproducción automática.
  const sound = $('#sound'); const soundLabel = $('#sound-label');
  let audio = null, gain = null, timer = null, nextNote = 0, beat = 0, starting = false;
  const chords = [[48,55,59,64],[45,52,55,60],[41,48,52,57],[43,50,55,57]];
  const pattern = [0,2,1,3,2,1,3,2];
  const voices = new Set();
  const soundUI = active => { sound.setAttribute('aria-pressed',String(active)); sound.setAttribute('aria-label',active?'Pausar música ambiente':'Activar música ambiente'); soundLabel.textContent = active?'Pausar calma':'Activar calma'; };
  function stopSound() {
    clearInterval(timer); timer = null;
    if (audio) {
      const old = audio; gain.gain.setTargetAtTime(0,old.currentTime,.08);
      voices.forEach(voice => {try {voice.stop(old.currentTime+.3);} catch {}});
      setTimeout(() => { old.close().catch(()=>{}); },350);
      audio = null; gain = null;
    }
    soundUI(false);
  }
  function note(midi, when, duration, volume) {
    const oscillator = audio.createOscillator(), envelope = audio.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = 440 * 2 ** ((midi-69)/12);
    envelope.gain.setValueAtTime(0,when); envelope.gain.linearRampToValueAtTime(volume,when+.08); envelope.gain.exponentialRampToValueAtTime(.0001,when+duration);
    oscillator.connect(envelope); envelope.connect(gain); voices.add(oscillator);
    oscillator.onended = () => {voices.delete(oscillator);oscillator.disconnect();envelope.disconnect();};
    oscillator.start(when); oscillator.stop(when+duration+.05);
  }
  function schedule() {
    if (!audio || audio.state !== 'running') return;
    if (nextNote < audio.currentTime-.2) nextNote = audio.currentTime+.05;
    while (nextNote < audio.currentTime+.35) {
      const chord = chords[Math.floor(beat/8)%4]; note(chord[pattern[beat%8]]+12,nextNote,3.8,.12);
      if (beat%8===0) chord.forEach(midi => note(midi,nextNote,8.5,.04));
      nextNote += 1.15; beat++;
    }
  }
  sound.addEventListener('click', async () => {
    if (starting) return;
    if (audio) {stopSound();return;}
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) {say('Tu navegador no admite este ambiente sonoro.');return;}
    starting = true;
    try {
      audio = new Audio(); gain = audio.createGain(); gain.gain.value = 0; gain.connect(audio.destination);
      await audio.resume();
      if (!audio || document.hidden || audio.state !== 'running') {stopSound();return;}
      gain.gain.linearRampToValueAtTime(.24,audio.currentTime+1.5); beat = 0; nextNote = audio.currentTime+.1;
      schedule(); timer = setInterval(schedule,150); soundUI(true);
    } catch {stopSound();say('No pudimos activar el sonido. Podés volver a intentarlo.');}
    finally {starting = false;}
  });
  document.addEventListener('visibilitychange', () => {if (document.hidden) stopSound();});
  window.addEventListener('pagehide',stopSound);
})();
