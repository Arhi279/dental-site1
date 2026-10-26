'use strict';
(() => {
  const button = document.getElementById('load-contact-map');
  if (!button) return;
  // Replace only with the real client's verified details; see docs/contacts-redesign.md.
  const config = {
    embedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d325518.68780316407!2d30.252511957059642!3d50.4016990487754!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40d4cf4ee15a4505%3A0x764931d2170146fe!2z0JrQuNGX0LIsIDAyMDAw!5e0!3m2!1suk!2sua!4v1597954359783!5m2!1suk!2sua",
    address: '',
    placeUrl: 'https://www.google.com/maps/@50.4501,30.5234,11z?hl=uk',
    directionsUrl: '',
    telegramUrl: '',
    viberUrl: ''
  };
  const container = document.getElementById('contact-map-frame');
  const cover = document.getElementById('contact-map-cover');
  const status = document.getElementById('contact-map-status');
  const openLink = document.getElementById('open-contact-map');
  let frame = null;
  let timer = null;
  button.hidden = false;
  openLink.href = config.placeUrl;
  if (config.address) {
    document.getElementById('clinic-address').textContent = config.address;
    document.getElementById('map-example-note').textContent = config.address;
    if (config.directionsUrl) {
      const route = document.getElementById('contact-directions');
      route.href = config.directionsUrl;
      route.hidden = false;
    }
  }
  for (const [id, href, protocol] of [
    ['contact-telegram', config.telegramUrl, 'https:'],
    ['contact-viber', config.viberUrl, 'viber:']
  ]) {
    if (!href) continue;
    try {
      const url = new URL(href);
      if (url.protocol !== protocol || (id === 'contact-telegram' && url.hostname !== 't.me')) continue;
      const old = document.getElementById(id);
      const link = document.createElement('a');
      link.className = old.className;
      link.id = id;
      link.href = url.href;
      link.innerHTML = old.innerHTML;
      old.replaceWith(link);
    } catch (_) { /* Leave unconfigured contact methods inactive. */ }
  }
  button.addEventListener('click', () => {
    if (button.disabled) return;
    clearTimeout(timer);
    frame?.remove();
    button.disabled = true;
    container.setAttribute('aria-busy', 'true');
    status.textContent = 'Завантажуємо Google Maps…';
    cover.hidden = true;
    frame = document.createElement('iframe');
    frame.title = config.address ? 'Google Maps: ' + config.address : 'Google Maps: огляд міста Києва, без позначення клініки';
    frame.width = '960';
    frame.height = '420';
    frame.loading = 'lazy';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allowFullscreen = true;
    const currentFrame = frame;
    const fallback = () => {
      if (frame !== currentFrame) return;
      clearTimeout(timer);
      currentFrame.remove();
      frame = null;
      cover.hidden = false;
      button.disabled = false;
      button.textContent = 'Спробувати ще раз';
      container.setAttribute('aria-busy', 'false');
      status.textContent = 'Карта не відповідає. Спробуйте ще раз або відкрийте Google Maps за посиланням нижче.';
    };
    frame.addEventListener('load', () => {
      if (frame !== currentFrame) return;
      clearTimeout(timer);
      container.setAttribute('aria-busy', 'false');
      status.textContent = '';
    }, { once: true });
    frame.addEventListener('error', fallback, { once: true });
    timer = setTimeout(fallback, 15000);
    frame.src = config.embedUrl;
    container.append(frame);
  });
})();

