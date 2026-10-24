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
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});
window.matchMedia('(max-width: 720px)').addEventListener('change', closeMenu);

// Перевірка відбувається локально. Запитів до сервера та збереження даних немає.
const form = document.querySelector('#appointment-form');
const nameInput = document.querySelector('#name');
const phoneInput = document.querySelector('#phone');
const message = document.querySelector('#form-message');
function setError(input, text) {
  input.setAttribute('aria-invalid', String(Boolean(text)));
  document.querySelector(`#${input.id}-error`).textContent = text;
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  message.textContent = '';
  const nameError = nameInput.value.trim() ? '' : 'Введіть ім’я (можна вигадане).';
  const phone = phoneInput.value.trim();
  const digitCount = phone.replace(/\D/g, '').length;
  const phoneError = !phone ? 'Введіть демонстраційний телефон.' :
    (!/^\+?[\d\s()\-]+$/.test(phone) || digitCount < 10 || digitCount > 15)
      ? 'Введіть від 10 до 15 цифр. Можна використати пробіли, +, дужки та дефіси.' : '';
  setError(nameInput, nameError);
  setError(phoneInput, phoneError);
  if (nameError || phoneError) {
    message.textContent = 'Це демонстрація. Заявку не надіслано. Перевірте позначені поля.';
    (nameError ? nameInput : phoneInput).focus();
    return;
  }
  message.textContent = 'Це демонстрація. Поля заповнено коректно, але заявку не надіслано. Дані не збережено, запис на прийом не створено.';
  form.reset();
});
[nameInput, phoneInput].forEach((input) => {
  input.addEventListener('input', () => {
    setError(input, '');
    message.textContent = '';
  });
});
