'use strict';

// Розкривне меню вмикається лише за наявності JavaScript.
document.documentElement.classList.add('js');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
menuButton.hidden = false;
function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('is-open', open);
});
navigation.addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (link) {
    closeMenu();
    const href = link.getAttribute('href');
    const target = href.startsWith('#') ? document.querySelector(href) : null;
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.header')) closeMenu();
});
window.matchMedia('(max-width: 950px)').addEventListener('change', closeMenu);

// Заявка надсилається лише після перевірки полів та згоди.
if (document.querySelector("#appointment-form")) {
const form = document.querySelector('#appointment-form');
const nameInput = document.querySelector('#name');
const phoneInput = document.querySelector('#phone');
const consentInput = document.querySelector('#consent');
const message = document.querySelector('#form-message');
const submitButton = form.querySelector('button[type="submit"]');
let submitting = false;
function setError(input, text) {
  input.setAttribute('aria-invalid', String(Boolean(text)));
  document.querySelector(`#${input.id}-error`).textContent = text;
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitting) return;
  message.textContent = '';
  const name = nameInput.value.trim();
  const nameError = name.length >= 2 && /\p{L}/u.test(name) ? '' : 'Введіть ім’я: щонайменше 2 символи, з літерами.';
  const phone = phoneInput.value.trim();
  const digitCount = phone.replace(/\D/g, '').length;
  const phoneError = !phone ? 'Введіть номер телефону.' :
    (!/^\+?[\d\s()\-]+$/.test(phone) || digitCount < 10 || digitCount > 15)
      ? 'Введіть від 10 до 15 цифр. Дозволено + на початку, пробіли, дужки та дефіси.' : '';
  const consentError = consentInput.checked ? '' : 'Потрібна згода на обробку та передавання даних.';
  const fields = [[nameInput, nameError], [phoneInput, phoneError], [consentInput, consentError]];
  fields.forEach(([input, error]) => setError(input, error));
  const invalid = fields.find(([, error]) => error);
  if (invalid) {
    message.textContent = 'Перевірте позначені поля. Заявку не надіслано.';
    invalid[0].focus();
    return;
  }
  submitting = true;
  submitButton.disabled = true;
  form.setAttribute('aria-busy', 'true');
  message.textContent = 'Надсилаємо заявку…';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const data = new FormData(form);
  data.set('name', name);
  data.set('phone', phone);
  try {
    const response = await fetch(form.action, {
      method: 'POST',
      body: data,
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error('Submission rejected');
    message.textContent = 'Дякуємо! Вашу заявку надіслано';
    form.reset();
  } catch (error) {
    message.textContent = error.name === 'AbortError'
      ? 'Час очікування вичерпано. Не вдалося підтвердити надсилання. Перевірте з’єднання та спробуйте пізніше.'
      : 'Не вдалося надіслати заявку. Перевірте з’єднання та спробуйте ще раз пізніше.';
  } finally {
    clearTimeout(timeout);
    submitting = false;
    submitButton.disabled = false;
    form.removeAttribute('aria-busy');
  }
});
[nameInput, phoneInput, consentInput].forEach((input) => {
  input.addEventListener('input', () => {
    setError(input, '');
    if (!submitting) message.textContent = '';
  });
});
}

// Indicate the current section, including procedure and profile pages.
const currentPage = location.pathname.split('/').pop() || 'index.html';
const parentPages = {
  'caries.html': 'services.html', 'hygiene.html': 'services.html',
  'whitening.html': 'services.html', 'orthodontics.html': 'services.html',
  'doctor-profile.html': 'doctors.html'
};
navigation.querySelectorAll('a').forEach((link) => {
  const page = link.getAttribute('href');
  if (page === currentPage) link.setAttribute('aria-current', 'page');
  else if (page === parentPages[currentPage]) link.setAttribute('aria-current', 'location');
});

// A direct FAQ link opens its answer as well as scrolling to it.
function openLinkedAnswer() {
  const id = location.hash.slice(1);
  const target = id ? document.getElementById(id) : null;
  if (target && target.matches('.faq-list details')) target.open = true;
}
window.addEventListener('hashchange', openLinkedAnswer);
openLinkedAnswer();
